import { createClient } from '@/lib/supabase/server'

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
