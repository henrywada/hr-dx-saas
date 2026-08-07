import { z } from 'zod'
import type { CollectedGrant } from '@/features/grant-notifier/types'
import {
  buildNormalizedKey,
  computeBodyHash,
  htmlToText,
} from '@/features/grant-notifier/batch/collect/normalize'

/**
 * J-グランツAPI クライアント（公開API・APIキー不要）。
 *
 * 検索 GET {base}/subsidies?keyword=<2文字以上>&sort=created_date&order=DESC&acceptance=1
 * 詳細 GET {base}/subsidies/id/{id}
 */

/**
 * 検索の種キーワード（J-グランツAPI は2文字以上必須）。
 * 関心カテゴリを広めにカバーする。結果は id で重複排除するため、
 * キーワード間で結果が重なっても問題ない。
 */
export const KEYWORDS: readonly string[] = [
  '雇用',
  '育成',
  '人材',
  '設備投資',
  'IT導入',
  '両立支援',
  '省エネ',
  '創業',
]

const searchItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
})

const searchResponseSchema = z.object({
  metadata: z.object({ resultset: z.object({ count: z.number() }).optional() }).optional(),
  result: z.array(searchItemSchema).nullable().optional(),
})

const detailItemSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  detail: z.string().nullable().optional(),
  subsidy_catch_phrase: z.string().nullable().optional(),
  target_area_search: z.string().nullable().optional(),
  target_number_of_employees: z.string().nullable().optional(),
  subsidy_rate: z.string().nullable().optional(),
  subsidy_max_limit: z.number().nullable().optional(),
  industry: z.string().nullable().optional(),
  acceptance_start_datetime: z.string().nullable().optional(),
  acceptance_end_datetime: z.string().nullable().optional(),
  front_subsidy_detail_page_url: z.string().nullable().optional(),
  institution_name: z.string().nullable().optional(),
})

const detailResponseSchema = z.object({
  result: z.array(detailItemSchema).nullable().optional(),
})

export type JGrantsSearchItem = z.infer<typeof searchItemSchema>
export type JGrantsDetail = z.infer<typeof detailItemSchema>

/** テストでモックできるよう fetch は最小限のインターフェースに絞る */
export type FetchLike = (url: string) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

export interface JGrantsClientOptions {
  baseUrl: string
  fetchImpl?: FetchLike
  /** リクエスト前の待機(ms)。公開API礼儀・レート制限回避。既定 0（テスト用） */
  requestDelayMs?: number
  /** 429/5xx のリトライ回数。既定 3 */
  maxRetries?: number
  /** リトライ基準待機(ms)。試行ごとに線形増加。既定 1000 */
  retryDelayMs?: number
}

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** J-グランツの日時文字列を ISO8601(UTC) に正規化する。不正・空は null */
export function parseJGrantsDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/** 公式詳細ページURL。front_subsidy_detail_page_url が無ければ id から組み立てる */
export function detailPageUrl(detail: JGrantsDetail): string {
  return (
    detail.front_subsidy_detail_page_url ?? `https://www.jgrants-portal.go.jp/subsidy/${detail.id}`
  )
}

/** J-グランツ詳細レスポンスを CollectedGrant に変換する */
export function toCollectedGrant(detail: JGrantsDetail, sourceId: string): CollectedGrant {
  const externalUrl = detailPageUrl(detail)
  const detailText = htmlToText(detail.detail ?? '')

  return {
    sourceId,
    externalId: detail.id,
    normalizedKey: buildNormalizedKey(externalUrl, detail.title),
    title: detail.title,
    // J-グランツは国の補助金ポータル。提供主体名があればそれを、無ければ「国」とする
    issuer: detail.institution_name ?? '国',
    regionCode: null,
    targetArea: detail.target_area_search ?? null,
    summary: detail.subsidy_catch_phrase ?? null,
    detailText,
    bodyHash: computeBodyHash(detailText),
    maxAmount: detail.subsidy_max_limit ?? null,
    subsidyRate: detail.subsidy_rate ?? null,
    industry: detail.industry ?? null,
    targetEmployees: detail.target_number_of_employees ?? null,
    acceptanceStartAt: parseJGrantsDate(detail.acceptance_start_datetime),
    acceptanceEndAt: parseJGrantsDate(detail.acceptance_end_datetime),
    externalUrl,
  }
}

export interface JGrantsClient {
  /** キーワード検索（acceptance=1: 募集中のみ）。結果配列を返す */
  searchSubsidies(keyword: string): Promise<JGrantsSearchItem[]>
  /** 詳細取得。該当なしは null */
  getSubsidyDetail(id: string): Promise<JGrantsDetail | null>
}

export function createJGrantsClient(options: JGrantsClientOptions): JGrantsClient {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike)
  const base = options.baseUrl.replace(/\/+$/, '')
  const requestDelayMs = options.requestDelayMs ?? 0
  const maxRetries = options.maxRetries ?? 3
  const retryDelayMs = options.retryDelayMs ?? 1000

  async function getJson(url: string): Promise<unknown> {
    for (let attempt = 0; ; attempt += 1) {
      if (requestDelayMs > 0) await sleep(requestDelayMs)
      const res = await fetchImpl(url)
      if (res.ok) return res.json()

      // 429(レート制限) / 5xx は一時的とみなしバックオフして再試行する
      const retryable = res.status === 429 || res.status >= 500
      if (retryable && attempt < maxRetries) {
        await sleep(retryDelayMs * (attempt + 1))
        continue
      }
      throw new Error(`J-Grants API request failed: HTTP ${res.status} (${url})`)
    }
  }

  return {
    async searchSubsidies(keyword: string): Promise<JGrantsSearchItem[]> {
      const url = `${base}/subsidies?keyword=${encodeURIComponent(
        keyword
      )}&sort=created_date&order=DESC&acceptance=1`
      const parsed = searchResponseSchema.parse(await getJson(url))
      return parsed.result ?? []
    },

    async getSubsidyDetail(id: string): Promise<JGrantsDetail | null> {
      const url = `${base}/subsidies/id/${encodeURIComponent(id)}`
      const parsed = detailResponseSchema.parse(await getJson(url))
      return parsed.result?.[0] ?? null
    },
  }
}

/**
 * バッチ実行用のクライアント。公開APIへの礼儀とレート制限(429)回避のため
 * リクエスト間に待機を入れ、429/5xx はバックオフ再試行する。
 */
export function defaultJGrantsClient(baseUrl: string): JGrantsClient {
  return createJGrantsClient({
    baseUrl,
    requestDelayMs: 350,
    maxRetries: 4,
    retryDelayMs: 2000,
  })
}
