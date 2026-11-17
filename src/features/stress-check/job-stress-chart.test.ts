import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calcJobStressHealthRisk,
  chartRiskAt,
  riskAtLeastPolygon,
  isoRiskSegment,
  JOB_STRESS_CHART_AXES,
  JOB_STRESS_CHART_NORMS,
} from './job-stress-chart'

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

test('量-コントロール判定図の等リスク線は線上のどの点でもそのリスク値になる', () => {
  for (const risk of [80, 100, 120, 150]) {
    const seg = isoRiskSegment('demandControl', risk)
    assert.ok(seg, `${risk} の線が軸範囲内に無い`)
    for (const p of seg) {
      const r = calcJobStressHealthRisk({
        workload: p.x,
        control: p.y,
        supervisor: JOB_STRESS_CHART_NORMS.supervisor,
        colleague: JOB_STRESS_CHART_NORMS.colleague,
      })
      near(r.riskA, risk, 0.01)
      const ax = JOB_STRESS_CHART_AXES.demandControl
      assert.ok(p.x >= ax.x[0] - 1e-9 && p.x <= ax.x[1] + 1e-9)
      assert.ok(p.y >= ax.y[0] - 1e-9 && p.y <= ax.y[1] + 1e-9)
    }
  }
})

test('職場の支援判定図の等リスク線は線上のどの点でもそのリスク値になる', () => {
  for (const risk of [70, 100, 130]) {
    const seg = isoRiskSegment('support', risk)
    assert.ok(seg)
    for (const p of seg) {
      const r = calcJobStressHealthRisk({
        workload: JOB_STRESS_CHART_NORMS.workload,
        control: JOB_STRESS_CHART_NORMS.control,
        supervisor: p.x,
        colleague: p.y,
      })
      near(r.riskB, risk, 0.01)
    }
  }
})

test('軸範囲を通らないリスク値の等リスク線は null', () => {
  assert.equal(isoRiskSegment('support', 1000), null)
})

test('高リスク領域の多角形の頂点はすべて閾値以上のリスクで、軸範囲内にある', () => {
  for (const kind of ['demandControl', 'support'] as const) {
    const poly = riskAtLeastPolygon(kind, 120)
    assert.ok(poly.length >= 3, `${kind} の多角形が作れない`)
    const ax = JOB_STRESS_CHART_AXES[kind]
    for (const p of poly) {
      assert.ok(chartRiskAt(kind, p) >= 120 - 1e-6)
      assert.ok(p.x >= ax.x[0] - 1e-9 && p.x <= ax.x[1] + 1e-9)
      assert.ok(p.y >= ax.y[0] - 1e-9 && p.y <= ax.y[1] + 1e-9)
    }
  }
})

test('量-コントロール判定図の高リスク領域は右下（量が多くコントロールが低い）の角を含む', () => {
  const poly = riskAtLeastPolygon('demandControl', 120)
  assert.ok(poly.some(p => p.x === 12 && p.y === 4))
  assert.ok(!poly.some(p => p.x === 5 && p.y === 11))
})
