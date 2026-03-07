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
}


// ============================================================
// 厚労省公式 57項目 男性用 換算マッピング（純粋な合計値 -> 評価点1〜5）
// ============================================================
const DIRECT_EVAL_MAP: Record<string, (sum: number) => number> = {
  // === A領域 (原因) ===
  '心理的な仕事の負担（量）': (s) => s<=3 ? 1 : s===4 ? 2 : s<=6 ? 3 : s<=8 ? 4 : 5,
  '心理的な仕事の負担（質）': (s) => s<=3 ? 1 : s===4 ? 2 : s<=6 ? 3 : s<=8 ? 4 : 5,
  '自覚的な身体的負担度': (s) => s===1 ? 1 : s===2 ? 2 : s===3 ? 3 : 5,
  '仕事のコントロール度': (s) => s<=5 ? 5 : s<=7 ? 4 : s<=9 ? 3 : s<=11 ? 2 : 1,
  '技能の活用度': (s) => s===1 ? 1 : s===2 ? 2 : s===3 ? 3 : 5,
  '職場の対人関係でのストレス': (s) => s<=5 ? 1 : s<=7 ? 2 : s<=9 ? 3 : s<=11 ? 4 : 5,
  '職場環境によるストレス': (s) => s===1 ? 1 : s===2 ? 2 : s===3 ? 3 : 5,
  '仕事の適性度': (s) => s===1 ? 5 : s===2 ? 3 : s===3 ? 2 : 1,
  '働きがい': (s) => s===1 ? 5 : s===2 ? 3 : s===3 ? 2 : 1,

  // === B領域 (心身の反応) ===
  '活気': (s) => s<=4 ? 1 : s<=6 ? 2 : s<=8 ? 3 : s<=10 ? 4 : 5,
  'イライラ感': (s) => s<=4 ? 5 : s===5 ? 4 : s<=7 ? 3 : s<=9 ? 2 : 1,
  '疲労感': (s) => s<=4 ? 5 : s<=6 ? 4 : s<=8 ? 3 : s<=10 ? 2 : 1,
  '不安感': (s) => s<=4 ? 5 : s<=6 ? 4 : s===7 ? 3 : s<=9 ? 2 : 1,
  '抑うつ感': (s) => s===6 ? 5 : s<=8 ? 4 : s<=12 ? 3 : s<=16 ? 2 : 1,
  '身体愁訴': (s) => s===11 ? 5 : s<=15 ? 4 : s<=21 ? 3 : s<=26 ? 2 : 1,

  // === C領域 (サポート) ===
  '上司からのサポート': (s) => s<=4 ? 5 : s<=6 ? 4 : s<=8 ? 3 : s<=10 ? 2 : 1,
  '同僚からのサポート': (s) => s<=5 ? 5 : s<=7 ? 4 : s<=9 ? 3 : s<=11 ? 2 : 1,
  '家族・友人からのサポート': (s) => s<=6 ? 5 : s<=8 ? 4 : s===9 ? 3 : s<=11 ? 2 : 1,

  // === D領域 (満足度) ===
  '仕事や生活の満足度': (s) => s<=3 ? 5 : s===4 ? 4 : s<=6 ? 3 : s===7 ? 2 : 1,
};

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

  // 回答データを質問情報とJOINして取得（scale_name, question_no も含む）
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

  // デバッグ: JOINクエリの結果をログ出力
  console.log('[StressCheck] JOIN query result:', {
    respError: respError ? JSON.stringify(respError) : null,
    responsesCount: responses?.length ?? 'null',
    periodId,
    employeeId,
  });

  // JOINが失敗した場合のフォールバック: 回答と質問を別々に取得してマージ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mergedResponses: any[] = [];

  if (respError || !responses || responses.length === 0) {
    console.warn('[StressCheck] JOIN query returned no data, trying fallback...');

    // Step 1: 回答データだけ取得
    const { data: rawResponses, error: rawError } = await db
      .from('stress_check_responses')
      .select('answer, answered_at, question_id')
      .eq('period_id', periodId)
      .eq('employee_id', employeeId);

    console.log('[StressCheck] Fallback raw responses:', {
      error: rawError ? JSON.stringify(rawError) : null,
      count: rawResponses?.length ?? 'null',
    });

    if (rawError || !rawResponses || rawResponses.length === 0) {
      console.error('[StressCheck] No response data found at all');
      return null;
    }

    // Step 2: 質問マスタを全件取得
    const { data: allQuestions } = await db
      .from('stress_check_questions')
      .select('id, category, question_no, question_text, is_reverse, score_weights, scale_name');

    if (!allQuestions || allQuestions.length === 0) {
      console.error('[StressCheck] No questions found in master table');
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionMap = new Map(allQuestions.map((q: any) => [q.id, q]));

    // Step 3: マージ
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mergedResponses = rawResponses.map((r: any) => ({
      ...r,
      stress_check_questions: questionMap.get(r.question_id) || null,
    }));

    console.log('[StressCheck] Fallback merged responses count:', mergedResponses.length);
  } else {
    mergedResponses = responses;
  }

  if (mergedResponses.length === 0) {
    console.error('[StressCheck] No merged responses available');
    return null;
  }

  // ----- カテゴリ別集計 -----
  const categoryAgg: Record<string, { total: number; max: number; count: number }> = {};
  // ----- 尺度別: 回答値の合計 -----
  const scaleAgg: Record<string, { sumAnswers: number; count: number; category: string }> = {};

  // --- 純粋な加算ループ ---
  for (const resp of mergedResponses) {
    const question = resp.stress_check_questions;
    if (!question) continue;

    const cat = question.category as string;
    const scaleName = question.scale_name as string;

    let val = resp.answer;
    const qText = question.question_text || '';
    // 厚労省公式：職場の対人関係（A14）の反転処理
    // DBのテキスト揺れ（親しみやすい / 友好的）を確実に捕捉して 5 - val を適用する
    if (scaleName === '職場の対人関係でのストレス' && (qText.includes('親しみ') || qText.includes('友好的'))) {
      val = 5 - val;
    }

    if (!categoryAgg[cat]) categoryAgg[cat] = { total: 0, max: 0, count: 0 };
    categoryAgg[cat].total += val;
    categoryAgg[cat].max += 4;
    categoryAgg[cat].count += 1;

    if (!scaleAgg[scaleName]) scaleAgg[scaleName] = { sumAnswers: 0, count: 0, category: cat };
    scaleAgg[scaleName].sumAnswers += val;
    scaleAgg[scaleName].count += 1;
  }

  // CategoryScore 配列
  const categoryOrder: CategoryCode[] = ['A', 'B', 'C', 'D'];
  const scores: CategoryScore[] = categoryOrder
    .filter((cat) => categoryAgg[cat])
    .map((cat) => {
      const s = categoryAgg[cat];
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        score: s.total,
        maxScore: s.max,
        questionCount: s.count,
        percentage: Math.round((s.total / s.max) * 100),
      };
    });

  // --- 評価点の直接算出 ---
  const scaleScores: ScaleScore[] = Object.entries(scaleAgg).map(
    ([scaleName, agg]) => {
      // 引き算（offset）は一切せず、純粋な合計値をそのまま渡す
      const rawScore = agg.sumAnswers;

      // マッピング関数で直接1〜5点へ変換
      const evalFunc = DIRECT_EVAL_MAP[scaleName];
      const evalPoint = evalFunc ? evalFunc(rawScore) : 3;

      return {
        scaleName,
        rawScore,
        evalPoint,
        questionCount: agg.count,
        sumAnswers: agg.sumAnswers,
        category: agg.category,
      };
    }
  );

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const totalMaxScore = scores.reduce((sum, s) => sum + s.maxScore, 0);

  // === 高ストレス判定（マニュアル P42 素点合計方式） ===
  // 条件①: B領域29項目合計 ≥ 77
  // 条件②: A+C領域合計 ≥ 76 かつ B領域合計 ≥ 63
  const scoreA = categoryAgg['A']?.total ?? 0;
  const scoreB = categoryAgg['B']?.total ?? 0;
  const scoreC = categoryAgg['C']?.total ?? 0;
  const isHighStress = scoreB >= 77 || ((scoreA + scoreC) >= 76 && scoreB >= 63);

  const answeredAt = mergedResponses[0]?.answered_at || null;

  // 同意状態を submissions テーブルから取得
  const { data: submission } = await db
    .from('stress_check_submissions')
    .select('consent_to_employer')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .single();

  const consentToEmployer = submission?.consent_to_employer ?? false;

  return {
    periodTitle: period.title,
    periodId: period.id,
    scores,
    scaleScores,
    totalScore,
    totalMaxScore,
    totalPercentage: Math.round((totalScore / totalMaxScore) * 100),
    isHighStress,
    answeredAt,
    consentToEmployer,
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
