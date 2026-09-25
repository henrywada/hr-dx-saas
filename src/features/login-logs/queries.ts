import { createClient } from '@/lib/supabase/server'
import { isSaasAdmin } from '@/features/login-logs/saas-auth'
import { callRpc } from '@/features/login-logs/rpc'
import { LOGIN_LOG_MAX_ROWS } from '@/features/login-logs/params'

export interface LoginLog {
  id: string
  logged_in_at: string
  employee_name: string
  email: string
}

/**
 * 自テナントのログイン履歴を日時降順で取得する（yearMonth未指定=全期間）
 */
export async function getLoginLogs(yearMonth: string | null): Promise<LoginLog[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_tenant_login_logs', {
    p_year_month: yearMonth,
  })

  if (error) {
    console.error('getLoginLogs error:', error)
    return []
  }
  return (data ?? []) as LoginLog[]
}

export interface SaasLoginLog extends Omit<LoginLog, 'employee_name'> {
  employee_name: string | null
  tenant_id: string | null
  tenant_name: string | null
}

/**
 * 全テナントのログイン履歴（SaaS管理者のみ）。新しい順、最大 LOGIN_LOG_MAX_ROWS 件。
 */
export async function getAllTenantLoginLogs(
  yearMonth: string | null,
  tenantId: string | null,
): Promise<SaasLoginLog[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'get_all_tenant_login_logs', {
    p_year_month: yearMonth,
    p_tenant_id: tenantId,
    p_limit: LOGIN_LOG_MAX_ROWS,
  })

  if (error) {
    console.error('getAllTenantLoginLogs error:', error)
    return []
  }
  return (data ?? []) as SaasLoginLog[]
}

/**
 * テナント絞り込み用の選択肢（名前昇順、テンプレートも含む）
 */
export async function getLoginLogTenantOptions(): Promise<{ id: string; name: string }[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await supabase.from('tenants').select('id, name').order('name')

  if (error) {
    console.error('getLoginLogTenantOptions error:', error)
    return []
  }
  return (data ?? []).map(t => ({ id: t.id as string, name: (t.name as string | null) ?? '' }))
}
