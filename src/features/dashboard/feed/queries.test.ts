import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateSettledFeedItems, applyReadState, filterEnabledProviders } from './queries'
import type { FeedItem, RawFeedItem } from './types'
import type { FeedProvider } from './provider'

function rawItem(overrides: Partial<RawFeedItem>): RawFeedItem {
  return {
    dedupeKey: 'k',
    kind: 'system_notice',
    category: 'hr_announcement',
    severity: 'info',
    title: 't',
    body: null,
    actionLabel: null,
    href: null,
    occurredAt: '2026-08-01T00:00:00.000Z',
    dueDate: null,
    dismissible: true,
    ...overrides,
  }
}

function fakeProvider(key: string): FeedProvider {
  return { key, fetch: async () => [] }
}

test('filterEnabledProviders: visibleKeys が null なら全プロバイダを有効にする', () => {
  const providers = [fakeProvider('a'), fakeProvider('b')]
  assert.equal(filterEnabledProviders(providers, null).length, 2)
})

test('filterEnabledProviders: top.feed.<key> が visibleKeys に無いプロバイダは除外する', () => {
  const providers = [fakeProvider('a'), fakeProvider('b')]
  const enabled = filterEnabledProviders(providers, new Set(['top.feed.a']))
  assert.deepEqual(
    enabled.map(p => p.key),
    ['a']
  )
})

test('applyReadState: readKeys に含まれるdedupeKeyはisRead=trueになる', () => {
  const items = [rawItem({ dedupeKey: 'a' }), rawItem({ dedupeKey: 'b' })]
  const result = applyReadState(items, new Set(['a']))
  assert.equal(result.find(i => i.dedupeKey === 'a')?.isRead, true)
  assert.equal(result.find(i => i.dedupeKey === 'b')?.isRead, false)
})

test('aggregateSettledFeedItems: rejectしたプロバイダの結果は無視し、残りは正常に返す', () => {
  const settled: PromiseSettledResult<RawFeedItem[]>[] = [
    { status: 'fulfilled', value: [rawItem({ dedupeKey: 'ok', severity: 'critical' })] },
    { status: 'rejected', reason: new Error('boom') },
  ]
  const result = aggregateSettledFeedItems(settled, new Set())
  assert.equal(result.length, 1)
  assert.equal(result[0].dedupeKey, 'ok')
})

test('aggregateSettledFeedItems: limit省略時はFEED_LIMIT(6)件数を超える分を切り捨てる', () => {
  const many: RawFeedItem[] = Array.from({ length: 10 }, (_, i) =>
    rawItem({
      dedupeKey: `item-${i}`,
      occurredAt: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    })
  )
  const settled: PromiseSettledResult<RawFeedItem[]>[] = [{ status: 'fulfilled', value: many }]
  const result = aggregateSettledFeedItems(settled, new Set())
  assert.equal(result.length, 6)
})

test('aggregateSettledFeedItems: limitを指定するとその件数まで返す', () => {
  const many: RawFeedItem[] = Array.from({ length: 10 }, (_, i) =>
    rawItem({
      dedupeKey: `item-${i}`,
      occurredAt: `2026-08-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    })
  )
  const settled: PromiseSettledResult<RawFeedItem[]>[] = [{ status: 'fulfilled', value: many }]
  const result = aggregateSettledFeedItems(settled, new Set(), 100)
  assert.equal(result.length, 10)
})

test('aggregateSettledFeedItems: 全プロバイダがrejectしても空配列を返す（例外を投げない）', () => {
  const settled: PromiseSettledResult<RawFeedItem[]>[] = [
    { status: 'rejected', reason: new Error('boom') },
  ]
  const result: FeedItem[] = aggregateSettledFeedItems(settled, new Set())
  assert.deepEqual(result, [])
})
