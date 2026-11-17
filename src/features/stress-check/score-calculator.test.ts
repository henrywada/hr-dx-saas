import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateScoresFromResponses,
  toStressGender,
  type MergedResponse,
} from './score-calculator'

// 57項目の構成（領域ごとの設問数）
const ITEM_COUNTS = { A: 17, B: 29, C: 9, D: 2 } as const
type Category = keyof typeof ITEM_COUNTS
type AnswerSpec = Partial<Record<Category, (no: number) => number>>

/**
 * 回答値（調査票の選択肢番号 1〜4）から MergedResponse[] を組み立てる。
 * 指定がない領域は全問 1 とする。
 */
function buildResponses(spec: AnswerSpec): MergedResponse[] {
  const rows: MergedResponse[] = []
  for (const category of Object.keys(ITEM_COUNTS) as Category[]) {
    for (let no = 1; no <= ITEM_COUNTS[category]; no++) {
      const answer = spec[category]?.(no) ?? 1
      rows.push({
        answer,
        question_id: `${category}${no}`,
        stress_check_questions: { category, question_no: no },
      })
    }
  }
  return rows
}

function evalOf(result: ReturnType<typeof calculateScoresFromResponses>, scaleName: string) {
  const scale = result.scale_scores.find(s => s.scaleName === scaleName)
  assert.ok(scale, `尺度「${scaleName}」が見つかりません`)
  return scale
}

// A領域で「そうだ」がストレス高を意味する設問（単純合計で 5-回答値 に反転する設問）
const A_STRESS_WHEN_YES = new Set([1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 15])

test('全問「1」（そうだ／ほとんどなかった／非常に／満足）の素点換算と単純合計', () => {
  const result = calculateScoresFromResponses(buildResponses({}), 'male')

  // 素点換算表（マニュアル P40）の得点と評価点（ストレスが高いほど 1）
  assert.deepEqual(
    [
      evalOf(result, '心理的な仕事の負担（量）').rawScore,
      evalOf(result, '心理的な仕事の負担（量）').evalPoint,
    ],
    [12, 1]
  )
  assert.equal(evalOf(result, '自覚的な身体的負担度').evalPoint, 1)
  assert.equal(evalOf(result, '職場の対人関係でのストレス').rawScore, 9)
  assert.equal(evalOf(result, '職場の対人関係でのストレス').evalPoint, 2)
  assert.equal(evalOf(result, '仕事のコントロール度').evalPoint, 5)
  assert.equal(evalOf(result, '技能の活用度').evalPoint, 1)
  assert.equal(evalOf(result, '仕事の適性度').evalPoint, 5)
  assert.equal(evalOf(result, '活気').evalPoint, 1)
  assert.equal(evalOf(result, '抑うつ感').evalPoint, 5)
  assert.equal(evalOf(result, '身体愁訴').evalPoint, 5)
  assert.equal(evalOf(result, '上司からのサポート').evalPoint, 5)
  assert.equal(evalOf(result, '仕事や生活の満足度').evalPoint, 5)

  // 単純合計（ストレスが高い方を 4 点）: A=11問×4+6問×1, B=活気3問×4+26問×1
  assert.equal(result.score_a, 50)
  assert.equal(result.score_b, 38)
  assert.equal(result.score_c, 9)
  assert.equal(result.score_d, 2)
  assert.equal(result.is_high_stress, false)
  assert.equal(result.scale_scores.length, 19)
})

test('心身のストレス反応が 77 点以上なら高ストレス（基準㋐）', () => {
  // B 全問「ほとんどいつもあった」: 活気は 1点×3、他26問は 4点 → 107
  const result = calculateScoresFromResponses(buildResponses({ B: () => 4 }), 'male')
  assert.equal(result.score_b, 107)
  assert.equal(result.is_high_stress, true)
})

test('要因＋支援が 76 点以上かつ反応 63 点以上なら高ストレス（基準㋑）の境界', () => {
  // A・C を最もストレスが高い回答にする（A=68, C=36）
  const worstA = (no: number) => (A_STRESS_WHEN_YES.has(no) ? 1 : 4)
  const worstC = () => 4
  // B: 活気(1〜3)は「ほとんどいつもあった」=1点、残り26問のうち 8問を3点・18問を2点 → 3+24+36=63
  const b63 = (no: number) => (no <= 3 ? 4 : no <= 11 ? 3 : 2)
  const b62 = (no: number) => (no <= 3 ? 4 : no <= 10 ? 3 : 2)

  const atBoundary = calculateScoresFromResponses(
    buildResponses({ A: worstA, B: b63, C: worstC }),
    'male'
  )
  assert.equal(atBoundary.score_a + atBoundary.score_c, 104)
  assert.equal(atBoundary.score_b, 63)
  assert.equal(atBoundary.is_high_stress, true)

  const below = calculateScoresFromResponses(
    buildResponses({ A: worstA, B: b62, C: worstC }),
    'male'
  )
  assert.equal(below.score_b, 62)
  assert.equal(below.is_high_stress, false)
})

test('仕事の量の素点換算は男性の得点帯（3-5/6-7/8-9/10-11/12）に従う', () => {
  // 回答 4,4,1 → 得点 15-9=6 → 男性「やや低い」→ 評価点 4
  const result = calculateScoresFromResponses(
    buildResponses({ A: no => (no === 1 || no === 2 ? 4 : 1) }),
    'male'
  )
  assert.equal(evalOf(result, '心理的な仕事の負担（量）').rawScore, 6)
  assert.equal(evalOf(result, '心理的な仕事の負担（量）').evalPoint, 4)
})

test('女性は女性用の素点換算表を使う', () => {
  // 身体愁訴 得点13: 男性は 12-15「やや低い」→4、女性は 11-13「低い」→5
  const bodySpec: AnswerSpec = { B: no => (no === 19 || no === 20 ? 2 : 1) }
  assert.equal(
    evalOf(calculateScoresFromResponses(buildResponses(bodySpec), 'male'), '身体愁訴').evalPoint,
    4
  )
  assert.equal(
    evalOf(calculateScoresFromResponses(buildResponses(bodySpec), 'female'), '身体愁訴').evalPoint,
    5
  )

  // 職場環境 回答4 → 得点1: 男性は「やや低い」→4、女性は「低い」→5
  const envSpec: AnswerSpec = { A: no => (no === 15 ? 4 : 1) }
  assert.equal(
    evalOf(calculateScoresFromResponses(buildResponses(envSpec), 'male'), '職場環境によるストレス')
      .evalPoint,
    4
  )
  assert.equal(
    evalOf(
      calculateScoresFromResponses(buildResponses(envSpec), 'female'),
      '職場環境によるストレス'
    ).evalPoint,
    5
  )
})

test('設問が欠けている尺度は評価しない', () => {
  const responses = buildResponses({}).filter(r => r.question_id !== 'A1')
  const result = calculateScoresFromResponses(responses, 'male')
  assert.equal(
    result.scale_scores.find(s => s.scaleName === '心理的な仕事の負担（量）'),
    undefined
  )
  assert.equal(result.scale_scores.length, 18)
})

test('employees.sex の表記（女性・女・female 等）を採点用の性別に変換する', () => {
  for (const v of ['女性', '女', 'female', 'F', ' 女性 ']) assert.equal(toStressGender(v), 'female')
  for (const v of ['男性', '男', 'male', '', null, undefined])
    assert.equal(toStressGender(v), 'male')
})
