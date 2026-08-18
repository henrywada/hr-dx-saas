import assert from 'node:assert/strict'
import test from 'node:test'

import { callExternal, EXTERNAL_TIMEOUT_MS } from './external-call'

test('EXTERNAL_TIMEOUT_MS: 実測最遅1.4秒に対して十分な余裕がある', () => {
  assert.ok(EXTERNAL_TIMEOUT_MS >= 8000)
})

test('callExternal: 成功時は ok:true でデータを返す', async () => {
  const result = await callExternal('テスト', async () => ({ value: 1 }))
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.data, { value: 1 })
})

test('callExternal: 例外時は ok:false で upstream エラーを返し、例外を投げない', async t => {
  t.mock.method(console, 'error', () => {})

  const result = await callExternal(
    '厚労省通達検索',
    async () => {
      throw new Error('HTTP 503')
    },
    { sourceUrl: 'https://www.mhlw.go.jp/' }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.kind, 'upstream')
    assert.match(result.error.message, /厚労省通達検索/)
    assert.equal(result.error.sourceUrl, 'https://www.mhlw.go.jp/')
  }
})

test('callExternal: タイムアウト時は timeout エラーを返す', async t => {
  t.mock.method(console, 'error', () => {})

  const result = await callExternal(
    '安衛通達検索',
    () => new Promise(resolve => setTimeout(() => resolve('遅い'), 50)),
    { timeoutMs: 10 }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.kind, 'timeout')
    assert.match(result.error.message, /時間内に取得できませんでした/)
  }
})

test('callExternal: 失敗はサーバー側ログに出力される（握り潰さない）', async t => {
  let logged = false
  t.mock.method(console, 'error', () => {
    logged = true
  })

  await callExternal('テスト', async () => {
    throw new Error('boom')
  })

  assert.equal(logged, true)
})
