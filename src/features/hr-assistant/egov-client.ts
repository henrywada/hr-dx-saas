/**
 * e-Gov 法令API v2 クライアント（条文単位取得専用）
 * https://laws.e-gov.go.jp/api/2/swagger-ui
 *
 * elm パラメータで対象条文のみに絞り込んで取得する
 * （法令全文を取得する labor-law-mcp 方式より軽量・省トークン）。
 */

import type { EgovLawData } from './egov-types'

const EGOV_API_BASE = 'https://laws.e-gov.go.jp/api/2'
const MIN_REQUEST_INTERVAL_MS = 200
const REQUEST_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 60 * 60 * 1000

let lastRequestTime = 0

async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

type CacheEntry = { data: EgovLawData; expires: number }
/**
 * プロセス内キャッシュ（Vercel サーバーレスではウォームインスタンス間でのみ有効）。
 * 上限を超えたら最も古く追加したエントリから破棄する（Map は挿入順を保持する）。
 */
const CACHE_MAX_ENTRIES = 200
const cache = new Map<string, CacheEntry>()

function getCached(key: string): EgovLawData | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: EgovLawData): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS })
}

/**
 * 指定した法令・条番号の本文を e-Gov 法令API v2 から取得する。
 * 該当データが無い場合（未登録の条番号、または直近の改正で e-Gov 側の
 * データ反映が間に合っていない場合）は null を返す。
 */
export async function fetchArticleData(
  lawId: string,
  articleNum: string
): Promise<EgovLawData | null> {
  const cacheKey = `${lawId}:${articleNum}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const elm = `MainProvision-Article_${articleNum}`
  const params = new URLSearchParams({ elm, response_format: 'json' })
  const url = `${EGOV_API_BASE}/law_data/${lawId}?${params}`

  await rateLimit()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`e-Gov API タイムアウト (law_id: ${lawId}, article: ${articleNum})`)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }

  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`e-Gov API エラー: ${res.status} ${res.statusText} (law_id: ${lawId})`)
  }

  const data = (await res.json()) as EgovLawData
  setCached(cacheKey, data)
  return data
}

/** e-Gov の法令ページURLを生成する */
export function getEgovUrl(lawId: string): string {
  return `https://laws.e-gov.go.jp/law/${lawId}`
}
