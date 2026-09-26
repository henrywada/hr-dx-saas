import { createClient } from '@/lib/supabase/server'
import { isSaasAdmin } from '@/features/login-logs/saas-auth'
import { callRpc } from '@/features/login-logs/rpc'
import { LOGIN_LOG_MAX_ROWS } from '@/features/login-logs/params'
import type { AccessLog, ServiceRoute } from '@/features/login-logs/access-log'

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

export interface LoginSession extends LoginLog {
  last_activity_at: string
}

/**
 * 自テナントのログイン履歴（最終操作時刻付き）を日時降順で取得する。
 * 最終操作時刻は access_logs から推定（ログアウト未記録でも最後の画面表示を採用）。
 */
export async function getLoginSessions(yearMonth: string | null): Promise<LoginSession[]> {
  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'get_tenant_login_sessions', {
    p_year_month: yearMonth,
  })

  if (error) {
    console.error('getLoginSessions error:', error)
    return []
  }
  return (data ?? []) as LoginSession[]
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

export interface SaasLoginSession extends SaasLoginLog {
  last_activity_at: string
}

/**
 * 全テナントのログイン履歴（最終操作時刻付き、SaaS管理者のみ）。新しい順、最大 LOGIN_LOG_MAX_ROWS 件。
 */
export async function getAllTenantLoginSessions(
  yearMonth: string | null,
  tenantId: string | null,
): Promise<SaasLoginSession[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'get_all_tenant_login_sessions', {
    p_year_month: yearMonth,
    p_tenant_id: tenantId,
    p_limit: LOGIN_LOG_MAX_ROWS,
  })

  if (error) {
    console.error('getAllTenantLoginSessions error:', error)
    return []
  }
  return (data ?? []) as SaasLoginSession[]
}

/**
 * 全テナントのアクセスログ（ログイン/ログアウト/ページ閲覧/重要操作、SaaS管理者のみ）。
 * 新しい順、最大 LOGIN_LOG_MAX_ROWS 件。
 */
export async function getAllTenantAccessLogs(
  yearMonth: string | null,
  tenantId: string | null,
): Promise<AccessLog[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'get_all_tenant_access_logs', {
    p_year_month: yearMonth,
    p_tenant_id: tenantId,
    p_limit: LOGIN_LOG_MAX_ROWS,
  })

  if (error) {
    console.error('getAllTenantAccessLogs error:', error)
    return []
  }
  return (data ?? []) as AccessLog[]
}

/**
 * URL パス → 画面名の照合用に service（name / route_path）を取得する（SaaS管理者のみ）。
 * route_path が重複する場合に採用が安定するよう、登録順で並べる。
 */
export async function getServiceRoutes(): Promise<ServiceRoute[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service')
    .select('name, route_path')
    .not('route_path', 'is', null)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error) {
    console.error('getServiceRoutes error:', error)
    return []
  }
  return (data ?? []) as ServiceRoute[]
}

/**
 * テナント絞り込み用の選択肢（名前昇順、テンプレートも含む。RLS を避けるため SECURITY DEFINER RPC 経由）
 */
export async function getLoginLogTenantOptions(): Promise<{ id: string; name: string }[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = await createClient()
  const { data, error } = await callRpc(supabase, 'get_login_log_tenant_options', {})

  if (error) {
    console.error('getLoginLogTenantOptions error:', error)
    return []
  }
  return ((data ?? []) as { id: string; name: string | null }[]).map(t => ({
    id: t.id,
    name: t.name ?? '',
  }))
}
