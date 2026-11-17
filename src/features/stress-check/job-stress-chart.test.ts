import assert from 'node:assert/strict'
import test from 'node:test'

import { calcJobStressHealthRisk, JOB_STRESS_CHART_NORMS } from './job-stress-chart'

function near(actual: number, expected: number, tolerance = 0.05) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} は ${expected} ±${tolerance} ではありません`
  )
}

test('全国平均と同じ集団の健康リスクは 100', () => {
  const r = calcJobStressHealthRisk(JOB_STRESS_CHART_NORMS)
  near(r.riskA, 100)
  near(r.riskB, 100)
  near(r.total, 100)
})

test('量が多くコントロールが低いほど量-コントロール判定図のリスクが上がる', () => {
  // exp(0.076×(8.5-8.7) − 0.089×(6.4-7.9)) × 100 ≈ 112.6
  const r = calcJobStressHealthRisk({
    workload: 8.5,
    control: 6.4,
    supervisor: 7.5,
    colleague: 8.1,
  })
  near(r.riskA, 112.6, 0.1)
  near(r.riskB, 100)
})

test('上司・同僚の支援が低いほど職場の支援判定図のリスクが上がり、総合は A×B/100', () => {
  // exp(−0.097×(6.0-7.5) − 0.097×(8.8-8.1)) × 100 ≈ 108.1
  const r = calcJobStressHealthRisk({
    workload: 8.5,
    control: 6.4,
    supervisor: 6.0,
    colleague: 8.8,
  })
  near(r.riskB, 108.1, 0.1)
  near(r.total, (r.riskA * r.riskB) / 100, 0.001)
})
