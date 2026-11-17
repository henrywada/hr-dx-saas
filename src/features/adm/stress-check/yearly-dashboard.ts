/**
 * 集団分析「年度別分析」の純関数。
 * 対応度は厚労省マニュアル（素点合計方式）の高ストレス判定を5区分に読み替える。
 * 健康リスクは仕事のストレス判定図（全国平均=100、総合=(A)×(B)/100）。
 */

import { calcJobStressHealthRisk } from '@/features/stress-check/job-stress-chart'

/** 集団分析の下限人数（マニュアル：受検者 10 人未満の集団の分析結果は事業者に提供しない） */
export const YEARLY_MIN_N = 10

export type ResponseLevel = 'urgent' | 'interview' | 'consider' | 'observe' | 'good'

export const RESPONSE_LEVELS: {
  key: ResponseLevel
  label: string
  color: string
}[] = [
  { key: 'urgent', label: '緊急面談', color: '#990099' },
  { key: 'interview', label: '要面談', color: '#109618' },
  { key: 'consider', label: '面談検討', color: '#FF9900' },
  { key: 'observe', label: '経過観察', color: '#DC3912' },
  { key: 'good', label: '良好', color: '#3366CC' },
]

export const ITEM_KEYS = [
  { key: 'burden', label: '負担度' },
  { key: 'control', label: 'コントロール度' },
  { key: 'relations', label: '対人関係' },
  { key: 'fit', label: '適合性' },
  { key: 'psych', label: '心理的反応' },
  { key: 'physical', label: '身体的反応' },
  { key: 'support', label: '協力支援' },
] as const

export type ItemKey = (typeof ITEM_KEYS)[number]['key']

export type ScaleScoreLike = {
  scaleName?: string
  rawScore?: number
  evalPoint?: number
  category?: string
}

export type YearlyPersonRow = {
  fiscalYear: number
  scoreA: number
  scoreB: number
  scoreC: number
  isHighStress: boolean
  female: boolean
  scaleScores: ScaleScoreLike[]
}

export type HealthRiskBlock = {
  n: number
  suppressed: boolean
  demand: number | null
  control: number | null
  supervisor: number | null
  coworker: number | null
  riskA: number | null
  riskB: number | null
  total: number | null
}

export type YearlyDashboardYear = {
  fiscalYear: number
  n: number
  suppressed: boolean
  responseLevels: Record<ResponseLevel, number>
  itemAverages: Record<ItemKey, number | null>
  healthRisk: {
    male: HealthRiskBlock
    female: HealthRiskBlock
    all: HealthRiskBlock
  }
}

/** 厚労省マニュアル P42 素点合計方式を5段階の対応度に読み替え */
export function classifyResponseLevel(input: {
  scoreA: number
  scoreB: number
  scoreC: number
  isHighStress: boolean
}): ResponseLevel {
  const { scoreA, scoreB, scoreC, isHighStress } = input
  if (scoreB >= 77) return 'urgent'
  if (isHighStress) return 'interview'
  if (scoreB >= 63) return 'consider'
  if (scoreA + scoreC >= 76) return 'observe'
  return 'good'
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

/**
 * 仕事のストレス判定図（全国平均=100）。
 * 量的負担・コントロール・上司支援・同僚支援は各3問の得点（3〜12）の集団平均。
 * 男女とも男性（男女共通）の判定図を使う（マニュアル P86。女性用の係数は手元資料にないため）。
 */
export function computeHanteizu(
  demand: number,
  control: number,
  supervisor: number,
  coworker: number
): { riskA: number; riskB: number; total: number } {
  const r = calcJobStressHealthRisk({ workload: demand, control, supervisor, colleague: coworker })
  return {
    riskA: round1(r.riskA),
    riskB: round1(r.riskB),
    total: round1(r.total),
  }
}

function findScale(scores: ScaleScoreLike[], needles: string[]): ScaleScoreLike | null {
  for (const s of scores) {
    const name = s.scaleName ?? ''
    if (needles.some(n => name.includes(n))) return s
  }
  return null
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

const ITEM_NEEDLES: Record<ItemKey, string[]> = {
  burden: ['負担（量）', '負担（質）', '身体的負担'],
  control: ['コントロール'],
  relations: ['対人関係'],
  fit: ['適性度', '適正度', '働きがい'],
  psych: ['活気', 'イライラ', '疲労', '不安', '抑うつ'],
  physical: ['身体愁訴'],
  support: ['上司', '同僚', '家族'],
}

function itemEvalAverage(scores: ScaleScoreLike[], key: ItemKey): number | null {
  const needles = ITEM_NEEDLES[key]
  const vals = scores
    .filter(s => needles.some(n => (s.scaleName ?? '').includes(n)))
    .map(s => s.evalPoint)
    .filter((v): v is number => typeof v === 'number')
  const m = mean(vals)
  return m == null ? null : round1(m)
}

function rawOf(scores: ScaleScoreLike[], needles: string[]): number | null {
  const s = findScale(scores, needles)
  const v = s?.rawScore
  return typeof v === 'number' ? v : null
}

function emptyRisk(n: number, suppressed: boolean): HealthRiskBlock {
  return {
    n,
    suppressed,
    demand: null,
    control: null,
    supervisor: null,
    coworker: null,
    riskA: null,
    riskB: null,
    total: null,
  }
}

function riskFromPeople(people: YearlyPersonRow[], minN: number): HealthRiskBlock {
  const n = people.length
  if (n < minN) return emptyRisk(n, true)
  const demand = mean(
    people.map(p => rawOf(p.scaleScores, ['負担（量）'])).filter((v): v is number => v != null)
  )
  const control = mean(
    people.map(p => rawOf(p.scaleScores, ['コントロール'])).filter((v): v is number => v != null)
  )
  const supervisor = mean(
    people.map(p => rawOf(p.scaleScores, ['上司'])).filter((v): v is number => v != null)
  )
  const coworker = mean(
    people.map(p => rawOf(p.scaleScores, ['同僚'])).filter((v): v is number => v != null)
  )
  if (demand == null || control == null || supervisor == null || coworker == null) {
    return emptyRisk(n, false)
  }
  const h = computeHanteizu(demand, control, supervisor, coworker)
  return {
    n,
    suppressed: false,
    demand: round1(demand),
    control: round1(control),
    supervisor: round1(supervisor),
    coworker: round1(coworker),
    riskA: h.riskA,
    riskB: h.riskB,
    total: h.total,
  }
}

function round1Mean(vals: number[]): number | null {
  const m = mean(vals)
  return m == null ? null : round1(m)
}

export function aggregateYearlyDashboard(
  people: YearlyPersonRow[],
  minN = YEARLY_MIN_N
): YearlyDashboardYear[] {
  const byYear = new Map<number, YearlyPersonRow[]>()
  for (const p of people) {
    const list = byYear.get(p.fiscalYear) ?? []
    list.push(p)
    byYear.set(p.fiscalYear, list)
  }

  return [...byYear.keys()]
    .sort((a, b) => a - b)
    .map(fiscalYear => {
      const rows = byYear.get(fiscalYear) ?? []
      const n = rows.length
      const suppressed = n < minN
      const responseLevels: Record<ResponseLevel, number> = {
        urgent: 0,
        interview: 0,
        consider: 0,
        observe: 0,
        good: 0,
      }
      if (!suppressed) {
        for (const p of rows) {
          responseLevels[classifyResponseLevel(p)] += 1
        }
      }

      const itemAverages = {} as Record<ItemKey, number | null>
      for (const { key } of ITEM_KEYS) {
        itemAverages[key] = suppressed
          ? null
          : round1Mean(
              rows
                .map(p => itemEvalAverage(p.scaleScores, key))
                .filter((v): v is number => v != null)
            )
      }

      const maleRisk = riskFromPeople(
        rows.filter(p => !p.female),
        minN
      )
      const femaleRisk = riskFromPeople(
        rows.filter(p => p.female),
        minN
      )

      return {
        fiscalYear,
        n,
        suppressed,
        responseLevels,
        itemAverages,
        healthRisk: {
          male: maleRisk,
          female: femaleRisk,
          all: riskFromPeople(rows, minN),
        },
      }
    })
}
