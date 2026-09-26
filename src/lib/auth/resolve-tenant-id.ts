import type { SupabaseClient } from '@supabase/supabase-js'

/** PostgREST の「行が見つからない」エラーコード（.single() で 0 件のとき） */
const NO_ROWS_ERROR_CODE = 'PGRST116'

export interface TenantResolveResult {
  tenantId: string | null
  /** DB エラーで判定不能（呼び出し側は判定を保留する） */
  failed: boolean
}

interface TenantUser {
  id: string
  user_metadata?: { tenant_id?: string | null } | null
}

/**
 * ユーザーのテナント ID を解決する。
 * user_metadata.tenant_id を優先し、無ければ employees.tenant_id を参照する。
 */
export async function resolveTenantId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  user: TenantUser
): Promise<TenantResolveResult> {
  const metaTenantId = user.user_metadata?.tenant_id
  if (metaTenantId) return { tenantId: metaTenantId, failed: false }

  const { data, error } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()

  if (error) {
    // 行なしは「テナント不明」、それ以外は DB 障害として failed
    const isNoRow = (error as { code?: string }).code === NO_ROWS_ERROR_CODE
    return { tenantId: null, failed: !isNoRow }
  }
  const tenantId = (data as { tenant_id?: string | null } | null)?.tenant_id ?? null
  return { tenantId, failed: false }
}
