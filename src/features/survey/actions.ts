'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import { revalidatePath } from 'next/cache';
import { APP_ROUTES } from '@/config/routes';

export type SubmitSurveyInput = {
  answers: { question_id: string; score: number }[];
  freeComment?: string;
  mockQuestionsData?: { id: string; category: string; text: string }[];
  /** パルス調査用。指定時は pulse_survey_responses に保存（トップの未回答判定に連動） */
  surveyPeriod?: string;
};

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
        // パルス調査: pulse_survey_questions にシード
        const { data: existingPulse } = await supabase
          .from('pulse_survey_questions')
          .select('id')
          .eq('tenant_id', user.tenant_id)
          .limit(1);

        if (!existingPulse || existingPulse.length === 0) {
          const seedData = data.mockQuestionsData.map((q, i) => ({
            id: q.id,
            tenant_id: user.tenant_id,
            category: q.category,
            question_text: q.text,
            answer_type: 'rating',
            sort_order: i,
            is_active: true,
          }));
          await supabase.from('pulse_survey_questions').insert(seedData);
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
