import assert from 'node:assert/strict'
import test from 'node:test'

import { INFO_BANK_MIN_SIMILARITY, INFO_BANK_RAG_THRESHOLD_CHUNKS } from './constants'
import { runSearch, type SearchDeps } from './search'
import type { InfoBankHit } from './types'

function hit(id: string, via: InfoBankHit['via'], score = 1): InfoBankHit {
  return { chunkId: id, documentId: 'd', title: 't', content: id, score, via }
}

interface Calls {
  text: string[][]
  rag: string[]
}

function makeDeps(opts: {
  chunkCount: number
  textHits?: InfoBankHit[]
  ragHits?: InfoBankHit[]
  ragError?: Error
}): { deps: SearchDeps; calls: Calls } {
  const calls: Calls = { text: [], rag: [] }
  const deps: SearchDeps = {
    countChunks: async () => opts.chunkCount,
    textSearch: async terms => {
      calls.text.push(terms)
      return opts.textHits ?? []
    },
    ragSearch: async question => {
      calls.rag.push(question)
      if (opts.ragError) throw opts.ragError
      return opts.ragHits ?? []
    },
  }
  return { deps, calls }
}

test('自動: チャンクが少なくテキストでヒットすればテキストのみ使う', async () => {
  const { deps, calls } = makeDeps({ chunkCount: 10, textHits: [hit('a', 'text')] })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'auto' })
  assert.equal(r.modeUsed, 'text')
  assert.deepEqual(
    r.hits.map(h => h.chunkId),
    ['a']
  )
  assert.equal(calls.rag.length, 0)
  assert.deepEqual(calls.text[0], ['育休', '申請方法'])
})

test('自動: テキストが 0 件なら RAG にフォールバックして hybrid になる', async () => {
  const { deps } = makeDeps({ chunkCount: 10, ragHits: [hit('r', 'rag', 0.9)] })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'auto' })
  assert.equal(r.modeUsed, 'hybrid')
  assert.deepEqual(
    r.hits.map(h => h.chunkId),
    ['r']
  )
})

test('自動: しきい値以上のチャンク数なら RAG を先に使う', async () => {
  const { deps, calls } = makeDeps({
    chunkCount: INFO_BANK_RAG_THRESHOLD_CHUNKS,
    ragHits: [hit('r', 'rag', 0.9)],
    textHits: [hit('t', 'text')],
  })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'auto' })
  assert.equal(r.modeUsed, 'rag')
  assert.equal(calls.text.length, 0)
})

test('自動: RAG が 0 件ならテキストにフォールバックする', async () => {
  const { deps } = makeDeps({
    chunkCount: INFO_BANK_RAG_THRESHOLD_CHUNKS + 1,
    textHits: [hit('t', 'text')],
  })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'auto' })
  assert.equal(r.modeUsed, 'hybrid')
  assert.deepEqual(
    r.hits.map(h => h.chunkId),
    ['t']
  )
})

test('自動: RAG の呼び出しが失敗してもテキストで答えられる', async () => {
  const { deps } = makeDeps({
    chunkCount: INFO_BANK_RAG_THRESHOLD_CHUNKS + 1,
    ragError: new Error('Gemini 失敗'),
    textHits: [hit('t', 'text')],
  })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'auto' })
  assert.deepEqual(
    r.hits.map(h => h.chunkId),
    ['t']
  )
})

test('明示指定のテキストはフォールバックしない', async () => {
  const { deps, calls } = makeDeps({ chunkCount: 5, ragHits: [hit('r', 'rag', 0.9)] })
  const r = await runSearch(deps, { question: '育休の申請方法は？', mode: 'text' })
  assert.equal(r.modeUsed, 'text')
  assert.deepEqual(r.hits, [])
  assert.equal(calls.rag.length, 0)
})

test('明示指定の RAG は失敗をそのまま伝える', async () => {
  const { deps } = makeDeps({ chunkCount: 5, ragError: new Error('Gemini 失敗') })
  await assert.rejects(() => runSearch(deps, { question: '育休', mode: 'rag' }), /Gemini 失敗/)
})

test('類似度がしきい値未満の RAG ヒットは捨てる', async () => {
  const { deps } = makeDeps({
    chunkCount: INFO_BANK_RAG_THRESHOLD_CHUNKS + 1,
    ragHits: [
      hit('low', 'rag', INFO_BANK_MIN_SIMILARITY - 0.01),
      hit('ok', 'rag', INFO_BANK_MIN_SIMILARITY),
    ],
  })
  const r = await runSearch(deps, { question: '育休', mode: 'rag' })
  assert.deepEqual(
    r.hits.map(h => h.chunkId),
    ['ok']
  )
})

test('質問から語が取れない（空白のみ）ときはテキスト検索を呼ばず 0 件', async () => {
  const { deps, calls } = makeDeps({ chunkCount: 5, textHits: [hit('a', 'text')] })
  const r = await runSearch(deps, { question: '  ？ ', mode: 'text' })
  assert.deepEqual(r.hits, [])
  assert.equal(calls.text.length, 0)
})
