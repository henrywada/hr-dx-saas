import assert from 'node:assert/strict'
import test from 'node:test'
import { toAnnouncementFeedItems } from './feed-provider'
import type { Announcement } from './types'

function announcement(overrides: Partial<Announcement>): Announcement {
  return {
    id: 'ann-1',
    dateLabel: '2026.08.21',
    publishedAt: '2026-08-21T00:00:00.000+09:00',
    title: 'タイトル',
    body: '本文',
    targetAudience: null,
    isNew: false,
    ...overrides,
  }
}

test('空配列なら空配列を返す', () => {
  assert.deepEqual(toAnnouncementFeedItems([]), [])
})

test('id をキーにdedupeKeyを生成し、詳細ページ未実装のためhrefはnull', () => {
  const items = toAnnouncementFeedItems([announcement({ id: 'abc' })])
  assert.equal(items[0].dedupeKey, 'announcement:abc')
  assert.equal(items[0].href, null)
  assert.equal(items[0].category, 'hr_announcement')
})

test('publishedAt を occurredAt として使う', () => {
  const items = toAnnouncementFeedItems([
    announcement({ publishedAt: '2026-08-15T00:00:00.000+09:00' }),
  ])
  assert.equal(items[0].occurredAt, '2026-08-15T00:00:00.000+09:00')
})
