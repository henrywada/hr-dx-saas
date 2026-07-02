import { createClient } from '@/lib/supabase/server'

/**
 * 汎用の通知受信者解決クエリ。特定の機能ドメイン（turnover-risk / engagement 等）に
 * 依存しない、テナント・組織構造ベースの受信者解決のみをここに置く。
 * ドメイン固有の通知ロジック（遷移検知・メール文面等）は各 feature 側に残す。
 */

/** 同一部署の稼働中の管理職（is_manager=true）の従業員IDを取得する */
export async function getDivisionManagerEmployeeIds(
  tenantId: string,
  divisionId: string
): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('division_id', divisionId)
    .eq('is_manager', true)
    .eq('active_status', 'active')

  if (error || !data) return []
  return data.map(e => e.id)
}

/** テナント内の人事ロール（hr / hr_manager）に該当する稼働中の従業員IDを取得する */
export async function getHrDigestRecipientEmployeeIds(tenantId: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, app_role:app_role_id!inner(app_role)')
    .eq('tenant_id', tenantId)
    .eq('active_status', 'active')
    .in('app_role.app_role', ['hr', 'hr_manager'])

  if (error || !data) return []
  return data.map(e => e.id)
}
