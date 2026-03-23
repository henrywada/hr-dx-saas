'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import type { ProgramType } from './types'

const ADM_PATH = APP_ROUTES.TENANT.ADMIN
const PROGRAM_TARGETS_PATH = `${ADM_PATH}/program-targets`

async function getSupabase() {
  return (await createClient()) as any
}

/** company_doctor / test / developer を除外した対象従業員ID一覧を取得 */
async function getEligibleEmployeeIds(supabase: any, tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, app_role:app_role_id(app_role)')
    .eq('tenant_id', tenantId)

  if (error || !data) return []

  const excludedRoles = new Set(['company_doctor', 'test', 'developer'])
  return data
    .filter((e: any) => {
      const role = e.app_role?.app_role ?? (Array.isArray(e.app_role) ? e.app_role[0]?.app_role : null)
      return !excludedRoles.has(role)
    })
    .map((e: any) => e.id)
}

/** 対象者を同期（未登録の従業員を一括追加。company_doctor/test/developer 除外） */
export async function syncProgramTargets(
  programType: ProgramType,
  instanceId: string
): Promise<{ success: boolean; insertedCount?: number; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const eligibleIds = await getEligibleEmployeeIds(supabase, user.tenant_id)
  if (eligibleIds.length === 0) {
    return { success: true, insertedCount: 0 }
  }

  const { data: existing } = await supabase
    .from('program_targets')
    .select('employee_id')
    .eq('program_type', programType)
    .eq('program_instance_id', instanceId)
  const existingIds = new Set((existing ?? []).map((r: { employee_id: string }) => r.employee_id))

  const toInsert = eligibleIds.filter((id) => !existingIds.has(id))
  if (toInsert.length === 0) {
    revalidatePath(PROGRAM_TARGETS_PATH)
    revalidatePath(`${PROGRAM_TARGETS_PATH}/${programType}/${instanceId}`)
    return { success: true, insertedCount: 0 }
  }

  const rows = toInsert.map((employeeId) => ({
    tenant_id: user.tenant_id,
    program_type: programType,
    program_instance_id: instanceId,
    employee_id: employeeId,
    is_eligible: true,
  }))

  const { error } = await supabase.from('program_targets').insert(rows)
  if (error) {
    console.error('syncProgramTargets error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(PROGRAM_TARGETS_PATH)
  revalidatePath(`${PROGRAM_TARGETS_PATH}/${programType}/${instanceId}`)
  return { success: true, insertedCount: rows.length }
}

/** 対象者を1件追加（company_doctor の場合はエラー） */
export async function addProgramTarget(
  programType: ProgramType,
  instanceId: string,
  employeeId: string,
  isEligible = true,
  exclusionReason?: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()

  // company_doctor チェック
  const eligibleIds = await getEligibleEmployeeIds(supabase, user.tenant_id)
  if (!eligibleIds.includes(employeeId)) {
    return { success: false, error: 'この従業員は対象者に追加できません（産業医等は除外対象です）' }
  }

  const { error } = await supabase.from('program_targets').insert({
    tenant_id: user.tenant_id,
    program_type: programType,
    program_instance_id: instanceId,
    employee_id: employeeId,
    is_eligible: isEligible,
    exclusion_reason: exclusionReason ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'この従業員は既に登録されています' }
    }
    console.error('addProgramTarget error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(PROGRAM_TARGETS_PATH)
  revalidatePath(`${PROGRAM_TARGETS_PATH}/${programType}/${instanceId}`)
  return { success: true }
}

/** 対象者の対象/除外を更新 */
export async function updateProgramTarget(
  id: string,
  isEligible: boolean,
  exclusionReason?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabase()
  const updates: Record<string, unknown> = { is_eligible: isEligible }
  if (exclusionReason !== undefined) updates.exclusion_reason = exclusionReason ?? null

  const { error } = await supabase
    .from('program_targets')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('updateProgramTarget error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(PROGRAM_TARGETS_PATH)
  return { success: true }
}

/** 対象者を1件削除 */
export async function deleteProgramTarget(
  id: string,
  programType?: ProgramType,
  instanceId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabase()
  const { error } = await supabase.from('program_targets').delete().eq('id', id)

  if (error) {
    console.error('deleteProgramTarget error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(PROGRAM_TARGETS_PATH)
  if (programType && instanceId) {
    revalidatePath(`${PROGRAM_TARGETS_PATH}/${programType}/${instanceId}`)
  }
  return { success: true }
}
