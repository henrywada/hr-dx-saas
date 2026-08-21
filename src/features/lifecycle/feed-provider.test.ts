import assert from 'node:assert/strict'
import test from 'node:test'
import { toLifecycleFeedItems } from './feed-provider'
import type { PendingTaskRow } from './types'

function task(overrides: Partial<PendingTaskRow>): PendingTaskRow {
  return {
    task_id: 't-1',
    title: 'タスク',
    due_date: null,
    is_overdue: false,
    instance_employee_name: '山田太郎',
    lifecycle_type: 'onboarding',
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toLifecycleFeedItems([], 'employee'), [])
})

test('期限超過は warning、それ以外は action', () => {
  const items = toLifecycleFeedItems(
    [task({ task_id: 'a', is_overdue: true }), task({ task_id: 'b', is_overdue: false })],
    'employee'
  )
  assert.equal(items[0].severity, 'warning')
  assert.equal(items[1].severity, 'action')
})

test('管理可能なロールにはリンクとアクションラベルを付与する', () => {
  const items = toLifecycleFeedItems([task({})], 'hr')
  assert.equal(items[0].href, '/adm/lifecycle')
  assert.equal(items[0].actionLabel, '確認する')
})

test('管理できないロールにはリンクを出さない（既存挙動を維持）', () => {
  const items = toLifecycleFeedItems([task({})], 'employee')
  assert.equal(items[0].href, null)
  assert.equal(items[0].actionLabel, null)
})

test('task_id をキーにdedupeKeyを生成する', () => {
  const items = toLifecycleFeedItems([task({ task_id: 'xyz' })], 'employee')
  assert.equal(items[0].dedupeKey, 'lifecycle:xyz')
})

test('期限超過タスクのbodyには（期限超過）を明示する', () => {
  const items = toLifecycleFeedItems([task({ is_overdue: true })], 'employee')
  assert.match(items[0].body ?? '', /（期限超過）$/)
})

test('期限内タスクのbodyには（期限超過）を付けない', () => {
  const items = toLifecycleFeedItems([task({ is_overdue: false })], 'employee')
  assert.doesNotMatch(items[0].body ?? '', /期限超過/)
})
