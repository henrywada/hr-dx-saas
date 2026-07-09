/** 収集対象を許可する公的ドメイン（末尾一致で判定） */
export const ALLOWED_DOMAINS = [
  'mhlw.go.jp',
  'jsite.mhlw.go.jp',
  'e-gov.go.jp',
  'nenkin.go.jp',
  'jil.go.jp',
]

export type SerpApiOrganicResult = {
  title: string
  link: string
  snippet?: string
}

/** 検索クエリに対する SerpAPI の organic_results 上位N件（許可ドメインのみ）を返す */
export async function searchSerpApi(
  apiKey: string,
  query: string,
  topN: number
): Promise<SerpApiOrganicResult[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'ja')
  url.searchParams.set('gl', 'jp')
  url.searchParams.set('tbs', 'qdr:m') // 直近1ヶ月
  url.searchParams.set('api_key', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`SerpAPI error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const results = (data.organic_results ?? []) as SerpApiOrganicResult[]

  return results
    .filter(r => {
      try {
        const host = new URL(r.link).hostname
        return ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))
      } catch {
        return false
      }
    })
    .slice(0, topN)
}

/** SerpAPI の残クエリ数を取得する（account.json エンドポイント） */
export async function getSerpApiSearchesLeft(apiKey: string): Promise<number | null> {
  const url = new URL('https://serpapi.com/account.json')
  url.searchParams.set('api_key', apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  return typeof data.plan_searches_left === 'number' ? data.plan_searches_left : null
}
