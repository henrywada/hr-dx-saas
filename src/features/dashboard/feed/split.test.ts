import assert from 'node:assert/strict'
import test from 'node:test'
import { splitFeedItemsByKind } from './split'
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

test('kind=system_notice を noticeItems に振り分ける', () => {
  const notice = item({ dedupeKey: 'notice', kind: 'system_notice' })
  const result = splitFeedItemsByKind([notice])
  assert.deepEqual(
    result.noticeItems.map(i => i.dedupeKey),
    ['notice']
  )
  assert.deepEqual(result.actionItems, [])
})

test('kind=action_prompt を actionItems に振り分ける', () => {
  const action = item({ dedupeKey: 'action', kind: 'action_prompt' })
  const result = splitFeedItemsByKind([action])
  assert.deepEqual(
    result.actionItems.map(i => i.dedupeKey),
    ['action']
  )
  assert.deepEqual(result.noticeItems, [])
})

test('混在した配列を元の順序を保ったまま2グループに振り分ける', () => {
  const a = item({ dedupeKey: 'a', kind: 'system_notice' })
  const b = item({ dedupeKey: 'b', kind: 'action_prompt' })
  const c = item({ dedupeKey: 'c', kind: 'system_notice' })
  const result = splitFeedItemsByKind([a, b, c])
  assert.deepEqual(
    result.noticeItems.map(i => i.dedupeKey),
    ['a', 'c']
  )
  assert.deepEqual(
    result.actionItems.map(i => i.dedupeKey),
    ['b']
  )
})

test('空配列を渡すと両方とも空配列を返す', () => {
  const result = splitFeedItemsByKind([])
  assert.deepEqual(result.noticeItems, [])
  assert.deepEqual(result.actionItems, [])
})
