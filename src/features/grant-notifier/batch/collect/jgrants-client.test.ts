import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createJGrantsClient,
  detailPageUrl,
  parseJGrantsDate,
  toCollectedGrant,
  type FetchLike,
  type JGrantsDetail,
} from '@/features/grant-notifier/batch/collect/jgrants-client'

const SAMPLE_DETAIL: JGrantsDetail = {
  id: 'a0WJ200000CDaLwMAL',
  title: '令和8年度排出削減が困難な産業におけるエネルギー・製造プロセス転換支援事業',
  detail: '<div>■目的・概要 現実的なCNに向けた取組を推進する</div>',
  subsidy_catch_phrase: '産業競争力強化を支援する',
  target_area_search: '全国',
  target_number_of_employees: '従業員数の制約なし',
  subsidy_rate: null,
  subsidy_max_limit: 0,
  industry: '製造業',
  acceptance_start_datetime: '2026-06-08T15:00:00.000Z',
  acceptance_end_datetime: '2026-08-07T03:00:00.000Z',
  front_subsidy_detail_page_url: 'https://www.jgrants-portal.go.jp/subsidy/a0WJ200000CDaLwMAL',
  institution_name: null,
}

/** 呼び出しURLを記録する fetch のスタブ */
function stubFetch(
  responses: { ok: boolean; status: number; payload: unknown }[]
): FetchLike & { calls: string[] } {
  const calls: string[] = []
  let index = 0
  const impl = ((url: string) => {
    calls.push(url)
    const res = responses[Math.min(index, responses.length - 1)]
    index += 1
    return Promise.resolve({
      ok: res.ok,
      status: res.status,
      json: () => Promise.resolve(res.payload),
    })
  }) as FetchLike & { calls: string[] }
  impl.calls = calls
  return impl
}

function okFetch(payload: unknown) {
  return stubFetch([{ ok: true, status: 200, payload }])
}

test('parseJGrantsDate はミリ秒付き ISO8601 を正規化する', () => {
  assert.equal(parseJGrantsDate('2026-06-08T15:00:00.000Z'), '2026-06-08T15:00:00.000Z')
})

test('parseJGrantsDate は詳細エンドポイントの短縮 Z 形式を正規化する', () => {
  assert.equal(parseJGrantsDate('2026-08-07T03:00Z'), '2026-08-07T03:00:00.000Z')
})

test('parseJGrantsDate は空・不正な入力に null を返す', () => {
  assert.equal(parseJGrantsDate(null), null)
  assert.equal(parseJGrantsDate(''), null)
  assert.equal(parseJGrantsDate('not-a-date'), null)
})

test('detailPageUrl は公式URLがあればそれを使う', () => {
  assert.equal(
    detailPageUrl(SAMPLE_DETAIL),
    'https://www.jgrants-portal.go.jp/subsidy/a0WJ200000CDaLwMAL'
  )
})

test('detailPageUrl は公式URLが無ければ id から組み立てる', () => {
  assert.equal(
    detailPageUrl({ ...SAMPLE_DETAIL, front_subsidy_detail_page_url: null }),
    'https://www.jgrants-portal.go.jp/subsidy/a0WJ200000CDaLwMAL'
  )
})

test('toCollectedGrant は J-グランツ詳細を CollectedGrant に変換する', () => {
  const grant = toCollectedGrant(SAMPLE_DETAIL, 'src-1')

  assert.equal(grant.sourceId, 'src-1')
  assert.equal(grant.externalId, 'a0WJ200000CDaLwMAL')
  assert.equal(grant.issuer, '国')
  assert.equal(grant.targetArea, '全国')
  assert.equal(grant.summary, '産業競争力強化を支援する')
  assert.equal(grant.detailText, '■目的・概要 現実的なCNに向けた取組を推進する')
  assert.equal(grant.maxAmount, 0)
  assert.equal(grant.industry, '製造業')
  assert.equal(grant.targetEmployees, '従業員数の制約なし')
  assert.equal(grant.acceptanceStartAt, '2026-06-08T15:00:00.000Z')
  assert.equal(grant.acceptanceEndAt, '2026-08-07T03:00:00.000Z')
  assert.match(grant.normalizedKey, /^[0-9a-f]{64}$/)
  assert.match(grant.bodyHash, /^[0-9a-f]{64}$/)
})

test('toCollectedGrant は institution_name があれば発行主体に使う', () => {
  const grant = toCollectedGrant({ ...SAMPLE_DETAIL, institution_name: '東京都' }, 'src-1')

  assert.equal(grant.issuer, '東京都')
})

test('searchSubsidies は result 配列を返し、想定どおりのURLを叩く', async () => {
  const fetchImpl = okFetch({
    metadata: { resultset: { count: 1 } },
    result: [{ id: 'a0WJ200000CDaLwMAL', title: 'サンプル助成金' }],
  })
  const client = createJGrantsClient({ baseUrl: 'https://api.example/public', fetchImpl })

  const items = await client.searchSubsidies('雇用')

  assert.equal(items.length, 1)
  assert.equal(items[0]?.id, 'a0WJ200000CDaLwMAL')
  assert.deepEqual(fetchImpl.calls, [
    'https://api.example/public/subsidies?keyword=%E9%9B%87%E7%94%A8&sort=created_date&order=DESC&acceptance=1',
  ])
})

test('searchSubsidies は result が null のとき空配列を返す', async () => {
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl: okFetch({ result: null }),
  })

  assert.deepEqual(await client.searchSubsidies('育成'), [])
})

test('searchSubsidies は 2xx 以外で例外を投げる', async () => {
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl: stubFetch([{ ok: false, status: 400, payload: {} }]),
  })

  await assert.rejects(() => client.searchSubsidies('x'), /HTTP 400/)
})

test('searchSubsidies は 429 でリトライして成功する', async () => {
  const fetchImpl = stubFetch([
    { ok: false, status: 429, payload: {} },
    { ok: true, status: 200, payload: { result: [{ id: 'x', title: 't' }] } },
  ])
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl,
    maxRetries: 2,
    retryDelayMs: 0,
  })

  const items = await client.searchSubsidies('雇用')

  assert.equal(items.length, 1)
  assert.equal(fetchImpl.calls.length, 2)
})

test('searchSubsidies は 429 以外の 4xx をリトライしない', async () => {
  const fetchImpl = stubFetch([{ ok: false, status: 404, payload: {} }])
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl,
    maxRetries: 3,
    retryDelayMs: 0,
  })

  await assert.rejects(() => client.searchSubsidies('x'), /HTTP 404/)
  assert.equal(fetchImpl.calls.length, 1)
})

test('getSubsidyDetail は先頭の詳細を返す', async () => {
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl: okFetch({ result: [SAMPLE_DETAIL] }),
  })

  const detail = await client.getSubsidyDetail('a0WJ200000CDaLwMAL')

  assert.equal(detail?.id, 'a0WJ200000CDaLwMAL')
})

test('getSubsidyDetail は該当なしのとき null を返す', async () => {
  const client = createJGrantsClient({
    baseUrl: 'https://api.example/public',
    fetchImpl: okFetch({ result: [] }),
  })

  assert.equal(await client.getSubsidyDetail('missing'), null)
})
