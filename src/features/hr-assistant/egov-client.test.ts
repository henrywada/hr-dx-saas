import assert from 'node:assert/strict'
import test from 'node:test'

import { fetchArticleData, getEgovUrl } from './egov-client'
import type { EgovLawData } from './egov-types'

function makeArticleData(): EgovLawData {
  return {
    revision_info: { law_title: 'テスト法' },
    law_full_text: { tag: 'Article', attr: { Num: '1' }, children: [] },
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  })
}

test('getEgovUrl: law_id から e-Gov の法令ページURLを生成する', () => {
  assert.equal(getEgovUrl('322AC0000000049'), 'https://laws.e-gov.go.jp/law/322AC0000000049')
})

test('fetchArticleData: 200時はパースしたデータを返し、elm/response_formatを指定したURLでfetchする', async t => {
  let calledUrl: string | undefined
  t.mock.method(globalThis, 'fetch', async (url: string | URL) => {
    calledUrl = url.toString()
    return jsonResponse(200, makeArticleData())
  })

  const data = await fetchArticleData('LAW_A', '1')
  assert.ok(data)
  assert.equal(data!.law_full_text.tag, 'Article')
  assert.match(calledUrl!, /^https:\/\/laws\.e-gov\.go\.jp\/api\/2\/law_data\/LAW_A\?/)
  assert.match(calledUrl!, /elm=MainProvision-Article_1/)
  assert.match(calledUrl!, /response_format=json/)
})

test('fetchArticleData: 404時は null を返す（例外を投げない）', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(404, { code: '404004' }))

  const data = await fetchArticleData('LAW_B', '999')
  assert.equal(data, null)
})

test('fetchArticleData: 404/200以外のステータスは例外を投げる', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(500, { code: '500' }))

  await assert.rejects(() => fetchArticleData('LAW_C', '1'), /e-Gov API エラー: 500/)
})

test('fetchArticleData: タイムアウト（AbortError）時は専用メッセージの例外を投げる', async t => {
  t.mock.method(globalThis, 'fetch', async () => {
    const err = new Error('aborted')
    err.name = 'AbortError'
    throw err
  })

  await assert.rejects(() => fetchArticleData('LAW_D', '1'), /e-Gov API タイムアウト/)
})

test('fetchArticleData: 同一law_id・条番号の再取得はキャッシュを使い fetch を呼ばない', async t => {
  let callCount = 0
  t.mock.method(globalThis, 'fetch', async () => {
    callCount++
    return jsonResponse(200, makeArticleData())
  })

  const first = await fetchArticleData('LAW_E', '1')
  const second = await fetchArticleData('LAW_E', '1')

  assert.equal(callCount, 1)
  assert.deepEqual(first, second)
})
