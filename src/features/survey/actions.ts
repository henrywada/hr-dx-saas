'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import { revalidatePath } from 'next/cache';
import { APP_ROUTES } from '@/config/routes';
import { PULSE_SURVEY_SCORE_MAX, PULSE_SURVEY_SCORE_MIN } from '@/features/survey/constants';

/** Echo パルス回答画面・送信ペイロード用（本番指定アンケートの設問） */
export type EchoPulseSurveyOption = {
  /** 保存時は 1..n を score として pulse_survey_responses に入れる（DB の score は 1〜10） */
  score: number;
  text: string;
};

export type EchoPulseSurveyQuestion = {
  /** 回答キー: rating は行ごとに questionnaire_question_items.id、radio は questionnaire_questions.id */
  id: string;
  category: string;
  /** 設問文（評価表の親見出し） */
  headline: string;
  /** 評価表の行ラベル（単一設問のときは未使用） */
  detail?: string | null;
  type: 'rating' | 'radio';
  options?: EchoPulseSurveyOption[];
};

export type SubmitSurveyInput = {
  answers: { question_id: string; score: number }[];
  freeComment?: string;
  mockQuestionsData?: {
    id: string;
    category: string;
    text: string;
    /** pulse_survey_questions.answer_type 用 */
    pulseAnswerType?: 'rating' | 'single_choice';
  }[];
  /** パルス調査用。指定時は pulse_survey_responses に保存（トップの未回答判定に連動） */
  surveyPeriod?: string;
};

/**
 * ログインユーザーのテナントで「本番稼働中」の Echo 設問セットから、パルス回答用の設問一覧を取得する。
 */
export async function getEchoPulseSurveyQuestionsAction(): Promise<{
  success: boolean;
  questions?: EchoPulseSurveyQuestion[];
  /** 本番指定中の設問セット名（トップ表示などと揃える） */
  questionnaireTitle?: string | null;
  error?: string;
  code?: 'no_active_questionnaire';
}> {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    return { success: false, error: '認証エラー：ユーザーまたはテナント情報が取得できません。' };
  }

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: active, error: actErr } = await db
    .from('questionnaires')
    .select('id, title')
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .eq('status', 'active')
    .maybeSingle();

  if (actErr) {
    return { success: false, error: actErr.message };
  }
  if (!active) {
    return { success: true, questions: [], questionnaireTitle: null, code: 'no_active_questionnaire' };
  }

  const questionnaireTitle = (active.title as string) ?? null;

  const { data: sections, error: secErr } = await db
    .from('questionnaire_sections')
    .select('id, title, sort_order')
    .eq('questionnaire_id', active.id)
    .order('sort_order', { ascending: true });

  if (secErr) {
    return { success: false, error: secErr.message };
  }

  const { data: questions, error: qErr } = await db
    .from('questionnaire_questions')
    .select('id, question_text, question_type, sort_order, section_id')
    .eq('questionnaire_id', active.id)
    .order('sort_order', { ascending: true });

  if (qErr) {
    return { success: false, error: qErr.message };
  }

  const questionRows = (questions ?? []) as Array<{
    id: string;
    question_text: string;
    question_type: string;
    sort_order: number;
    section_id: string | null;
  }>;

  const questionIds = questionRows.map(q => q.id);
  let items: Array<{ id: string; question_id: string; item_text: string; sort_order: number }> = [];
  let options: Array<{ id: string; question_id: string; option_text: string; sort_order: number }> = [];

  if (questionIds.length > 0) {
    const { data: itemRows } = await db
      .from('questionnaire_question_items')
      .select('id, question_id, item_text, sort_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });
    items = itemRows ?? [];

    const { data: optRows } = await db
      .from('questionnaire_question_options')
      .select('id, question_id, option_text, sort_order')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });
    options = optRows ?? [];
  }

  const sectionTitleById = new Map<string, string>(
    (sections ?? []).map((s: { id: string; title: string }) => [s.id, s.title])
  );

  const defaultCategory = 'アンケート';

  const rows: EchoPulseSurveyQuestion[] = [];

  for (const q of questionRows) {
    const category = q.section_id
      ? (sectionTitleById.get(q.section_id) ?? defaultCategory)
      : defaultCategory;

    if (q.question_type === 'rating_table') {
      const qItems = items.filter(i => i.question_id === q.id);
      if (qItems.length === 0) {
        rows.push({
          id: q.id,
          category,
          headline: q.question_text,
          type: 'rating',
        });
      } else {
        for (const it of qItems) {
          rows.push({
            id: it.id,
            category,
            headline: q.question_text,
            detail: it.item_text,
            type: 'rating',
          });
        }
      }
    } else if (q.question_type === 'radio') {
      const qOpts = options.filter(o => o.question_id === q.id);
      if (qOpts.length === 0) continue;
      if (qOpts.length > PULSE_SURVEY_SCORE_MAX) {
        continue;
      }
      rows.push({
        id: q.id,
        category,
        headline: q.question_text,
        type: 'radio',
        options: qOpts.map((o, idx) => ({
          score: idx + 1,
          text: o.option_text,
        })),
      });
    }
  }

  return { success: true, questions: rows, questionnaireTitle };
}

export async function submitSurvey(data: SubmitSurveyInput) {
  try {
    const user = await getServerUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証エラー：ユーザーまたはテナント情報が取得できません。' };
    }

    const supabase = await createClient();
    const isPulseSurvey = !!data.surveyPeriod;

    if (data.mockQuestionsData && data.mockQuestionsData.length > 0) {
      if (isPulseSurvey) {
        // パルス調査: 設問マスタを Echo 本番設問の ID に同期（FK 用）。初回のみ insert から upsert に変更。
        const now = new Date().toISOString();
        const upsertRows = data.mockQuestionsData.map((q, i) => ({
          id: q.id,
          tenant_id: user.tenant_id,
          category: q.category,
          question_text: q.text,
          answer_type: q.pulseAnswerType === 'single_choice' ? 'single_choice' : 'rating',
          sort_order: i,
          is_active: true,
          updated_at: now,
        }));
        const { error: upsertErr } = await supabase
          .from('pulse_survey_questions')
          .upsert(upsertRows, { onConflict: 'id' });
        if (upsertErr) {
          console.error('Upsert pulse_survey_questions error:', upsertErr);
          return { success: false, error: '設問マスタの同期に失敗しました。' };
        }
      } else {
        // 従来: survey_questions にシード
        const { data: existingQA } = await supabase
          .from('survey_questions')
          .select('id')
          .eq('tenant_id', user.tenant_id)
          .limit(1);

        if (!existingQA || existingQA.length === 0) {
          const seedData = data.mockQuestionsData.map((q) => ({
            id: q.id,
            tenant_id: user.tenant_id,
            category: q.category,
            content: q.text,
            is_active: true,
          }));
          await supabase.from('survey_questions').insert(seedData);
        }
      }
    }

    if (isPulseSurvey && data.surveyPeriod) {
      for (const ans of data.answers) {
        if (
          !Number.isInteger(ans.score) ||
          ans.score < PULSE_SURVEY_SCORE_MIN ||
          ans.score > PULSE_SURVEY_SCORE_MAX
        ) {
          return {
            success: false,
            error: `回答スコアが不正です（${PULSE_SURVEY_SCORE_MIN}〜${PULSE_SURVEY_SCORE_MAX}）。`,
          };
        }
      }

      // pulse_survey_responses に保存（トップの重要タスク「未回答」判定に連動）
      const records = data.answers.map((ans, index) => ({
        tenant_id: user.tenant_id,
        user_id: user.id,
        question_id: ans.question_id,
        survey_period: data.surveyPeriod!,
        score: ans.score,
        comment: index === data.answers.length - 1 ? data.freeComment ?? null : null,
      }));

      const { error } = await supabase.from('pulse_survey_responses').insert(records);

      if (error) {
        console.error('Submit pulse survey error:', error);
        return { success: false, error: 'データベースへの保存に失敗しました。' };
      }
      revalidatePath(APP_ROUTES.TENANT.PORTAL);
      return { success: true };
    }

    // 従来: survey_responses に保存
    const records = data.answers.map((ans, index) => ({
      tenant_id: user.tenant_id,
      user_id: user.id,
      question_id: ans.question_id,
      score: ans.score,
      comment: index === data.answers.length - 1 ? data.freeComment : null,
    }));

    const { error } = await supabase.from('survey_responses').insert(records);

    if (error) {
      console.error('Submit survey error:', error);
      return { success: false, error: 'データベースへの保存に失敗しました。' };
    }

    return { success: true };
  } catch (error) {
    console.error('Submit survey Exception:', error);
    return { success: false, error: '予期せぬエラーが発生しました。' };
  }
}
