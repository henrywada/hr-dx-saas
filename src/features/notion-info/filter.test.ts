import assert from 'node:assert/strict'
import test from 'node:test'

import { filterExpiredGrants, sortByCollectedAtDesc } from './filter'
import type { NotionInfoItem } from './types'

function item(overrides: Partial<NotionInfoItem>): NotionInfoItem {
  return {
    id: 'id',
    collectedAt: null,
    title: 't',
    summary: '',
    url: null,
    body: '',
    amount: null,
    openDate: null,
    deadline: null,
    category: null,
    ...overrides,
  }
}

test('募集期限が今日より前なら除外し、当日・未来・未設定は残す', () => {
  const rows = [
    item({ id: 'past', deadline: '2026-09-12' }),
    item({ id: 'today', deadline: '2026-09-13' }),
    item({ id: 'future', deadline: '2026-09-14' }),
    item({ id: 'none', deadline: null }),
  ]
  const kept = filterExpiredGrants(rows, '2026-09-13').map(r => r.id)
  assert.deepEqual(kept, ['today', 'future', 'none'])
})

test('募集期限が空文字列なら未設定として残す', () => {
  const rows = [
    item({ id: 'empty', deadline: '' }),
    item({ id: 'past', deadline: '2026-09-12' }),
  ]
  const kept = filterExpiredGrants(rows, '2026-09-13').map(r => r.id)
  assert.deepEqual(kept, ['empty'])
})

test('収集日時の降順。null は末尾', () => {
  const rows = [
    item({ id: 'b', collectedAt: '2026-08-02T00:00:00.000Z' }),
    item({ id: 'null', collectedAt: null }),
    item({ id: 'a', collectedAt: '2026-08-01T00:00:00.000Z' }),
  ]
  assert.deepEqual(
    sortByCollectedAtDesc(rows).map(r => r.id),
    ['b', 'a', 'null']
  )
})
