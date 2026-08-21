import assert from 'node:assert/strict'
import test from 'node:test'
import { toOneOnOneFeedItems } from './feed-provider'
import type { UpcomingOneOnOneRow } from './types'

function row(overrides: Partial<UpcomingOneOnOneRow>): UpcomingOneOnOneRow {
  return {
    id: 'o-1',
    manager_id: 'm-1',
    manager_name: '田中部長',
    employee_id: 'e-1',
    employee_name: '山田太郎',
    scheduled_at: '2026-08-25T01:00:00.000Z',
    theme: 'キャリア相談',
    agenda: null,
    reminded_at: null,
    status: 'scheduled',
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toOneOnOneFeedItems([], '2026-08-20'), [])
})

test('id をキーにdedupeKeyとリンクを生成する', () => {
  const items = toOneOnOneFeedItems([row({ id: 'xyz' })], '2026-08-20')
  assert.equal(items[0].dedupeKey, 'one_on_one:xyz')
  assert.equal(items[0].href, '/my-one-on-one')
})

test('3日以内に迫っていれば warning、それ以外は info', () => {
  const near = row({ id: 'near', scheduled_at: '2026-08-22T01:00:00.000Z' })
  const far = row({ id: 'far', scheduled_at: '2026-09-01T01:00:00.000Z' })
  const items = toOneOnOneFeedItems([near, far], '2026-08-20')
  assert.equal(items.find(i => i.dedupeKey === 'one_on_one:near')?.severity, 'warning')
  assert.equal(items.find(i => i.dedupeKey === 'one_on_one:far')?.severity, 'info')
})

test('テーマをbodyに使う', () => {
  const items = toOneOnOneFeedItems([row({ theme: '目標設定について' })], '2026-08-20')
  assert.equal(items[0].body, '目標設定について')
})

test('scheduled_at の日付をdueDateに使う', () => {
  const items = toOneOnOneFeedItems(
    [row({ scheduled_at: '2026-08-25T01:00:00.000Z' })],
    '2026-08-20'
  )
  assert.equal(items[0].dueDate, '2026-08-25')
})
