/**
 * 助成金情報配信のドメイン型。
 * DB 行（snake_case）との変換は各リポジトリ層が担う。
 */

/** AI 適合判定。配信対象は「適合」「要確認」で、「不適合」は除外する */
export type Verdict = '適合' | '要確認' | '不適合'

/** 配信頻度。既定は週次 */
export type DeliveryFrequency = 'weekly' | 'monthly'

/** バッチのステップ */
export type BatchStep = 'collect' | 'match' | 'deliver'

/** 申請進捗ステータス */
export type ApplicationStatus = '検討中' | '申請準備' | '申請済み' | '見送り'

/** AI 適合判定の結果 */
export interface MatchResult {
  verdict: Verdict
  /** 0.000–1.000 */
  confidence: number
  reasons: string[]
  matchedConditions: string[]
  unclearPoints: string[]
}

// ---------------------------------------------------------------------------
// 収集（collect）
// ---------------------------------------------------------------------------

/** 正規化済みの助成金。grants に upsert する */
export interface CollectedGrant {
  sourceId: string
  /** ソース側の一意ID（J-グランツの subsidy id） */
  externalId: string
  /** 出典URL + タイトル正規化のハッシュ */
  normalizedKey: string
  title: string
  /** 発行主体（国／都道府県／市区町村） */
  issuer: string | null
  /** 地域コード（JIS X 0401/0402）。現状は未使用（null） */
  regionCode: string | null
  /** 生の対象地域文字列（例:「全国」「東京都」） */
  targetArea: string | null
  summary: string | null
  /** HTML から抽出した本文テキスト */
  detailText: string
  /** 本文ハッシュ（更新検知用） */
  bodyHash: string
  maxAmount: number | null
  subsidyRate: string | null
  industry: string | null
  targetEmployees: string | null
  /** ISO8601(UTC) 文字列、または不明時 null */
  acceptanceStartAt: string | null
  acceptanceEndAt: string | null
  externalUrl: string
}

// ---------------------------------------------------------------------------
// マッチング（match）
// ---------------------------------------------------------------------------

/** テナントの配信条件（grant_tenant_conditions の正規化形） */
export interface TenantCondition {
  tenantId: string
  industries: string[]
  employeeCount: number | null
  capital: number | null
  prefectures: string[]
  categories: string[]
  keywords: string | null
  notifyEmails: string[]
  deliveryFrequency: DeliveryFrequency
}

/** マッチング対象の助成金（判定に必要な部分集合） */
export interface CandidateGrant {
  id: string
  title: string
  issuer: string | null
  targetArea: string | null
  summary: string | null
  detailText: string
  maxAmount: number | null
  industry: string | null
  targetEmployees: string | null
  acceptanceEndAt: string | null
  externalUrl: string
}

// ---------------------------------------------------------------------------
// 配信（deliver）
// ---------------------------------------------------------------------------

/** メールに載せる助成金（grants + grant_match_results の結合） */
export interface DeliverableGrant {
  grantId: string
  title: string
  summary: string | null
  issuer: string | null
  targetArea: string | null
  targetEmployees: string | null
  maxAmount: number | null
  subsidyRate: string | null
  /** 申請締切（ISO8601） */
  acceptanceEndAt: string | null
  externalUrl: string
  /** 情報取得日時（ISO8601）。出典明記に使う */
  fetchedAt: string
  /** 適合 or 要確認（不適合は配信対象外） */
  verdict: Verdict
  reasons: string[]
}
