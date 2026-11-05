import assert from 'node:assert/strict'
import test from 'node:test'

import { decideSearchMode } from './router'
import { mergeByRrf } from './merge'
import type { InfoBankHit } from './types'

function hit(id: string, via: InfoBankHit['via'], score = 1): InfoBankHit {
  return { chunkId: id, documentId: 'd', title: 't', content: id, score, via }
}

test('自動モードは 299 件ならテキスト、300 件なら RAG', () => {
  assert.equal(decideSearchMode({ requested: 'auto', currentChunkCount: 299 }), 'text')
  assert.equal(decideSearchMode({ requested: 'auto', currentChunkCount: 300 }), 'rag')
})

test('明示指定は件数に関わらず尊重する', () => {
  assert.equal(decideSearchMode({ requested: 'rag', currentChunkCount: 0 }), 'rag')
  assert.equal(decideSearchMode({ requested: 'text', currentChunkCount: 99999 }), 'text')
})

test('両方で見つかったチャンクは both になり先頭に来る', () => {
  const merged = mergeByRrf(
    [hit('a', 'text'), hit('b', 'text')],
    [hit('b', 'rag'), hit('c', 'rag')]
  )
  assert.equal(merged[0]?.chunkId, 'b')
  assert.equal(merged[0]?.via, 'both')
})

test('件数上限を守る', () => {
  const text = Array.from({ length: 10 }, (_, i) => hit(`t${i}`, 'text'))
  assert.equal(mergeByRrf(text, [], 60, 4).length, 4)
})

test('片方が空でももう片方をそのまま返す', () => {
  assert.deepEqual(
    mergeByRrf([], [hit('x', 'rag')]).map(h => h.chunkId),
    ['x']
  )
})
