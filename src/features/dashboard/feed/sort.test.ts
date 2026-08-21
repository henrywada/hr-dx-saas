import assert from 'node:assert/strict'
import test from 'node:test'
import { sortFeedItems } from './sort'
import type { FeedItem } from './types'

function item(overrides: Partial<FeedItem>): FeedItem {
  return {
    dedupeKey: 'k',
    kind: 'system_notice',
    category: 'hr_announcement',
    severity: 'info',
    title: 't',
    body: null,
    actionLabel: null,
    href: null,
    occurredAt: '2026-08-01T00:00:00.000+09:00',
    dueDate: null,
    dismissible: true,
    isRead: false,
    ...overrides,
  }
}

test('未読を既読より先に並べる', () => {
  const read = item({ dedupeKey: 'read', isRead: true })
  const unread = item({ dedupeKey: 'unread', isRead: false })
  const result = sortFeedItems([read, unread])
  assert.deepEqual(
    result.map(i => i.dedupeKey),
    ['unread', 'read']
  )
})

test('severity順（critical > warning > action > info）で並べる', () => {
  const info = item({ dedupeKey: 'info', severity: 'info' })
  const critical = item({ dedupeKey: 'critical', severity: 'critical' })
  const action = item({ dedupeKey: 'action', severity: 'action' })
  const warning = item({ dedupeKey: 'warning', severity: 'warning' })
  const result = sortFeedItems([info, critical, action, warning])
  assert.deepEqual(
    result.map(i => i.dedupeKey),
    ['critical', 'warning', 'action', 'info']
  )
})

test('同severity内は dueDate が近い順', () => {
  const far = item({ dedupeKey: 'far', severity: 'warning', dueDate: '2026-09-01' })
  const near = item({ dedupeKey: 'near', severity: 'warning', dueDate: '2026-08-05' })
  const result = sortFeedItems([far, near])
  assert.deepEqual(
    result.map(i => i.dedupeKey),
    ['near', 'far']
  )
})

test('dueDate ありは dueDate なしより先', () => {
  const withDue = item({ dedupeKey: 'with-due', severity: 'warning', dueDate: '2026-08-05' })
  const noDue = item({ dedupeKey: 'no-due', severity: 'warning', dueDate: null })
  const result = sortFeedItems([noDue, withDue])
  assert.deepEqual(
    result.map(i => i.dedupeKey),
    ['with-due', 'no-due']
  )
})

test('dueDate がどちらもない場合は occurredAt が新しい順', () => {
  const older = item({ dedupeKey: 'older', occurredAt: '2026-08-01T00:00:00.000+09:00' })
  const newer = item({ dedupeKey: 'newer', occurredAt: '2026-08-10T00:00:00.000+09:00' })
  const result = sortFeedItems([older, newer])
  assert.deepEqual(
    result.map(i => i.dedupeKey),
    ['newer', 'older']
  )
})

test('入力配列を変更しない（イミュータブル）', () => {
  const items = [
    item({ dedupeKey: 'a', severity: 'info' }),
    item({ dedupeKey: 'b', severity: 'critical' }),
  ]
  const original = [...items]
  sortFeedItems(items)
  assert.deepEqual(items, original)
})
