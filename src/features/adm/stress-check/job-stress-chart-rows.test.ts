import assert from 'node:assert/strict'
import test from 'node:test'

import { buildJudgmentRows } from './job-stress-chart-rows'
import type { GroupData } from './queries'

function group(overrides: Partial<GroupData>): GroupData {
  return {
    division_id: 'd1',
    name: '経理課',
    tenant_id: 't1',
    member_count: 20,
    high_stress_rate: 10,
    health_risk: 121,
    workload: 8.5,
    control: 6.4,
    supervisor_support: 6.0,
    colleague_support: 8.8,
    previous_health_risk: 94,
    period_name: '2026',
    is_latest: true,
    ...overrides,
  }
}

test('判定図の4尺度から(A)(B)を計算し、総合はDBの健康リスクを使う', () => {
  // 入力はマニュアル P87 の記入例（経理課）。記入例の (A)=108 / (B)=112 は説明用の数値で
  // 判定図の式とは一致しないため、期待値は式（job-stress-chart.ts）で計算した値を使う
  const [row] = buildJudgmentRows([group({})])

  assert.equal(row.isPlottable, true)
  assert.equal(Math.round(row.riskA as number), 113)
  assert.equal(Math.round(row.riskB as number), 108)
  assert.equal(row.total, 121)
  assert.equal(row.totalDiff, 27)
  assert.equal(row.label, '1')
})

test('マスキングされた集団や尺度が欠けた集団はプロットしない', () => {
  const rows = buildJudgmentRows([
    group({ division_id: 'a', is_suppressed: true, workload: null, health_risk: null }),
    group({ division_id: 'b', colleague_support: null }),
    group({ division_id: 'c' }),
  ])

  assert.deepEqual(
    rows.map(r => [r.id, r.isPlottable, r.label]),
    [
      ['a', false, ''],
      ['b', false, ''],
      ['c', true, '1'],
    ]
  )
  assert.equal(rows[0].riskA, null)
  assert.equal(rows[0].isSuppressed, true)
  assert.equal(rows[1].isSuppressed, false)
})

test('前回の健康リスクが無ければ前回比は null', () => {
  const [row] = buildJudgmentRows([group({ previous_health_risk: null })])

  assert.equal(row.totalDiff, null)
})
