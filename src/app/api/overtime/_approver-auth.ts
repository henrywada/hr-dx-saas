/**
 * 残業申請 API 用: 上長（is_manager）・同一部署スコープの検証
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/** GET 一覧用: ログインユーザーのテナント・上長フラグ・部署 */
export type OvertimeListContext =
  | {
      userId: string
      tenantId: string
      employeeId: string
      isManager: boolean
      divisionId: string | null
    }
  | { error: 'unauthorized' | 'no_employee' }

/** POST 承認／却下／修正依頼用: 上長かつ部署割当あり */
export type ManagerApproverContext =
  | {
      userId: string
      tenantId: string
      supervisorEmployeeId: string
      divisionId: string
    }
  | { error: 'unauthorized' | 'forbidden' | 'no_employee' }

export async function getOvertimeListContext(
  supabase: SupabaseClient<Database>,
): Promise<OvertimeListContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'unauthorized' }
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, tenant_id, is_manager, division_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (empError || !employee?.tenant_id || !employee.id) {
    return { error: 'no_employee' }
  }

  return {
    userId: user.id,
    tenantId: employee.tenant_id,
    employeeId: employee.id,
    isManager: employee.is_manager === true,
    divisionId: employee.division_id,
  }
}

export async function getApproverContext(
  supabase: SupabaseClient<Database>,
): Promise<ManagerApproverContext> {
  const ctx = await getOvertimeListContext(supabase)
  if ('error' in ctx) {
    if (ctx.error === 'unauthorized') {
      return { error: 'unauthorized' }
    }
    return { error: 'no_employee' }
  }

  if (!ctx.isManager || !ctx.divisionId) {
    return { error: 'forbidden' }
  }

  return {
    userId: ctx.userId,
    tenantId: ctx.tenantId,
    supervisorEmployeeId: ctx.employeeId,
    divisionId: ctx.divisionId,
  }
}

/** 同一テナント・同一部署に属する従業員 ID 一覧（承認対象スコープ） */
export async function fetchEmployeeIdsInDivision(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  divisionId: string,
): Promise<{ ids: string[]; error?: string }> {
  const { data, error } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('division_id', divisionId)

  if (error) {
    console.error('fetchEmployeeIdsInDivision:', error)
    return { ids: [], error: '部署メンバーの取得に失敗しました' }
  }

  return { ids: (data ?? []).map((r) => r.id) }
}

/** 一覧「部署の全従業員」用: 同一部署メンバー（氏名ソート） */
export async function fetchDivisionPeersForOvertimeList(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  divisionId: string,
): Promise<{
  peers: { id: string; name: string | null; employee_no: string | null }[]
  error?: string
}> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, employee_no')
    .eq('tenant_id', tenantId)
    .eq('division_id', divisionId)
    .order('name', { ascending: true })

  if (error) {
    console.error('fetchDivisionPeersForOvertimeList:', error)
    return { peers: [], error: '部署メンバーの取得に失敗しました' }
  }

  return { peers: data ?? [] }
}

/** 申請者が承認者と同一部署にいるか（承認時点の employees.division_id） */
export async function assertApplicantInManagerDivision(
  supabase: SupabaseClient<Database>,
  applicantEmployeeId: string,
  managerDivisionId: string,
  tenantId: string,
): Promise<boolean> {
  const { data: applicant, error } = await supabase
    .from('employees')
    .select('division_id, tenant_id')
    .eq('id', applicantEmployeeId)
    .maybeSingle()

  if (error || !applicant) {
    return false
  }
  return (
    applicant.tenant_id === tenantId && applicant.division_id === managerDivisionId
  )
}
