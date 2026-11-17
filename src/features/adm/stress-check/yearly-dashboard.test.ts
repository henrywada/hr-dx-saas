import assert from 'node:assert/strict'
import test from 'node:test'

import { MHLW_57_SCALES } from '@/features/stress-check/mhlw-scales'
import { aggregateYearlyDashboard, type YearlyPersonRow } from './yearly-dashboard'

function person(fiscalYear: number, evalPoints: Record<string, number>): YearlyPersonRow {
  return {
    fiscalYear,
    scoreA: 40,
    scoreB: 50,
    scoreC: 20,
    isHighStress: false,
    female: false,
    scaleScores: Object.entries(evalPoints).map(([scaleName, evalPoint]) => ({
      scaleName,
      evalPoint,
      rawScore: 8,
    })),
  }
}

test('尺度別プロフィールは全19尺度を調査票の順で返し、評価点を集団平均する', () => {
  const people = Array.from({ length: 10 }, (_, i) =>
    person(2026, { 活気: i < 5 ? 2 : 3, イライラ感: 4 })
  )

  const [year] = aggregateYearlyDashboard(people)

  assert.deepEqual(
    year.scaleProfile.map(s => s.scaleName),
    MHLW_57_SCALES.map(s => s.name)
  )
  const vitality = year.scaleProfile.find(s => s.scaleName === '活気')
  assert.equal(vitality?.avgEval, 2.5)
  assert.equal(vitality?.category, 'B')
  assert.equal(year.scaleProfile.find(s => s.scaleName === 'イライラ感')?.avgEval, 4)
})

test('回答の無い尺度の平均は null', () => {
  const people = Array.from({ length: 10 }, () => person(2026, { 活気: 3 }))

  const [year] = aggregateYearlyDashboard(people)

  assert.equal(year.scaleProfile.find(s => s.scaleName === '働きがい')?.avgEval, null)
})

test('受検者が10名未満の年度は尺度別プロフィールを出さない', () => {
  const people = Array.from({ length: 9 }, () => person(2026, { 活気: 3 }))

  const [year] = aggregateYearlyDashboard(people)

  assert.equal(year.suppressed, true)
  assert.ok(year.scaleProfile.every(s => s.avgEval == null))
})
