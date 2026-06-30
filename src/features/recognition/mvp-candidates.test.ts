import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMvpCandidateList,
  getPreviousMonthPeriodLabel,
  jstMonthRangeUtc,
  type MvpCandidateAggregate,
} from './mvp-candidates'

test('getPreviousMonthPeriodLabel: 先月を JST 基準で返す', () => {
  const label = getPreviousMonthPeriodLabel(new Date('2026-06-15T00:00:00+09:00'))
  assert.equal(label, '2026-05')
})

test('jstMonthRangeUtc: 月次範囲が JST 00:00 基準になる', () => {
  const { startIso, endIso } = jstMonthRangeUtc('2026-05')
  assert.equal(startIso, new Date('2026-05-01T00:00:00+09:00').toISOString())
  assert.equal(endIso, new Date('2026-06-01T00:00:00+09:00').toISOString())
})

test('buildMvpCandidateList: 受信件数順に並び、表彰済みフラグを付与する', () => {
  const aggregates: MvpCandidateAggregate[] = [
    {
      employee_id: 'a',
      employee_name: 'Alice',
      division_name: '営業部',
      received_count: 3,
      sender_ids: new Set(['s1', 's2']),
      value_tag_counts: new Map([['チームワーク', 2]]),
    },
    {
      employee_id: 'b',
      employee_name: 'Bob',
      division_name: '開発部',
      received_count: 5,
      sender_ids: new Set(['s1', 's2', 's3']),
      value_tag_counts: new Map(),
    },
  ]

  const result = buildMvpCandidateList(aggregates, '2026-05', new Set(['b']), 5)
  assert.equal(result[0].employee_id, 'b')
  assert.equal(result[0].received_count, 5)
  assert.equal(result[0].already_awarded, true)
  assert.equal(result[1].employee_id, 'a')
  assert.equal(result[1].already_awarded, false)
  assert.match(result[1].suggest_comment, /2026-05月間/)
})
