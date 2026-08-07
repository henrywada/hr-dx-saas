import type { SupabaseClient } from '@supabase/supabase-js'
import type { DeliverableGrant, Verdict } from '@/features/grant-notifier/types'

/**
 * 配信ステップの DB 入出力（grant_match_results / grants / grant_deliveries）。
 * 読み書きは deliver バッチの service_role クライアント（RLS バイパス）で行う。
 */

/** 配信対象の判定。「不適合」は除外する */
const DELIVERABLE_VERDICTS: Verdict[] = ['適合', '要確認']

export interface MatchedGrant {
  grantId: string
  verdict: Verdict
  reasons: string[]
}

/** テナントの配信対象（適合／要確認）の判定結果を読み込む */
export async function loadMatchedGrants(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<MatchedGrant[]> {
  const { data, error } = await serviceClient
    .from('grant_match_results')
    .select('grant_id, verdict, reasons')
    .eq('tenant_id', tenantId)
    .in('verdict', DELIVERABLE_VERDICTS)

  if (error) {
    throw new Error(`配信対象の判定結果の取得に失敗しました: ${error.message}`)
  }

  return (data ?? []).map(row => ({
    grantId: row.grant_id,
    verdict: row.verdict as Verdict,
    reasons: Array.isArray(row.reasons)
      ? row.reasons.filter((r): r is string => typeof r === 'string')
      : [],
  }))
}

/** 既に配信済みの助成金IDの集合（重複送信の防止） */
export async function loadDeliveredGrantIds(
  serviceClient: SupabaseClient,
  tenantId: string
): Promise<Set<string>> {
  const { data, error } = await serviceClient
    .from('grant_deliveries')
    .select('grant_id')
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`配信済み助成金の取得に失敗しました: ${error.message}`)
  }
  return new Set((data ?? []).map(row => row.grant_id))
}

export interface GrantInfo {
  id: string
  title: string
  summary: string | null
  issuer: string | null
  target_area: string | null
  target_employees: string | null
  max_amount: number | null
  subsidy_rate: string | null
  acceptance_end_at: string | null
  external_url: string | null
  fetched_at: string
}

/** 指定IDの助成金本体を id→行のマップで返す。ids が空なら空マップ */
export async function loadGrantsByIds(
  serviceClient: SupabaseClient,
  ids: string[]
): Promise<Map<string, GrantInfo>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await serviceClient
    .from('grants')
    .select(
      'id, title, summary, issuer, target_area, target_employees, max_amount, subsidy_rate, acceptance_end_at, external_url, fetched_at'
    )
    .in('id', ids)

  if (error) {
    throw new Error(`助成金の取得に失敗しました: ${error.message}`)
  }

  return new Map((data ?? []).map(row => [row.id, row as GrantInfo]))
}

/** 未配信のマッチ結果と助成金本体を結合して DeliverableGrant にする */
export function assembleDeliverables(
  matches: MatchedGrant[],
  grantsById: Map<string, GrantInfo>
): DeliverableGrant[] {
  const result: DeliverableGrant[] = []

  for (const match of matches) {
    const g = grantsById.get(match.grantId)
    if (!g) continue

    result.push({
      grantId: g.id,
      title: g.title,
      summary: g.summary,
      issuer: g.issuer,
      targetArea: g.target_area,
      targetEmployees: g.target_employees,
      maxAmount: g.max_amount,
      subsidyRate: g.subsidy_rate,
      acceptanceEndAt: g.acceptance_end_at,
      externalUrl: g.external_url ?? '',
      fetchedAt: g.fetched_at,
      verdict: match.verdict,
      reasons: match.reasons,
    })
  }

  return result
}

/** 当月（monthStartIso 以降）に配信済みかどうか（月次頻度の判定用） */
export async function hasDeliveredThisMonth(
  serviceClient: SupabaseClient,
  tenantId: string,
  monthStartIso: string
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from('grant_deliveries')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('sent_at', monthStartIso)
    .limit(1)

  if (error) {
    throw new Error(`当月の配信有無の確認に失敗しました: ${error.message}`)
  }
  return (data ?? []).length > 0
}

/** 配信履歴を記録する。(tenant_id, grant_id) の重複は無視する（冪等） */
export async function recordDeliveries(
  serviceClient: SupabaseClient,
  tenantId: string,
  grantIds: string[],
  recipientCount: number,
  sentAt: string = new Date().toISOString()
): Promise<void> {
  if (grantIds.length === 0) return

  const rows = grantIds.map(grantId => ({
    tenant_id: tenantId,
    grant_id: grantId,
    recipient_count: recipientCount,
    // 同じ送信バッチであることをアーカイブ側が sent_at の一致で判別するため、
    // 行ごとの now() ではなく呼び出し側で決めた1つの時刻を全行に入れる
    sent_at: sentAt,
  }))

  const { error } = await serviceClient
    .from('grant_deliveries')
    .upsert(rows, { onConflict: 'tenant_id,grant_id', ignoreDuplicates: true })

  if (error) {
    throw new Error(`配信履歴の記録に失敗しました: ${error.message}`)
  }
}
