import assert from 'node:assert/strict'
import test from 'node:test'

import { runIngest, type IngestRunnerActions } from './ingest-runner'

function makeActions(opts: {
  pendingTotal: number
  batches: Array<{ remaining: number; published: boolean } | Error>
  extractError?: string
}): { actions: IngestRunnerActions; log: string[] } {
  const log: string[] = []
  let i = 0
  const actions: IngestRunnerActions = {
    getProgress: async () => ({
      status: 'uploaded',
      errorMessage: null,
      pendingTotal: opts.pendingTotal,
      pendingRemaining: opts.pendingTotal,
    }),
    extract: async () => {
      log.push('extract')
      return opts.extractError
        ? { ok: false, error: opts.extractError }
        : { ok: true, chunkCount: 100 }
    },
    embedBatch: async () => {
      log.push('embed')
      const next = opts.batches[i++]
      if (next instanceof Error) return { ok: false, error: next.message }
      return { ok: true, ...next! }
    },
  }
  return { actions, log }
}

test('抽出前なら抽出してから、公開されるまで埋め込みを繰り返す', async () => {
  const { actions, log } = makeActions({
    pendingTotal: 0,
    batches: [
      { remaining: 40, published: false },
      { remaining: 0, published: true },
    ],
  })
  const r = await runIngest(actions, 'doc1')
  assert.deepEqual(r, { ok: true })
  assert.deepEqual(log, ['extract', 'embed', 'embed'])
})

test('チャンクが抽出済みなら抽出をやり直さず埋め込みから再開する', async () => {
  const { actions, log } = makeActions({
    pendingTotal: 100,
    batches: [{ remaining: 0, published: true }],
  })
  await runIngest(actions, 'doc1')
  assert.deepEqual(log, ['embed'])
})

test('抽出に失敗したらそこで止まり、エラーを返す', async () => {
  const { actions, log } = makeActions({
    pendingTotal: 0,
    batches: [],
    extractError: 'スキャン画像の可能性',
  })
  const r = await runIngest(actions, 'doc1')
  assert.deepEqual(r, { ok: false, error: 'スキャン画像の可能性' })
  assert.deepEqual(log, ['extract'])
})

test('埋め込みの途中で失敗したらエラーを返して止まる', async () => {
  const { actions, log } = makeActions({
    pendingTotal: 10,
    batches: [{ remaining: 5, published: false }, new Error('Gemini 失敗')],
  })
  const r = await runIngest(actions, 'doc1')
  assert.deepEqual(r, { ok: false, error: 'Gemini 失敗' })
  assert.deepEqual(log, ['embed', 'embed'])
})

test('進捗を呼び出し側へ通知する', async () => {
  const { actions } = makeActions({
    pendingTotal: 0,
    batches: [
      { remaining: 30, published: false },
      { remaining: 0, published: true },
    ],
  })
  const seen: string[] = []
  await runIngest(actions, 'doc1', p => seen.push(p.phase))
  assert.deepEqual(seen, ['extracting', 'embedding', 'done'])
})

test('進捗が取得できない資料は失敗にする', async () => {
  const { actions } = makeActions({ pendingTotal: 0, batches: [] })
  actions.getProgress = async () => null
  const r = await runIngest(actions, 'doc1')
  assert.equal(r.ok, false)
})

test('同じ残件数のまま進まない場合は無限ループせず失敗にする', async () => {
  const stuck = Array.from({ length: 50 }, () => ({ remaining: 7, published: false }))
  const { actions } = makeActions({ pendingTotal: 10, batches: stuck })
  const r = await runIngest(actions, 'doc1')
  assert.equal(r.ok, false)
})
