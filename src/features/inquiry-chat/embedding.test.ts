import assert from 'node:assert/strict'
import test from 'node:test'

import { embedChunks } from './embedding'

/** テスト用の最小 Gemini クライアント。contents をそのまま values に写像して返す。 */
function fakeClient(toValues: (chunk: string) => number[], opts?: { dropLastInBatch?: boolean }) {
  return {
    models: {
      embedContent: async ({ contents }: { contents: string[] }) => {
        let embeddings = contents.map(c => ({ values: toValues(c) }))
        if (opts?.dropLastInBatch) embeddings = embeddings.slice(0, -1)
        return { embeddings }
      },
    },
  }
}

test('embedChunks は入力順を保ったベクトルを返す（BATCH=64 を跨いでもズレない）', async () => {
  // 70 件 = 64 + 6 で 2 バッチに分かれる。順序が保たれれば out[i] は chunk i に対応する。
  const chunks = Array.from({ length: 70 }, (_, i) => String(i))
  const out = await embedChunks(
    chunks,
    fakeClient(c => [Number(c)])
  )

  assert.equal(out.length, chunks.length)
  for (let i = 0; i < chunks.length; i++) {
    assert.equal(out[i]![0], i, `index ${i} のベクトルが入力順とズレている`)
  }
})

test('返却件数が入力件数と一致しない場合は例外を投げる（桁ずれ防止）', async () => {
  const chunks = ['a', 'b', 'c']
  await assert.rejects(
    () =>
      embedChunks(
        chunks,
        fakeClient(() => [1], { dropLastInBatch: true })
      ),
    /件数/
  )
})

test('空配列は API を呼ばずに空配列を返す', async () => {
  let called = false
  const client = {
    models: {
      embedContent: async () => {
        called = true
        return { embeddings: [] }
      },
    },
  }
  const out = await embedChunks([], client)
  assert.deepEqual(out, [])
  assert.equal(called, false)
})
