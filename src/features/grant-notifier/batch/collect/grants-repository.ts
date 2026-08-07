import type { SupabaseClient } from '@supabase/supabase-js'
import type { CollectedGrant } from '@/features/grant-notifier/types'

/**
 * grants / grant_versions（助成金マスタ・横断）の読み書き。
 * normalized_key で照会し、body_hash の差分で新着／更新を判定する。
 * 書込は service_role クライアント（RLS バイパス、collect バッチ限定）で行う。
 */

interface GrantRow {
  source_id: string
  external_id: string
  normalized_key: string
  title: string
  issuer: string | null
  region_code: string | null
  target_area: string | null
  summary: string | null
  detail_text: string
  body_hash: string
  max_amount: number | null
  subsidy_rate: string | null
  industry: string | null
  target_employees: string | null
  acceptance_start_at: string | null
  acceptance_end_at: string | null
  external_url: string
  fetched_at: string
}

/** CollectedGrant を grants 行（snake_case）に変換する */
export function buildGrantRow(grant: CollectedGrant, fetchedAt: string): GrantRow {
  return {
    source_id: grant.sourceId,
    external_id: grant.externalId,
    normalized_key: grant.normalizedKey,
    title: grant.title,
    issuer: grant.issuer,
    region_code: grant.regionCode,
    target_area: grant.targetArea,
    summary: grant.summary,
    detail_text: grant.detailText,
    body_hash: grant.bodyHash,
    max_amount: grant.maxAmount,
    subsidy_rate: grant.subsidyRate,
    industry: grant.industry,
    target_employees: grant.targetEmployees,
    acceptance_start_at: grant.acceptanceStartAt,
    acceptance_end_at: grant.acceptanceEndAt,
    external_url: grant.externalUrl,
    fetched_at: fetchedAt,
  }
}

export interface UpsertResult {
  grantId: string
  isNew: boolean
  isUpdated: boolean
  previousBodyHash: string | null
  /** 更新前の本文テキスト（変更点要約の AI 入力に使う）。新規は null */
  previousDetailText: string | null
}

/**
 * normalized_key をキーに grants を upsert する。
 *  - 既存なし                    → INSERT（isNew=true）
 *  - 既存あり & body_hash 変化   → UPDATE（isUpdated=true）
 *  - 既存あり & 変化なし         → 何もしない
 */
export async function upsertGrant(
  serviceClient: SupabaseClient,
  grant: CollectedGrant,
  fetchedAt: string = new Date().toISOString()
): Promise<UpsertResult> {
  const { data: existing, error: selectError } = await serviceClient
    .from('grants')
    .select('id, body_hash, detail_text')
    .eq('normalized_key', grant.normalizedKey)
    .maybeSingle()

  if (selectError) {
    throw new Error(`助成金の照会に失敗しました: ${selectError.message}`)
  }

  const row = buildGrantRow(grant, fetchedAt)

  if (!existing) {
    const { data: inserted, error: insertError } = await serviceClient
      .from('grants')
      .insert(row)
      .select('id')
      .single()

    if (insertError) {
      throw new Error(`助成金の登録に失敗しました: ${insertError.message}`)
    }
    return {
      grantId: inserted.id,
      isNew: true,
      isUpdated: false,
      previousBodyHash: null,
      previousDetailText: null,
    }
  }

  if (existing.body_hash === grant.bodyHash) {
    return {
      grantId: existing.id,
      isNew: false,
      isUpdated: false,
      previousBodyHash: existing.body_hash,
      previousDetailText: existing.detail_text,
    }
  }

  const { error: updateError } = await serviceClient
    .from('grants')
    .update(row)
    .eq('id', existing.id)

  if (updateError) {
    throw new Error(`助成金の更新に失敗しました: ${updateError.message}`)
  }

  return {
    grantId: existing.id,
    isNew: false,
    isUpdated: true,
    previousBodyHash: existing.body_hash,
    previousDetailText: existing.detail_text,
  }
}

export interface GrantVersionInput {
  grantId: string
  bodyHash: string
  changeSummary: string | null
  changedFields?: Record<string, unknown>
}

/** 更新履歴 grant_versions を1件追加する */
export async function insertGrantVersion(
  serviceClient: SupabaseClient,
  input: GrantVersionInput
): Promise<void> {
  const { error } = await serviceClient.from('grant_versions').insert({
    grant_id: input.grantId,
    body_hash: input.bodyHash,
    change_summary: input.changeSummary,
    changed_fields: input.changedFields ?? {},
  })

  if (error) {
    throw new Error(`助成金の更新履歴の登録に失敗しました: ${error.message}`)
  }
}
