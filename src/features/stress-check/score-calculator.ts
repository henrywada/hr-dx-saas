/**
 * ストレスチェック採点ロジック（厚労省マニュアル準拠）
 * stress_check_responses から score_a/b/c/d, is_high_stress を算出
 */

// ============================================================
// 厚労省公式 57項目 男性用 換算マッピング（素点合計値 -> 評価点1〜5）
// 出典: 職業性ストレス簡易調査票を用いたストレスチェック実施マニュアル（第3版）別表2
// ============================================================
const MALE_EVAL_MAP: Record<string, (sum: number) => number> = {
  // === A領域 (原因) ===
  '心理的な仕事の負担（量）': s => (s <= 3 ? 1 : s === 4 ? 2 : s <= 6 ? 3 : s <= 8 ? 4 : 5),
  '心理的な仕事の負担（質）': s => (s <= 3 ? 1 : s === 4 ? 2 : s <= 6 ? 3 : s <= 8 ? 4 : 5),
  自覚的な身体的負担度: s => (s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 5),
  仕事のコントロール度: s => (s <= 5 ? 5 : s <= 7 ? 4 : s <= 9 ? 3 : s <= 11 ? 2 : 1),
  技能の活用度: s => (s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 5),
  職場の対人関係でのストレス: s => (s <= 5 ? 1 : s <= 7 ? 2 : s <= 9 ? 3 : s <= 11 ? 4 : 5),
  職場環境によるストレス: s => (s === 1 ? 1 : s === 2 ? 2 : s === 3 ? 3 : 5),
  仕事の適性度: s => (s === 1 ? 5 : s === 2 ? 3 : s === 3 ? 2 : 1),
  働きがい: s => (s === 1 ? 5 : s === 2 ? 3 : s === 3 ? 2 : 1),

  // === B領域 (心身の反応) ===
  活気: s => (s <= 4 ? 1 : s <= 6 ? 2 : s <= 8 ? 3 : s <= 10 ? 4 : 5),
  イライラ感: s => (s <= 4 ? 5 : s === 5 ? 4 : s <= 7 ? 3 : s <= 9 ? 2 : 1),
  疲労感: s => (s <= 4 ? 5 : s <= 6 ? 4 : s <= 8 ? 3 : s <= 10 ? 2 : 1),
  不安感: s => (s <= 4 ? 5 : s <= 6 ? 4 : s === 7 ? 3 : s <= 9 ? 2 : 1),
  抑うつ感: s => (s === 6 ? 5 : s <= 8 ? 4 : s <= 12 ? 3 : s <= 16 ? 2 : 1),
  身体愁訴: s => (s === 11 ? 5 : s <= 15 ? 4 : s <= 21 ? 3 : s <= 26 ? 2 : 1),

  // === C領域 (サポート) ===
  上司からのサポート: s => (s <= 4 ? 5 : s <= 6 ? 4 : s <= 8 ? 3 : s <= 10 ? 2 : 1),
  同僚からのサポート: s => (s <= 5 ? 5 : s <= 7 ? 4 : s <= 9 ? 3 : s <= 11 ? 2 : 1),
  '家族・友人からのサポート': s => (s <= 6 ? 5 : s <= 8 ? 4 : s === 9 ? 3 : s <= 11 ? 2 : 1),

  // === D領域 (満足度) ===
  仕事や生活の満足度: s => (s <= 3 ? 5 : s === 4 ? 4 : s <= 6 ? 3 : s === 7 ? 2 : 1),
}

// ============================================================
// 厚労省公式 57項目 女性用 換算マッピング（素点合計値 -> 評価点1〜5）
// 出典: 同上 別表3
// 男性と異なるのは「活気」「身体愁訴」の2尺度のみ
// ============================================================
const FEMALE_EVAL_MAP: Record<string, (sum: number) => number> = {
  ...MALE_EVAL_MAP,
  活気: s => (s <= 3 ? 1 : s <= 5 ? 2 : s <= 7 ? 3 : s <= 9 ? 4 : 5),
  身体愁訴: s => (s <= 12 ? 5 : s <= 16 ? 4 : s <= 22 ? 3 : s <= 27 ? 2 : 1),
}

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

/** 採点結果（stress_check_results 保存用） */
export interface CalculatedScores {
  score_a: number
  score_b: number
  score_c: number
  score_d: number
  is_high_stress: boolean
  scale_scores: Array<{
    scaleName: string
    rawScore: number
    evalPoint: number
    questionCount: number
    sumAnswers: number
    category: string
  }>
}

/**
 * マージ済み回答データから採点を計算
 * 厚労省マニュアル P42 素点合計方式で高ストレス判定
 * @param gender employees.sex から導出。未設定時は 'male' にフォールバック
 */
export function calculateScoresFromResponses(
  mergedResponses: MergedResponse[],
  gender: 'male' | 'female' = 'male'
): CalculatedScores {
  const evalMap = gender === 'female' ? FEMALE_EVAL_MAP : MALE_EVAL_MAP
  const categoryAgg: Record<string, { total: number; max: number; count: number }> = {}
  const scaleAgg: Record<string, { sumAnswers: number; count: number; category: string }> = {}

  for (const resp of mergedResponses) {
    const question = resp.stress_check_questions
    if (!question) continue

    const cat = question.category as string
    const scaleName = (question.scale_name as string) || ''

    let val = resp.answer
    const qText = question.question_text || ''
    // 厚労省公式：職場の対人関係（A14）の反転処理
    if (
      scaleName === '職場の対人関係でのストレス' &&
      (qText.includes('親しみ') || qText.includes('友好的'))
    ) {
      val = 5 - val
    }

    if (!categoryAgg[cat]) categoryAgg[cat] = { total: 0, max: 0, count: 0 }
    categoryAgg[cat].total += val
    categoryAgg[cat].max += 4
    categoryAgg[cat].count += 1

    if (!scaleAgg[scaleName]) scaleAgg[scaleName] = { sumAnswers: 0, count: 0, category: cat }
    scaleAgg[scaleName].sumAnswers += val
    scaleAgg[scaleName].count += 1
  }

  const scaleScores = Object.entries(scaleAgg).map(([scaleName, agg]) => {
    const rawScore = agg.sumAnswers
    const evalFunc = evalMap[scaleName]
    const evalPoint = evalFunc ? evalFunc(rawScore) : 3
    return {
      scaleName,
      rawScore,
      evalPoint,
      questionCount: agg.count,
      sumAnswers: agg.sumAnswers,
      category: agg.category,
    }
  })

  const scoreA = categoryAgg['A']?.total ?? 0
  const scoreB = categoryAgg['B']?.total ?? 0
  const scoreC = categoryAgg['C']?.total ?? 0
  const scoreD = categoryAgg['D']?.total ?? 0

  // 高ストレス判定（マニュアル P42）
  const isHighStress = scoreB >= 77 || (scoreA + scoreC >= 76 && scoreB >= 63)

  return {
    score_a: scoreA,
    score_b: scoreB,
    score_c: scoreC,
    score_d: scoreD,
    is_high_stress: isHighStress,
    scale_scores: scaleScores,
  }
}
