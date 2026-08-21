import assert from 'node:assert/strict'
import test from 'node:test'
import { toOvertimeComplianceFeedItems } from './feed-provider'
import type { MyOvertimeWarningRow } from './queries'

function warning(overrides: Partial<MyOvertimeWarningRow>): MyOvertimeWarningRow {
  return {
    id: 'w-1',
    warning_type: 'overtime_45h_exceeded',
    created_at: '2026-08-15T00:00:00.000Z',
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toOvertimeComplianceFeedItems([]), [])
})

test('id をキーにdedupeKeyを生成し、残業申請画面へのリンクを持つ', () => {
  const items = toOvertimeComplianceFeedItems([warning({ id: 'xyz' })])
  assert.equal(items[0].dedupeKey, 'overtime_compliance:xyz')
  assert.equal(items[0].href, '/application')
})

test('月100時間超は critical、月45時間超は warning', () => {
  const critical = warning({ id: 'c', warning_type: 'overtime_100h_critical' })
  const warn = warning({ id: 'w', warning_type: 'overtime_45h_exceeded' })
  const items = toOvertimeComplianceFeedItems([critical, warn])
  assert.equal(items.find(i => i.dedupeKey === 'overtime_compliance:c')?.severity, 'critical')
  assert.equal(items.find(i => i.dedupeKey === 'overtime_compliance:w')?.severity, 'warning')
})

test('平均80時間超は warning', () => {
  const items = toOvertimeComplianceFeedItems([
    warning({ warning_type: 'overtime_avg80h_exceeded' }),
  ])
  assert.equal(items[0].severity, 'warning')
})

test('未知のwarning_typeでも汎用文言でフォールバックする', () => {
  const items = toOvertimeComplianceFeedItems([warning({ warning_type: 'unknown_type' })])
  assert.equal(items[0].title, '残業時間に関するアラートがあります')
})
