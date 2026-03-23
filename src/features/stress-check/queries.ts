import { createClient } from '@/lib/supabase/server';
import type {
  StressCheckPeriod,
  StressCheckQuestion,
  StressCheckResponseOption,
  QuestionWithOptions,
  CategoryGroup,
  QuestionnaireType,
  CategoryCode,
} from './types';
import { CATEGORY_LABELS } from './types';
import { calculateScoresFromResponses } from './score-calculator';
import type { MergedResponse } from './score-calculator';

// --------------------------------------------------
// 結果データ用の型
// --------------------------------------------------
export interface CategoryScore {
  category: CategoryCode;
  label: string;
  score: number;
  maxScore: number;
  questionCount: number;
  percentage: number;
}

/** 尺度別スコア（scale_name 単位） */
export interface ScaleScore {
  scaleName: string;
  rawScore: number;       // 素点（公式計算済み）
  evalPoint: number;      // 5段階評価点（換算表により変換）
  questionCount: number;
  sumAnswers: number;     // 回答値合計（デバッグ用）
  category: string;       // 所属カテゴリ A/B/C/D
}

export interface StressCheckResultData {
  periodTitle: string;
  periodId: string;
  scores: CategoryScore[];
  scaleScores: ScaleScore[];    // 尺度別スコア（全量）
  totalScore: number;
  totalMaxScore: number;
  totalPercentage: number;
  isHighStress: boolean;
  answeredAt: string | null;
  consentToEmployer: boolean;   // 事業者への結果提供同意
  /** stress_check_results.id（面談希望用） */
  resultId?: string | null;
  /** 面談希望の申出済みフラグ */
  interviewRequested?: boolean;
  interviewRequestedAt?: string | null;
}

/**
 * 回答データを質問情報とマージして取得
 * getStressCheckResult と submitStressCheckAnswers で共通利用
 */
export async function getMergedResponses(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  periodId: string,
  employeeId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[] | null> {
  const { data: responses, error: respError } = await db
    .from('stress_check_responses')
    .select(`
      answer,
      answered_at,
      question_id,
      stress_check_questions (
        id,
        category,
        question_no,
        question_text,
        is_reverse,
        score_weights,
        scale_name
      )
    `)
    .eq('period_id', periodId)
    .eq('employee_id', employeeId);

  if (!respError && responses && responses.length > 0) {
    return responses;
  }

  // フォールバック: 回答と質問を別々に取得してマージ
  const { data: rawResponses, error: rawError } = await db
    .from('stress_check_responses')
    .select('answer, answered_at, question_id')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId);

  if (rawError || !rawResponses || rawResponses.length === 0) {
    return null;
  }

  const { data: allQuestions } = await db
    .from('stress_check_questions')
    .select('id, category, question_no, question_text, is_reverse, score_weights, scale_name');

  if (!allQuestions || allQuestions.length === 0) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionMap = new Map(allQuestions.map((q: any) => [q.id, q]));
  return rawResponses.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      ...r,
      stress_check_questions: questionMap.get(r.question_id) || null,
    })
  );
}

/**
 * 回答データからスコアを集計し、結果データを返す
 * 厚労省マニュアル準拠の素点計算 + 5段階換算
 */
export async function getStressCheckResult(
  periodId: string,
  authUserId: string
): Promise<StressCheckResultData | null> {
  const supabase = await createClient();

  // auth UUID → employees.id
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (!employee) return null;

  const employeeId = employee.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 実施期間情報を取得
  const { data: period } = await db
    .from('stress_check_periods')
    .select('*')
    .eq('id', periodId)
    .single();

  if (!period) return null;

  const mergedResponses = await getMergedResponses(db, periodId, employeeId);
  if (!mergedResponses || mergedResponses.length === 0) {
    console.error('[StressCheck] No merged responses available');
    return null;
  }

  const calculated = calculateScoresFromResponses(mergedResponses as MergedResponse[]);

  // scale_scores からカテゴリ別集計を再構築（CategoryScore 用）
  const categoryAgg: Record<string, { total: number; max: number; count: number }> = {};
  for (const scale of calculated.scale_scores) {
    const cat = scale.category;
    if (!categoryAgg[cat]) categoryAgg[cat] = { total: 0, max: 0, count: 0 };
    categoryAgg[cat].total += scale.sumAnswers;
    categoryAgg[cat].max += scale.questionCount * 4;
    categoryAgg[cat].count += scale.questionCount;
  }

  const categoryOrder: CategoryCode[] = ['A', 'B', 'C', 'D'];
  const scores: CategoryScore[] = categoryOrder
    .filter((cat) => categoryAgg[cat])
    .map((cat) => {
      const s = categoryAgg[cat];
      return {
        category: cat as CategoryCode,
        label: CATEGORY_LABELS[cat as CategoryCode],
        score: s.total,
        maxScore: s.max,
        questionCount: s.count,
        percentage: Math.round((s.total / s.max) * 100),
      };
    });

  const scaleScores: ScaleScore[] = calculated.scale_scores;
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const totalMaxScore = scores.reduce((sum, s) => sum + s.maxScore, 0);
  const answeredAt = mergedResponses[0]?.answered_at || null;

  // 同意状態を submissions テーブルから取得
  const { data: submission } = await db
    .from('stress_check_submissions')
    .select('consent_to_employer')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .single();

  const consentToEmployer = submission?.consent_to_employer ?? false;

  // stress_check_results から面談希望情報を取得（本人は sc_results_select_own で SELECT 可能）
  const { data: resultRow } = await db
    .from('stress_check_results')
    .select('id, interview_requested, interview_requested_at')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  return {
    periodTitle: period.title,
    periodId: period.id,
    scores,
    scaleScores,
    totalScore,
    totalMaxScore,
    totalPercentage: Math.round((totalScore / totalMaxScore) * 100),
    isHighStress: calculated.is_high_stress,
    answeredAt,
    consentToEmployer,
    resultId: resultRow?.id ?? null,
    interviewRequested: resultRow?.interview_requested ?? false,
    interviewRequestedAt: resultRow?.interview_requested_at ?? null,
  };
}

/**
 * 現在アクティブな実施期間を取得
 */
export async function getActivePeriod(): Promise<StressCheckPeriod | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('stress_check_periods')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getActivePeriod error:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return data as StressCheckPeriod;
}

/**
 * 質問一覧を取得し、カテゴリ（領域）ごとにグループ化
 */
export async function getQuestions(
  questionnaireType: QuestionnaireType
): Promise<CategoryGroup[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: questions, error: qError } = await (supabase as any)
    .from('stress_check_questions')
    .select('*')
    .eq('questionnaire_type', questionnaireType)
    .order('category', { ascending: true })
    .order('question_no', { ascending: true });

  if (qError || !questions || questions.length === 0) {
    console.error('getQuestions error:', qError?.message);
    return [];
  }

  // ============================================================
  // 厚労省マニュアル準拠: 選択肢の定義
  // ============================================================
  // 全領域: 1問目=1点、4問目=4点
  // SCALE_OFFSETS で必要な尺度のみオフセット計算を行う

  const MHLW_OPTIONS: Record<CategoryCode, StressCheckResponseOption[]> = {
    // A領域: そうだ(1)→まあそうだ(2)→ややちがう(3)→ちがう(4)
    A: [
      { id: 'a-opt-1', scale_type: 'A', score: 1, label: 'そうだ' },
      { id: 'a-opt-2', scale_type: 'A', score: 2, label: 'まあそうだ' },
      { id: 'a-opt-3', scale_type: 'A', score: 3, label: 'ややちがう' },
      { id: 'a-opt-4', scale_type: 'A', score: 4, label: 'ちがう' },
    ],
    // B領域: ほとんどなかった(1)→ときどきあった(2)→しばしばあった(3)→ほとんどいつもあった(4)
    B: [
      { id: 'b-opt-1', scale_type: 'B', score: 1, label: 'ほとんどなかった' },
      { id: 'b-opt-2', scale_type: 'B', score: 2, label: 'ときどきあった' },
      { id: 'b-opt-3', scale_type: 'B', score: 3, label: 'しばしばあった' },
      { id: 'b-opt-4', scale_type: 'B', score: 4, label: 'ほとんどいつもあった' },
    ],
    // C領域: 非常に(1)→かなり(2)→多少(3)→全くない(4)
    C: [
      { id: 'c-opt-1', scale_type: 'C', score: 1, label: '非常に' },
      { id: 'c-opt-2', scale_type: 'C', score: 2, label: 'かなり' },
      { id: 'c-opt-3', scale_type: 'C', score: 3, label: '多少' },
      { id: 'c-opt-4', scale_type: 'C', score: 4, label: '全くない' },
    ],
    // D領域: 満足(1)→まあ満足(2)→やや不満足(3)→不満足(4)
    D: [
      { id: 'd-opt-1', scale_type: 'D', score: 1, label: '満足' },
      { id: 'd-opt-2', scale_type: 'D', score: 2, label: 'まあ満足' },
      { id: 'd-opt-3', scale_type: 'D', score: 3, label: 'やや不満足' },
      { id: 'd-opt-4', scale_type: 'D', score: 4, label: '不満足' },
    ],
  };

  // 質問に厚労省準拠の選択肢を結合
  const questionsWithOptions: QuestionWithOptions[] = (
    questions as StressCheckQuestion[]
  ).map((q) => ({
    ...q,
    options: MHLW_OPTIONS[q.category as CategoryCode] || MHLW_OPTIONS['A'],
  }));

  // カテゴリ（領域）ごとにグループ化
  const categoryMap = new Map<string, CategoryGroup>();
  for (const q of questionsWithOptions) {
    if (!categoryMap.has(q.category)) {
      categoryMap.set(q.category, {
        category: q.category as CategoryCode,
        categoryLabel: CATEGORY_LABELS[q.category as CategoryCode] || q.category,
        questions: [],
      });
    }
    categoryMap.get(q.category)!.questions.push(q);
  }

  return Array.from(categoryMap.values());
}

/**
 * program_targets の is_eligible をチェックし、ストレスチェック受検可否を判定
 * @param periodId 実施期間ID（stress_check_periods.id）
 * @param authUserId auth.users の UUID（getServerUser().id）
 * @returns 対象外の場合は { eligible: false, exclusionReason? }、対象の場合は { eligible: true }
 *          program_targets にレコードが無い場合は後方互換のため { eligible: true }
 */
export async function checkStressCheckEligibility(
  periodId: string,
  authUserId: string
): Promise<{ eligible: boolean; exclusionReason?: string }> {
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (!employee) {
    return { eligible: false, exclusionReason: '従業員情報が見つかりません' };
  }

  const { data: target } = await (supabase as any)
    .from('program_targets')
    .select('is_eligible, exclusion_reason')
    .eq('program_type', 'stress_check')
    .eq('program_instance_id', periodId)
    .eq('employee_id', employee.id)
    .maybeSingle();

  // program_targets にレコードが無い場合は後方互換のため受検可
  if (!target) {
    return { eligible: true };
  }

  if (target.is_eligible) {
    return { eligible: true };
  }

  return {
    eligible: false,
    exclusionReason: target.exclusion_reason ?? '対象外に設定されています',
  };
}

/**
 * 回答済みチェック
 * @param periodId 実施期間ID
 * @param authUserId auth.users の UUID（getServerUser().id）
 */
export async function checkExistingResponse(
  periodId: string,
  authUserId: string
): Promise<boolean> {
  const supabase = await createClient();

  // auth UUID → employees.id を解決
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', authUserId)
    .single();

  if (!employee) {
    return false;
  }

  const employeeId = employee.id;

  // stress_check_submissions テーブルで提出済みチェック
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: subCount, error: subError } = await (supabase as any)
    .from('stress_check_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)
    .eq('employee_id', employeeId);

  if (subError) {
    console.error('checkExistingResponse submissions error:', subError.message);
  }

  if (subCount && subCount > 0) {
    return true;
  }

  // submissions に無い場合でも responses テーブルにデータがあれば回答済みとみなす
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: resCount, error: resError } = await (supabase as any)
    .from('stress_check_responses')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)
    .eq('employee_id', employeeId);

  if (resError) {
    console.error('checkExistingResponse responses error:', resError.message);
    return false;
  }

  return (resCount ?? 0) > 0;
}
