import type { SupabaseClient } from '@supabase/supabase-js'
import { isTenantAllowedForAudience } from './tenant-audience'

export interface TenantResolveResult {
  tenantId: string | null
  /** DB エラーで判定不能（呼び出し側は判定を保留する） */
  failed: boolean
}

interface TenantUser {
  id: string
  /** 型互換のため受け取るが、書き換え可能なので参照しない */
  user_metadata?: unknown
}

/**
 * ユーザーのテナント ID を解決する。
 * user_metadata はユーザー自身が書き換え可能なため信用せず、employees.tenant_id のみを正とする。
 */
export async function resolveTenantId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  user: TenantUser
): Promise<TenantResolveResult> {
  const { data, error } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  // 複数行エラーを含む全ての DB エラーは判定不能として扱う
  if (error) return { tenantId: null, failed: true }
  const tenantId = (data as { tenant_id?: string | null } | null)?.tenant_id ?? null
  return { tenantId, failed: false }
}

/** ホストとテナントが不整合でセッションを拒否すべきか。判定不能（failed）のときは拒否しない */
export function shouldDenyForHost(
  isMyou: boolean,
  resolved: TenantResolveResult,
  myouTenantIds: string[]
): boolean {
  if (resolved.failed) return false
  const audience = isMyou ? 'myou' : 'default'
  return !isTenantAllowedForAudience(audience, resolved.tenantId, myouTenantIds)
}
