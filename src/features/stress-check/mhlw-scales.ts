/**
 * 職業性ストレス簡易調査票（57項目）の尺度定義と素点換算表
 *
 * 出典: 厚生労働省「労働安全衛生法に基づくストレスチェック制度実施マニュアル」
 *       （平成28年4月改訂）P40「素点換算表（職業性ストレス簡易調査票 57 項目を用いる場合）」
 *       原本: docs/stress/実施マニュアル改訂_平成28年4月.pdf
 *
 * 回答値はすべて調査票の選択肢番号（1〜4）で扱う。
 *   A: そうだ=1 まあそうだ=2 ややちがう=3 ちがう=4
 *   B: ほとんどなかった=1 ときどきあった=2 しばしばあった=3 ほとんどいつもあった=4
 *   C: 非常に=1 かなり=2 多少=3 全くない=4
 *   D: 満足=1 まあ満足=2 やや不満足=3 不満足=4
 */

export type StressCategory = 'A' | 'B' | 'C' | 'D'
export type StressGender = 'male' | 'female'

/** 尺度の向き。得点が高いとストレスが高い（stressor / reaction）か、低い（resource）か */
type ScaleDirection = 'stressor' | 'resource' | 'reaction'

/** 素点換算表の 5 列（低い／少い, やや低い, 普通, やや高い, 高い／多い）。該当なしの列は null */
type Bands = readonly [
  readonly [number, number] | null,
  readonly [number, number] | null,
  readonly [number, number] | null,
  readonly [number, number] | null,
  readonly [number, number] | null,
]

/** 回答値の取得関数（category + 設問番号 → 回答値） */
type AnswerOf = (no: number) => number

export interface ScaleDefinition {
  name: string
  category: StressCategory
  /** 計算に使う設問番号（領域内番号） */
  items: readonly number[]
  /** マニュアルの「計算」欄 */
  score: (a: AnswerOf) => number
  direction: ScaleDirection
  bands: Record<StressGender, Bands>
}

const sum = (a: AnswerOf, nos: readonly number[]) => nos.reduce((acc, no) => acc + a(no), 0)
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** 男女同じ換算表の尺度用 */
const same = (bands: Bands): Record<StressGender, Bands> => ({ male: bands, female: bands })

// 4段階しかない尺度の列配置は換算表の原本（座標）で確認済み
const ONE_ITEM_HIGH_SIDE: Bands = [null, [1, 1], [2, 2], [3, 3], [4, 4]]
const ONE_ITEM_LOW_SIDE: Bands = [[1, 1], [2, 2], [3, 3], [4, 4], null]
const ONE_ITEM_SKIP_SLIGHTLY_HIGH: Bands = [[1, 1], [2, 2], [3, 3], null, [4, 4]]

export const MHLW_57_SCALES: readonly ScaleDefinition[] = [
  // ── A: ストレスの原因と考えられる因子 ──
  {
    name: '心理的な仕事の負担（量）',
    category: 'A',
    items: [1, 2, 3],
    score: a => 15 - sum(a, [1, 2, 3]),
    direction: 'stressor',
    bands: {
      male: [
        [3, 5],
        [6, 7],
        [8, 9],
        [10, 11],
        [12, 12],
      ],
      female: [
        [3, 4],
        [5, 6],
        [7, 9],
        [10, 11],
        [12, 12],
      ],
    },
  },
  {
    name: '心理的な仕事の負担（質）',
    category: 'A',
    items: [4, 5, 6],
    score: a => 15 - sum(a, [4, 5, 6]),
    direction: 'stressor',
    bands: {
      male: [
        [3, 5],
        [6, 7],
        [8, 9],
        [10, 11],
        [12, 12],
      ],
      female: [
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
        [11, 12],
      ],
    },
  },
  {
    name: '自覚的な身体的負担度',
    category: 'A',
    items: [7],
    score: a => 5 - a(7),
    direction: 'stressor',
    bands: same(ONE_ITEM_HIGH_SIDE),
  },
  {
    name: '職場の対人関係でのストレス',
    category: 'A',
    items: [12, 13, 14],
    score: a => 10 - (a(12) + a(13)) + a(14),
    direction: 'stressor',
    bands: same([
      [3, 3],
      [4, 5],
      [6, 7],
      [8, 9],
      [10, 12],
    ]),
  },
  {
    name: '職場環境によるストレス',
    category: 'A',
    items: [15],
    score: a => 5 - a(15),
    direction: 'stressor',
    bands: { male: ONE_ITEM_HIGH_SIDE, female: [[1, 1], null, [2, 2], [3, 3], [4, 4]] },
  },
  {
    name: '仕事のコントロール度',
    category: 'A',
    items: [8, 9, 10],
    score: a => 15 - sum(a, [8, 9, 10]),
    direction: 'resource',
    bands: {
      male: [
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
        [11, 12],
      ],
      female: [
        [3, 3],
        [4, 5],
        [6, 8],
        [9, 10],
        [11, 12],
      ],
    },
  },
  {
    name: '技能の活用度',
    category: 'A',
    items: [11],
    score: a => a(11),
    direction: 'resource',
    bands: same(ONE_ITEM_LOW_SIDE),
  },
  {
    name: '仕事の適性度',
    category: 'A',
    items: [16],
    score: a => 5 - a(16),
    direction: 'resource',
    bands: same(ONE_ITEM_SKIP_SLIGHTLY_HIGH),
  },
  {
    name: '働きがい',
    category: 'A',
    items: [17],
    score: a => 5 - a(17),
    direction: 'resource',
    bands: same(ONE_ITEM_SKIP_SLIGHTLY_HIGH),
  },

  // ── B: ストレスによっておこる心身の反応 ──
  {
    name: '活気',
    category: 'B',
    items: [1, 2, 3],
    score: a => sum(a, [1, 2, 3]),
    direction: 'resource',
    bands: same([
      [3, 3],
      [4, 5],
      [6, 7],
      [8, 9],
      [10, 12],
    ]),
  },
  {
    name: 'イライラ感',
    category: 'B',
    items: [4, 5, 6],
    score: a => sum(a, [4, 5, 6]),
    direction: 'reaction',
    bands: {
      male: [
        [3, 3],
        [4, 5],
        [6, 7],
        [8, 9],
        [10, 12],
      ],
      female: [
        [3, 3],
        [4, 5],
        [6, 8],
        [9, 10],
        [11, 12],
      ],
    },
  },
  {
    name: '疲労感',
    category: 'B',
    items: [7, 8, 9],
    score: a => sum(a, [7, 8, 9]),
    direction: 'reaction',
    bands: {
      male: [
        [3, 3],
        [4, 4],
        [5, 7],
        [8, 10],
        [11, 12],
      ],
      female: [
        [3, 3],
        [4, 5],
        [6, 8],
        [9, 11],
        [12, 12],
      ],
    },
  },
  {
    name: '不安感',
    category: 'B',
    items: [10, 11, 12],
    score: a => sum(a, [10, 11, 12]),
    direction: 'reaction',
    bands: {
      male: [
        [3, 3],
        [4, 4],
        [5, 7],
        [8, 9],
        [10, 12],
      ],
      female: [
        [3, 3],
        [4, 4],
        [5, 7],
        [8, 10],
        [11, 12],
      ],
    },
  },
  {
    name: '抑うつ感',
    category: 'B',
    items: range(13, 18),
    score: a => sum(a, range(13, 18)),
    direction: 'reaction',
    bands: {
      male: [
        [6, 6],
        [7, 8],
        [9, 12],
        [13, 16],
        [17, 24],
      ],
      female: [
        [6, 6],
        [7, 8],
        [9, 12],
        [13, 17],
        [18, 24],
      ],
    },
  },
  {
    name: '身体愁訴',
    category: 'B',
    items: range(19, 29),
    score: a => sum(a, range(19, 29)),
    direction: 'reaction',
    bands: {
      male: [
        [11, 11],
        [12, 15],
        [16, 21],
        [22, 26],
        [27, 44],
      ],
      female: [
        [11, 13],
        [14, 17],
        [18, 23],
        [24, 29],
        [30, 44],
      ],
    },
  },

  // ── C/D: ストレス反応に影響を与える他の因子 ──
  {
    name: '上司からのサポート',
    category: 'C',
    items: [1, 4, 7],
    score: a => 15 - sum(a, [1, 4, 7]),
    direction: 'resource',
    bands: {
      male: [
        [3, 4],
        [5, 6],
        [7, 8],
        [9, 10],
        [11, 12],
      ],
      female: [
        [3, 3],
        [4, 5],
        [6, 7],
        [8, 10],
        [11, 12],
      ],
    },
  },
  {
    name: '同僚からのサポート',
    category: 'C',
    items: [2, 5, 8],
    score: a => 15 - sum(a, [2, 5, 8]),
    direction: 'resource',
    bands: same([
      [3, 5],
      [6, 7],
      [8, 9],
      [10, 11],
      [12, 12],
    ]),
  },
  {
    name: '家族・友人からのサポート',
    category: 'C',
    items: [3, 6, 9],
    score: a => 15 - sum(a, [3, 6, 9]),
    direction: 'resource',
    bands: same([
      [3, 6],
      [7, 8],
      [9, 9],
      [10, 11],
      [12, 12],
    ]),
  },
  {
    name: '仕事や生活の満足度',
    category: 'D',
    items: [1, 2],
    score: a => 10 - (a(1) + a(2)),
    direction: 'resource',
    bands: same([
      [2, 3],
      [4, 4],
      [5, 6],
      [7, 7],
      [8, 8],
    ]),
  },
]

/**
 * 素点換算表で得点を 5 段階評価点（ストレスが高いほど 1、低いほど 5）に換算する。
 * 得点がどの列にも当てはまらない場合は null。
 */
export function toEvalPoint(
  scale: ScaleDefinition,
  score: number,
  gender: StressGender
): number | null {
  const column = scale.bands[gender].findIndex(b => b !== null && score >= b[0] && score <= b[1])
  if (column < 0) return null
  // column: 0=低い … 4=高い
  return scale.direction === 'resource' ? column + 1 : 5 - column
}

/**
 * 単純合計（評価基準の例その1）で使う「ストレスが高い方を 4 点」とする設問ごとの点数。
 * 「そうだ」「ほとんどいつもあった」がストレスの低さを表す設問以外は、選択肢番号を反転する。
 */
const REVERSED_FOR_STRESS_POINT: Record<StressCategory, ReadonlySet<number>> = {
  // 量・質・身体的負担・技能の活用（使うことが少ない）・対人関係（12,13）・職場環境
  A: new Set([1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 15]),
  // 活気（ほとんどいつもあった＝ストレスが低い）
  B: new Set([1, 2, 3]),
  C: new Set(),
  D: new Set(),
}

export function toStressPoint(category: StressCategory, no: number, answer: number): number {
  return REVERSED_FOR_STRESS_POINT[category].has(no) ? 5 - answer : answer
}
