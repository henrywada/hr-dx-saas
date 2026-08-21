import assert from 'node:assert/strict'
import test from 'node:test'
import { toKudosFeedItems } from './feed-provider'

const NOW = '2026-08-21T00:00:00.000Z'

test('件数0のときは何も返さない', () => {
  assert.deepEqual(toKudosFeedItems(0, NOW), [])
})

test('件数があればKudos一覧へのリンクを含むアイテムを返す', () => {
  const items = toKudosFeedItems(5, NOW)
  assert.equal(items.length, 1)
  assert.equal(items[0].href, '/kudos')
  assert.equal(items[0].severity, 'info')
  assert.equal(items[0].dedupeKey, 'kudos:recent')
  assert.match(items[0].body ?? '', /5件/)
})
