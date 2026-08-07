import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateGrant, MatchResult, TenantCondition } from '@/features/grant-notifier/types'

/**
 * マッチングステップの DB 入出力
 * （grant_tenant_conditions / grants / grant_match_results）。
 * 読み書きは match バッチの service_role クライアント（RLS バイパス）で行う。
 */

interface ConditionRow {
  tenant_id: string
  industries: unknown
  employee_count: number | null
  capital: number | null
  prefectures: unknown
  categories: unknown
  keywords: string | null
  notify_emails: unknown
  delivery_frequency: string
}

/** jsonb 列を文字列配列に正規化する（不正な値は落とす） */
function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/** grant_tenant_conditions 行を TenantCondition に正規化する */
export function toTenantCondition(row: ConditionRow): TenantCondition {
  return {
    tenantId: row.tenant_id,
    industries: toStringArray(row.industries),
    employeeCount: row.employee_count,
    capital: row.capital,
    prefectures: toStringArray(row.prefectures),
    categories: toStringArray(row.categories),
    keywords: row.keywords,
    notifyEmails: toStringArray(row.notify_emails),
    deliveryFrequency: row.delivery_frequency === 'monthly' ? 'monthly' : 'weekly',
  }
}

/** 条件が設定済みの全テナントの配信条件を読み込む */
export async function loadTenantConditions(
  serviceClient: SupabaseClient
): Promise<TenantCondition[]> {
  const { data, error } = await serviceClient
    .from('grant_tenant_conditions')
    .select(
      'tenant_id, industries, employee_count, capital, prefectures, categories, keywords, notify_emails, delivery_frequency'
    )

  if (error) {
    throw new Error(`配信条件の取得に失敗しました: ${error.message}`)
  }
  return (data ?? []).map(row => toTenantCondition(row as ConditionRow))
}

interface GrantRow {
  id: string
  title: string
  issuer: string | null
  target_area: string | null
  summary: string | null
  detail_text: string | null
  max_amount: number | null
  industry: string | null
  target_employees: string | null
  acceptance_end_at: string | null
  external_url: string | null
}

/** grants 行を CandidateGrant に正規化する */
export function toCandidateGrant(row: GrantRow): CandidateGrant {
  return {
    id: row.id,
    title: row.title,
    issuer: row.issuer,
    targetArea: row.target_area,
    summary: row.summary,
    detailText: row.detail_text ?? '',
    maxAmount: row.max_amount,
    industry: row.industry,
    targetEmployees: row.target_employees,
    acceptanceEndAt: row.acceptance_end_at,
    externalUrl: row.external_url ?? '',
  }
}

/** 募集中（締切なし、または締切が現在以降）の助成金を読み込む */
export async function loadCandidateGrants(
  serviceClient: SupabaseClient,
  nowIso: string = new Date().toISOString()
): Promise<CandidateGrant[]> {
  const { data, error } = await serviceClient
    .from('grants')
    .select(
      'id, title, issuer, target_area, summary, detail_text, max_amount, industry, target_employees, acceptance_end_at, external_url'
    )
    .or(`acceptance_end_at.is.null,acceptance_end_at.gte.${nowIso}`)

  if (error) {
    throw new Error(`判定対象の助成金の取得に失敗しました: ${error.message}`)
  }
  return (data ?? []).map(row => toCandidateGrant(row as GrantRow))
}

/** 既に判定済みの助成金IDの集合（再判定による AI コストを避けるため） */
export async function loadEvaluatedGrantIds(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<Set<string>> {
  const { data, error } = await serviceClient
    .from('grant_match_results')
    .select('grant_id')
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`判定済み助成金の取得に失敗しました: ${error.message}`)
  }
  return new Set((data ?? []).map(row => row.grant_id))
}

export interface UpsertMatchInput {
  tenantId: string
  grantId: string
  result: MatchResult
  model: string
}

/** grant_match_results を (tenant_id, grant_id) で upsert する */
export async function upsertMatchResult(
  serviceClient: SupabaseClient,
  input: UpsertMatchInput
): Promise<void> {
  const { error } = await serviceClient.from('grant_match_results').upsert(
    {
      tenant_id: input.tenantId,
      grant_id: input.grantId,
      verdict: input.result.verdict,
      confidence: input.result.confidence,
      reasons: input.result.reasons,
      matched_conditions: input.result.matchedConditions,
      unclear_points: input.result.unclearPoints,
      model: input.model,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,grant_id' }
  )

  if (error) {
    throw new Error(`判定結果の保存に失敗しました: ${error.message}`)
  }
}
