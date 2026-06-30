import { createAdminClient } from '@/lib/supabase/admin'

/** 従業員の auth メールアドレスを解決する（HR 向け通知専用） */
export async function resolveEmployeeEmail(
  employeeId: string,
  tenantId: string,
): Promise<string | null> {
  const admin = createAdminClient()

  const { data: emp, error: empError } = await admin
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (empError || !emp?.user_id) return null

  const { data: email, error: emailError } = await admin.rpc('get_auth_user_email', {
    p_user_id: emp.user_id,
  })

  if (emailError || !email) return null
  return email
}
