import assert from 'node:assert/strict'
import test from 'node:test'

import { EGOV_API_V2_BASE, fetchLawRevisions } from './egov-revision'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const SAMPLE = {
  law_info: {
    law_id: '322AC0000000049',
    law_num: '昭和二十二年法律第四十九号',
    promulgation_date: '1947-04-07',
  },
  revisions: [
    {
      law_revision_id: '322AC0000000049_20281223_508AC0000000046',
      law_title: '労働基準法',
      abbrev: '労基法',
      amendment_promulgate_date: '2026-06-12',
      amendment_law_num: '令和八年法律第四十六号',
    },
  ],
}

test('fetchLawRevisions: v2 の law_revisions エンドポイントを law_id で叩く', async t => {
  let calledUrl = ''
  t.mock.method(globalThis, 'fetch', async (url: string | URL) => {
    calledUrl = url.toString()
    return jsonResponse(200, SAMPLE)
  })

  await fetchLawRevisions('322AC0000000049')
  assert.equal(calledUrl, `${EGOV_API_V2_BASE}/law_revisions/322AC0000000049`)
})

test('fetchLawRevisions: 改正履歴を ResearchHit へ写像する', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(200, SAMPLE))

  const hits = await fetchLawRevisions('322AC0000000049')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '322AC0000000049_20281223_508AC0000000046')
  assert.equal(hits[0].title, '労働基準法')
  assert.equal(hits[0].identifier, '令和八年法律第四十六号')
  assert.equal(hits[0].dateLabel, '2026-06-12')
  assert.equal(hits[0].sourceUrl, 'https://laws.e-gov.go.jp/law/322AC0000000049')
  assert.deepEqual(hits[0].ref, { kind: 'law_toc', lawName: '労働基準法' })
})

test('fetchLawRevisions: revisions が無い場合は空配列を返す', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(200, { law_info: SAMPLE.law_info }))

  const hits = await fetchLawRevisions('322AC0000000049')
  assert.deepEqual(hits, [])
})

test('fetchLawRevisions: 非200は例外を投げる（callExternal 側で分類させる）', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(500, {}))

  await assert.rejects(() => fetchLawRevisions('322AC0000000049'), /500/)
})
