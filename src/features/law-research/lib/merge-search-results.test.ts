import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeSearchResults } from './merge-search-results'
import type { ResearchError, ResearchHit, ResearchResult } from '../types'

function hit(id: string): ResearchHit {
  return {
    id,
    title: id,
    identifier: '',
    dateLabel: '',
    summary: '',
    ref: { kind: 'law_toc', lawName: id },
    sourceUrl: 'https://example.test',
  }
}

const timeout: ResearchError = { kind: 'timeout', message: 'timed out' }

test('成功した結果を結合し、失敗したソースは捨てる', () => {
  const results: ResearchResult<ResearchHit[]>[] = [
    { ok: true, data: [hit('a')] },
    { ok: false, error: timeout },
    { ok: true, data: [hit('b')] },
  ]
  const merged = mergeSearchResults(results)
  assert.equal(merged.ok, true)
  if (merged.ok) {
    assert.deepEqual(
      merged.data.map(h => h.id),
      ['a', 'b']
    )
  }
})

test('すべて失敗したとき最初のエラーを返す', () => {
  const results: ResearchResult<ResearchHit[]>[] = [
    { ok: false, error: timeout },
    { ok: false, error: { kind: 'upstream', message: 'upstream' } },
  ]
  const merged = mergeSearchResults(results)
  assert.equal(merged.ok, false)
  if (!merged.ok) assert.equal(merged.error.kind, 'timeout')
})

test('成功がすべて空配列なら空の成功を返す', () => {
  const merged = mergeSearchResults([{ ok: true, data: [] }])
  assert.equal(merged.ok, true)
  if (merged.ok) assert.equal(merged.data.length, 0)
})

test('同じ id の行は重複させない', () => {
  const merged = mergeSearchResults([
    { ok: true, data: [hit('a'), hit('b')] },
    { ok: true, data: [hit('a')] },
  ])
  assert.equal(merged.ok, true)
  if (merged.ok) {
    assert.deepEqual(
      merged.data.map(h => h.id),
      ['a', 'b']
    )
  }
})
