/**
 * ストレスチェック採点ロジック（厚労省「ストレスチェック制度実施マニュアル」準拠）
 *
 * - 個人プロフィール: 素点換算表（P40）で尺度ごとに 5 段階評価（ストレスが高いほど 1）
 * - 高ストレス判定: 評価基準の例（その1）単純合計方式（P43）
 *     ㋐ 心身のストレス反応（29項目）の合計が 77 点以上
 *     ㋑ 仕事のストレス要因（17項目）＋周囲のサポート（9項目）の合計が 76 点以上
 *        かつ 心身のストレス反応の合計が 63 点以上
 *   ※ 合計点は「ストレスが高い方を 4 点、低い方を 1 点」として数える。満足度（D）は含めない。
 *
 * 回答値は調査票の選択肢番号（1〜4）。尺度定義は mhlw-scales.ts を参照。
 */

import {
  MHLW_57_SCALES,
  toEvalPoint,
  toStressPoint,
  type StressCategory,
  type StressGender,
} from './mhlw-scales'

/** 高ストレス判定の基準点（評価基準の例その1・57項目） */
export const HIGH_STRESS_CRITERIA = {
  /** ㋐ 心身のストレス反応の合計 */
  reactionOnly: 77,
  /** ㋑ 要因＋サポートの合計 */
  stressorAndSupport: 76,
  /** ㋑ のときの心身のストレス反応の合計 */
  reactionWithStressor: 63,
} as const

/** マージ済み回答の1件の型（question 情報付き） */
export interface MergedResponse {
  answer: number
  answered_at?: string | null
  question_id: string
  stress_check_questions: {
    id?: string
    category?: string
    question_no?: number
    question_text?: string | null
    is_reverse?: boolean
    score_weights?: unknown
    scale_name?: string | null
  } | null
}

/** 尺度ごとの採点結果 */
export interface CalculatedScaleScore {
  scaleName: string
  /** 素点換算表の「得点」（マニュアルの計算欄の値。判定図の入力にもなる） */
  rawScore: number
  /** 5 段階評価点（1=ストレスが高い 〜 5=ストレスが低い） */
  evalPoint: number
  questionCount: number
  /** 単純合計方式の点数（ストレスが高い方を 4 点）の尺度内合計 */
  sumAnswers: number
  category: StressCategory
}

/** 採点結果（stress_check_results 保存用） */
export interface CalculatedScores {
  /** 仕事のストレス要因（17項目）の単純合計 */
  score_a: number
  /** 心身のストレス反応（29項目）の単純合計 */
  score_b: number
  /** 周囲のサポート（9項目）の単純合計 */
  score_c: number
  /** 満足度（2項目）の単純合計（高ストレス判定には使わない） */
  score_d: number
  is_high_stress: boolean
  scale_scores: CalculatedScaleScore[]
}

const CATEGORIES: readonly StressCategory[] = ['A', 'B', 'C', 'D']

function isCategory(value: unknown): value is StressCategory {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

function isValidAnswer(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 4
}

/** 回答を「領域 → 設問番号 → 回答値」に整理する。範囲外の回答は捨てる */
function indexAnswers(responses: MergedResponse[]): Record<StressCategory, Map<number, number>> {
  const index: Record<StressCategory, Map<number, number>> = {
    A: new Map(),
    B: new Map(),
    C: new Map(),
    D: new Map(),
  }
  for (const resp of responses) {
    const q = resp.stress_check_questions
    if (!q || !isCategory(q.category) || typeof q.question_no !== 'number') continue
    if (!isValidAnswer(resp.answer)) continue
    index[q.category].set(q.question_no, resp.answer)
  }
  return index
}

/**
 * employees.sex を採点用の性別に変換する。
 * employees.sex は「男性」「女性」等の表記揺れがあるため、女性を表す値だけを 'female' にする。
 * 不明・未設定は 'male'（マニュアルは性別を区別しない場合に男性基準を使う運用）。
 */
export function toStressGender(sex: string | null | undefined): StressGender {
  const s = (sex ?? '').trim()
  return ['female', 'Female', '女', '女性', 'F', 'f'].includes(s) ? 'female' : 'male'
}

export function isHighStress(scoreA: number, scoreB: number, scoreC: number): boolean {
  const c = HIGH_STRESS_CRITERIA
  return (
    scoreB >= c.reactionOnly ||
    (scoreA + scoreC >= c.stressorAndSupport && scoreB >= c.reactionWithStressor)
  )
}

/**
 * マージ済み回答データから採点を計算
 * @param gender employees.sex から導出。未設定時は 'male'（マニュアルは性別不明時に男性基準を使う運用）
 */
export function calculateScoresFromResponses(
  mergedResponses: MergedResponse[],
  gender: StressGender = 'male'
): CalculatedScores {
  const answers = indexAnswers(mergedResponses)

  // 単純合計（領域ごと）
  const totals: Record<StressCategory, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const category of CATEGORIES) {
    for (const [no, answer] of answers[category]) {
      totals[category] += toStressPoint(category, no, answer)
    }
  }

  // 素点換算（尺度ごと）。設問が1つでも欠けた尺度は評価しない
  const scaleScores: CalculatedScaleScore[] = []
  for (const scale of MHLW_57_SCALES) {
    const map = answers[scale.category]
    if (!scale.items.every(no => map.has(no))) continue
    const answerOf = (no: number) => map.get(no) as number
    const rawScore = scale.score(answerOf)
    const evalPoint = toEvalPoint(scale, rawScore, gender)
    if (evalPoint === null) continue
    scaleScores.push({
      scaleName: scale.name,
      rawScore,
      evalPoint,
      questionCount: scale.items.length,
      sumAnswers: scale.items.reduce(
        (acc, no) => acc + toStressPoint(scale.category, no, answerOf(no)),
        0
      ),
      category: scale.category,
    })
  }

  return {
    score_a: totals.A,
    score_b: totals.B,
    score_c: totals.C,
    score_d: totals.D,
    is_high_stress: isHighStress(totals.A, totals.B, totals.C),
    scale_scores: scaleScores,
  }
}
