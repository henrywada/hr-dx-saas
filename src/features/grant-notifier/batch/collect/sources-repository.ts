import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * grant_sources（収集ソースマスタ・横断）の読み書き。
 * 書込は service_role クライアント（RLS バイパス、collect バッチ限定）で行う。
 */

export interface EnsureSourceInput {
  name: string
  sourceType: 'jgrants_api' | 'crawl'
  url: string
}

/**
 * url をキーにソース行を取得し、無ければ作成してその id を返す。
 * url は UNIQUE 制約付きのため冪等に呼べる。
 */
export async function ensureSource(
  serviceClient: SupabaseClient,
  input: EnsureSourceInput
): Promise<string> {
  const { data: existing, error: selectError } = await serviceClient
    .from('grant_sources')
    .select('id')
    .eq('url', input.url)
    .maybeSingle()

  if (selectError) {
    throw new Error(`収集ソースの照会に失敗しました: ${selectError.message}`)
  }
  if (existing) return existing.id

  const { data: inserted, error: insertError } = await serviceClient
    .from('grant_sources')
    .insert({ name: input.name, source_type: input.sourceType, url: input.url })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`収集ソースの作成に失敗しました: ${insertError.message}`)
  }
  return inserted.id
}

/** ソースの最終収集日時を更新する */
export async function markSourceFetched(
  serviceClient: SupabaseClient,
  sourceId: string,
  fetchedAt: string = new Date().toISOString()
): Promise<void> {
  const { error } = await serviceClient
    .from('grant_sources')
    .update({ last_fetched_at: fetchedAt })
    .eq('id', sourceId)

  if (error) {
    throw new Error(`収集ソースの最終取得日時の更新に失敗しました: ${error.message}`)
  }
}
