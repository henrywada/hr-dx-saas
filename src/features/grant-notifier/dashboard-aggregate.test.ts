import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aggregateLlmCost,
  buildTenantOps,
  detectAnomalies,
  summarizeBatchRuns,
  type TenantOpsRow,
} from '@/features/grant-notifier/dashboard-aggregate'

test('buildTenantOps は条件・直近配信・判定件数をテナント単位にまとめる', () => {
  const rows = buildTenantOps({
    tenants: [
      { id: 't-1', name: '株式会社A' },
      { id: 't-2', name: '株式会社B' },
    ],
    conditions: [{ tenant_id: 't-1', delivery_frequency: 'monthly' }],
    deliveries: [
      { tenant_id: 't-1', sent_at: '2026-08-01T00:00:00.000Z' },
      { tenant_id: 't-1', sent_at: '2026-08-05T00:00:00.000Z' },
    ],
    matchResults: [
      { tenant_id: 't-1', verdict: '適合' },
      { tenant_id: 't-1', verdict: '要確認' },
      { tenant_id: 't-1', verdict: '不適合' },
    ],
  })

  assert.deepEqual(rows[0], {
    tenantId: 't-1',
    name: '株式会社A',
    hasConditions: true,
    deliveryFrequency: 'monthly',
    lastDeliveryAt: '2026-08-05T00:00:00.000Z',
    fitCount: 1,
    reviewCount: 1,
  })
  assert.deepEqual(rows[1], {
    tenantId: 't-2',
    name: '株式会社B',
    hasConditions: false,
    deliveryFrequency: null,
    lastDeliveryAt: null,
    fitCount: 0,
    reviewCount: 0,
  })
})

test('buildTenantOps は名称未設定のテナントを補完する', () => {
  const rows = buildTenantOps({
    tenants: [{ id: 't-1', name: null }],
    conditions: [],
    deliveries: [],
    matchResults: [],
  })

  assert.equal(rows[0]?.name, '(名称未設定)')
})

test('summarizeBatchRuns はステップ別の最新実行と失敗件数を返す', () => {
  const summary = summarizeBatchRuns([
    { step: 'collect', status: 'success', started_at: '2026-08-05T00:00:00.000Z' },
    { step: 'collect', status: 'failed', started_at: '2026-07-29T00:00:00.000Z' },
    { step: 'match', status: 'success', started_at: '2026-08-05T00:10:00.000Z' },
  ])

  assert.equal(summary.failedCount, 1)
  assert.deepEqual(summary.lastByStep.collect, {
    status: 'success',
    started_at: '2026-08-05T00:00:00.000Z',
  })
  assert.equal(summary.lastByStep.match?.status, 'success')
})

test('aggregateLlmCost は文字列で返る numeric を数値として合計する', () => {
  const summary = aggregateLlmCost([
    { step: 'collect', cost_usd: '0.000100' },
    { step: 'match', cost_usd: 0.0025 },
    { step: 'match', cost_usd: '0.0025' },
  ])

  assert.equal(summary.totalCostUsd, 0.0051)
  assert.equal(summary.byStep.collect, 0.0001)
  assert.equal(summary.byStep.match, 0.005)
})

test('aggregateLlmCost は空配列に 0 を返す', () => {
  assert.deepEqual(aggregateLlmCost([]), { totalCostUsd: 0, byStep: {} })
})

function tenantOps(overrides: Partial<TenantOpsRow> = {}): TenantOpsRow {
  return {
    tenantId: 't-1',
    name: '株式会社A',
    hasConditions: true,
    deliveryFrequency: 'weekly',
    lastDeliveryAt: '2026-08-05T00:00:00.000Z',
    fitCount: 1,
    reviewCount: 0,
    ...overrides,
  }
}

test('detectAnomalies は条件設定済みで未配信のテナントを検知する', () => {
  const messages = detectAnomalies({
    tenantOps: [tenantOps({ lastDeliveryAt: null })],
    sources: [{ name: 'J-グランツAPI', last_fetched_at: '2026-08-06T00:00:00.000Z' }],
    failedBatchCount: 0,
    now: '2026-08-07T00:00:00.000Z',
  })

  assert.deepEqual(messages, ['未配信: テナント「株式会社A」は条件設定済みだが配信実績がない'])
})

test('detectAnomalies は長期間更新のない収集ソースを検知する', () => {
  const messages = detectAnomalies({
    tenantOps: [tenantOps()],
    sources: [{ name: 'J-グランツAPI', last_fetched_at: '2026-07-01T00:00:00.000Z' }],
    failedBatchCount: 0,
    now: '2026-08-07T00:00:00.000Z',
  })

  assert.deepEqual(messages, ['収集停滞: ソース「J-グランツAPI」が長期間更新されていない'])
})

test('detectAnomalies は一度も取得されていないソースを検知する', () => {
  const messages = detectAnomalies({
    tenantOps: [],
    sources: [{ name: 'J-グランツAPI', last_fetched_at: null }],
    failedBatchCount: 0,
    now: '2026-08-07T00:00:00.000Z',
  })

  assert.equal(messages.length, 1)
})

test('detectAnomalies はバッチ失敗を検知する', () => {
  const messages = detectAnomalies({
    tenantOps: [tenantOps()],
    sources: [{ name: 'J-グランツAPI', last_fetched_at: '2026-08-06T00:00:00.000Z' }],
    failedBatchCount: 2,
    now: '2026-08-07T00:00:00.000Z',
  })

  assert.deepEqual(messages, ['バッチ失敗: 直近で 2 件の失敗がある'])
})

test('detectAnomalies は異常が無ければ空配列を返す', () => {
  const messages = detectAnomalies({
    tenantOps: [tenantOps()],
    sources: [{ name: 'J-グランツAPI', last_fetched_at: '2026-08-06T00:00:00.000Z' }],
    failedBatchCount: 0,
    now: '2026-08-07T00:00:00.000Z',
  })

  assert.deepEqual(messages, [])
})
