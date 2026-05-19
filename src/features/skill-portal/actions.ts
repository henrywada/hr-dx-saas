'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

type ActionResult = { success: true } | { success: false; error: string }

const MY_SKILLS_PATH = APP_ROUTES.TENANT.MY_SKILLS
const SKILL_APPROVALS_PATH = APP_ROUTES.TENANT.SKILL_APPROVALS
const ADMIN_APPLICATIONS_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_APPLICATIONS
const ADMIN_APPROVERS_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_APPROVERS

// ---- 従業員: 職種申請 ----

export async function applyForSkillRole(input: {
  skillId: string
  note?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approvers } = await (supabase as any)
    .from('skill_approvers')
    .select('id')
    .eq('employee_id', user.employee_id)
    .limit(1)
  if (!approvers?.length) {
    return { success: false, error: '承認者が設定されていません。人事担当者にご連絡ください。' }
  }

  const { data: existing } = await (supabase as any)
    .from('skill_role_applications')
    .select('id')
    .eq('employee_id', user.employee_id)
    .eq('skill_id', input.skillId)
    .in('status', ['pending_manager', 'pending_hr'])
    .limit(1)
  if (existing?.length) {
    return { success: false, error: 'この職種はすでに申請中です' }
  }

  const { error } = await (supabase as any).from('skill_role_applications').insert({
    tenant_id: user.tenant_id,
    employee_id: user.employee_id,
    skill_id: input.skillId,
    note: input.note ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 従業員: 要件達成申請 ----

export async function applyForRequirement(input: {
  requirementId: string
  evidence?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approvers } = await (supabase as any)
    .from('skill_approvers')
    .select('id')
    .eq('employee_id', user.employee_id)
    .limit(1)
  if (!approvers?.length) {
    return { success: false, error: '承認者が設定されていません。人事担当者にご連絡ください。' }
  }

  const { data: existing } = await (supabase as any)
    .from('skill_requirement_applications')
    .select('id')
    .eq('employee_id', user.employee_id)
    .eq('requirement_id', input.requirementId)
    .in('status', ['pending_manager', 'pending_hr'])
    .limit(1)
  if (existing?.length) {
    return { success: false, error: 'この要件はすでに申請中です' }
  }

  const { error } = await (supabase as any).from('skill_requirement_applications').insert({
    tenant_id: user.tenant_id,
    employee_id: user.employee_id,
    requirement_id: input.requirementId,
    evidence: input.evidence ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 上長: 職種申請を承認 ----

export async function managerApproveRoleApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_role_applications')
    .update({
      status: 'pending_hr',
      manager_comment: comment ?? null,
      manager_approved_by: user.employee_id,
      manager_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_manager')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_APPROVALS_PATH)
  revalidatePath(ADMIN_APPLICATIONS_PATH)
  return { success: true }
}

// ---- 上長: 職種申請を却下 ----

export async function managerRejectRoleApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_role_applications')
    .update({
      status: 'rejected',
      manager_comment: comment ?? null,
      manager_approved_by: user.employee_id,
      manager_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_manager')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_APPROVALS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 上長: 要件申請を承認 ----

export async function managerApproveRequirementApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_requirement_applications')
    .update({
      status: 'pending_hr',
      manager_comment: comment ?? null,
      manager_approved_by: user.employee_id,
      manager_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_manager')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_APPROVALS_PATH)
  revalidatePath(ADMIN_APPLICATIONS_PATH)
  return { success: true }
}

// ---- 上長: 要件申請を却下 ----

export async function managerRejectRequirementApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_requirement_applications')
    .update({
      status: 'rejected',
      manager_comment: comment ?? null,
      manager_approved_by: user.employee_id,
      manager_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_manager')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_APPROVALS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 人事: 職種申請を最終承認 → employee_skill_assignments へ反映 ----

export async function hrApproveRoleApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: app, error: fetchErr } = await (supabase as any)
    .from('skill_role_applications')
    .select('employee_id, skill_id, tenant_id')
    .eq('id', applicationId)
    .eq('status', 'pending_hr')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (fetchErr || !app) return { success: false, error: '申請が見つかりません' }

  const today = new Date().toISOString().split('T')[0]
  const { error: insertErr } = await (supabase as any).from('employee_skill_assignments').insert({
    tenant_id: app.tenant_id,
    employee_id: app.employee_id,
    skill_id: app.skill_id,
    started_at: today,
    assigned_by: user.employee_id,
  })
  if (insertErr && String(insertErr.code) !== '23505') {
    return { success: false, error: insertErr.message }
  }

  const { error: updateErr } = await (supabase as any)
    .from('skill_role_applications')
    .update({
      status: 'approved',
      hr_comment: comment ?? null,
      hr_approved_by: user.employee_id,
      hr_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
  if (updateErr) return { success: false, error: updateErr.message }

  revalidatePath(ADMIN_APPLICATIONS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

// ---- 人事: 職種申請を却下 ----

export async function hrRejectRoleApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_role_applications')
    .update({
      status: 'rejected',
      hr_comment: comment ?? null,
      hr_approved_by: user.employee_id,
      hr_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_hr')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(ADMIN_APPLICATIONS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 人事: 要件申請を最終承認 → employee_skill_requirement_selections へ反映 ----

export async function hrApproveRequirementApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: app, error: fetchErr } = await (supabase as any)
    .from('skill_requirement_applications')
    .select('employee_id, requirement_id, tenant_id')
    .eq('id', applicationId)
    .eq('status', 'pending_hr')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()
  if (fetchErr || !app) return { success: false, error: '申請が見つかりません' }

  const { error: insertErr } = await (supabase as any)
    .from('employee_skill_requirement_selections')
    .insert({
      tenant_id: app.tenant_id,
      employee_id: app.employee_id,
      requirement_id: app.requirement_id,
    })
  if (insertErr && String(insertErr.code) !== '23505') {
    return { success: false, error: insertErr.message }
  }

  const { error: updateErr } = await (supabase as any)
    .from('skill_requirement_applications')
    .update({
      status: 'approved',
      hr_comment: comment ?? null,
      hr_approved_by: user.employee_id,
      hr_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
  if (updateErr) return { success: false, error: updateErr.message }

  revalidatePath(ADMIN_APPLICATIONS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

// ---- 人事: 要件申請を却下 ----

export async function hrRejectRequirementApplication(
  applicationId: string,
  comment?: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_requirement_applications')
    .update({
      status: 'rejected',
      hr_comment: comment ?? null,
      hr_approved_by: user.employee_id,
      hr_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .eq('status', 'pending_hr')
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(ADMIN_APPLICATIONS_PATH)
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 人事: 承認者マスタ追加 ----

export async function addSkillApprover(input: {
  employeeId: string
  approverId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('skill_approvers').insert({
    tenant_id: user.tenant_id,
    employee_id: input.employeeId,
    approver_id: input.approverId,
  })
  if (error) {
    if (String(error.code) === '23505') return { success: false, error: 'すでに登録済みです' }
    return { success: false, error: error.message }
  }
  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}

// ---- 人事: 承認者マスタ削除 ----

export async function removeSkillApprover(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_approvers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}
