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
const MY_SKILLS_JOURNEY_PATH = APP_ROUTES.TENANT.MY_SKILLS_JOURNEY

// ---- 従業員: 職種申請 ----

export async function applyForSkillRole(input: {
  skillId: string
  note?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approvers } = await (supabase as any)
    .from('employee_approvers')
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
    .from('employee_approvers')
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

  const { data: app } = await (supabase as any)
    .from('skill_role_applications')
    .select('employee_id, skill_id, tenant_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: '対象の申請が見つかりません' }
  if (app.tenant_id !== user.tenant_id)
    return { success: false, error: '権限がありません（テナント不一致）' }

  // 承認関係の検証
  const { data: approverCheck } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', app.employee_id)
    .maybeSingle()
  if (!approverCheck) return { success: false, error: 'この従業員の承認権限がありません' }

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

  if (comment) {
    const { error: fbErr } = await (supabase as any).from('skill_feedback_comments').insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      receiver_employee_id: app.employee_id,
      category: 'skill_approval',
      related_id: app.skill_id,
      comment: comment,
    })
    if (fbErr) {
      console.error('フィードバックコメントの保存に失敗:', fbErr.message)
    }
  }

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

  const { data: app } = await (supabase as any)
    .from('skill_role_applications')
    .select('employee_id, skill_id, tenant_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: '対象の申請が見つかりません' }
  if (app.tenant_id !== user.tenant_id)
    return { success: false, error: '権限がありません（テナント不一致）' }

  // 承認関係の検証
  const { data: approverCheck } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', app.employee_id)
    .maybeSingle()
  if (!approverCheck) return { success: false, error: 'この従業員の承認権限がありません' }

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

  if (comment) {
    const { error: fbErr } = await (supabase as any).from('skill_feedback_comments').insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      receiver_employee_id: app.employee_id,
      category: 'skill_approval',
      related_id: app.skill_id,
      comment: comment,
    })
    if (fbErr) {
      console.error('フィードバックコメントの保存に失敗:', fbErr.message)
    }
  }

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

  const { data: app } = await (supabase as any)
    .from('skill_requirement_applications')
    .select('employee_id, requirement_id, tenant_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: '対象の申請が見つかりません' }
  if (app.tenant_id !== user.tenant_id)
    return { success: false, error: '権限がありません（テナント不一致）' }

  // 承認関係の検証
  const { data: approverCheck } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', app.employee_id)
    .maybeSingle()
  if (!approverCheck) return { success: false, error: 'この従業員の承認権限がありません' }

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

  if (comment) {
    const { error: fbErr } = await (supabase as any).from('skill_feedback_comments').insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      receiver_employee_id: app.employee_id,
      category: 'skill_approval',
      related_id: app.requirement_id,
      comment: comment,
    })
    if (fbErr) {
      console.error('フィードバックコメントの保存に失敗:', fbErr.message)
    }
  }

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

  const { data: app } = await (supabase as any)
    .from('skill_requirement_applications')
    .select('employee_id, requirement_id, tenant_id')
    .eq('id', applicationId)
    .maybeSingle()

  if (!app) return { success: false, error: '対象の申請が見つかりません' }
  if (app.tenant_id !== user.tenant_id)
    return { success: false, error: '権限がありません（テナント不一致）' }

  // 承認関係の検証
  const { data: approverCheck } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', app.employee_id)
    .maybeSingle()
  if (!approverCheck) return { success: false, error: 'この従業員の承認権限がありません' }

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

  if (comment) {
    const { error: fbErr } = await (supabase as any).from('skill_feedback_comments').insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      receiver_employee_id: app.employee_id,
      category: 'skill_approval',
      related_id: app.requirement_id,
      comment: comment,
    })
    if (fbErr) {
      console.error('フィードバックコメントの保存に失敗:', fbErr.message)
    }
  }

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

  const { error } = await (supabase as any).from('employee_approvers').insert({
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
    .from('employee_approvers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}

// ---- 従業員: 自己評価保存 ----

export async function saveEmployeeSelfEvaluation(input: {
  requirementId: string
  selfLevelId: string | null
  note?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any).from('employee_skill_self_evaluations').upsert(
    {
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      requirement_id: input.requirementId,
      self_level_id: input.selfLevelId || null,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id,requirement_id' }
  )

  if (error) return { success: false, error: error.message }
  revalidatePath(MY_SKILLS_PATH)
  return { success: true }
}

// ---- 上長: コース推奨 ----

export async function recommendCourse(input: {
  employeeId: string
  courseId: string
  requirementId?: string
  reason?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  // 承認関係の検証
  const { data: approverCheck } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', input.employeeId)
    .maybeSingle()
  if (!approverCheck) return { success: false, error: 'この従業員への推奨権限がありません' }

  const { error } = await (supabase as any).from('employee_recommended_courses').upsert(
    {
      tenant_id: user.tenant_id,
      recommender_id: user.employee_id,
      employee_id: input.employeeId,
      course_id: input.courseId,
      requirement_id: input.requirementId || null,
      reason: input.reason ?? null,
    },
    { onConflict: 'employee_id,course_id' }
  )

  if (error) return { success: false, error: error.message }
  revalidatePath(MY_SKILLS_PATH)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

// ---- 一般・上長: 応援・フィードバックコメント追加 ----

export async function addSkillFeedbackComment(input: {
  receiverEmployeeId: string
  category: 'skill_approval' | '1on1' | 'career_goal'
  relatedId?: string
  comment: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  // 承認関係の検証 (career_goal以外のフィードバックの場合は承認者であることを確認)
  if (input.category !== 'career_goal') {
    const { data: approverCheck } = await (supabase as any)
      .from('employee_approvers')
      .select('id')
      .eq('approver_id', user.employee_id)
      .eq('employee_id', input.receiverEmployeeId)
      .maybeSingle()
    if (!approverCheck)
      return { success: false, error: 'この従業員へのフィードバック送信権限がありません' }
  }

  const { error } = await (supabase as any).from('skill_feedback_comments').insert({
    tenant_id: user.tenant_id,
    sender_employee_id: user.employee_id,
    receiver_employee_id: input.receiverEmployeeId,
    category: input.category,
    related_id: input.relatedId || null,
    comment: input.comment,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(MY_SKILLS_PATH)
  revalidatePath(SKILL_APPROVALS_PATH)
  return { success: true }
}

// ---- 上司: キャリア目標提案 ----

export async function proposeCareerGoal(input: {
  employeeId: string
  skillId: string
  targetDate: string
  message?: string
  milestones: Array<{ title: string; targetDate: string | null; sortOrder: number }>
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approver } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', input.employeeId)
    .single()
  if (!approver) return { success: false, error: 'この従業員への提案権限がありません' }

  const { error: goalErr } = await (supabase as any).from('employee_career_goals').upsert(
    {
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      target_skill_id: input.skillId,
      target_date: input.targetDate,
      status: 'proposed',
      proposed_by: user.employee_id,
      message: input.message ?? null,
    },
    { onConflict: 'employee_id' }
  )
  if (goalErr) return { success: false, error: goalErr.message }

  if (input.milestones.length > 0) {
    const rows = input.milestones.map(m => ({
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      title: m.title,
      target_date: m.targetDate,
      sort_order: m.sortOrder,
      status: 'proposed',
      proposed_by: user.employee_id,
    }))
    const { error: mErr } = await (supabase as any).from('skill_growth_milestones').insert(rows)
    if (mErr) return { success: false, error: mErr.message }
  }

  revalidatePath(MY_SKILLS_JOURNEY_PATH)
  revalidatePath(SKILL_APPROVALS_PATH)
  return { success: true }
}

// ---- 従業員: キャリア目標提案を承認 ----

export async function confirmCareerGoal(input: { employeeId: string }): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.employee_id || user.employee_id !== input.employeeId)
    return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error: goalErr } = await (supabase as any)
    .from('employee_career_goals')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('employee_id', input.employeeId)
    .eq('status', 'proposed')
  if (goalErr) return { success: false, error: goalErr.message }

  const { error: mErr } = await (supabase as any)
    .from('skill_growth_milestones')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('employee_id', input.employeeId)
    .eq('status', 'proposed')
  if (mErr) return { success: false, error: mErr.message }

  revalidatePath(MY_SKILLS_JOURNEY_PATH)
  return { success: true }
}

// ---- 上司: マイルストーン変更提案 ----

export async function proposeMilestone(input: {
  employeeId: string
  title: string
  targetDate: string | null
  sortOrder: number
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approver } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', input.employeeId)
    .single()
  if (!approver) return { success: false, error: 'この従業員への提案権限がありません' }

  const { error } = await (supabase as any).from('skill_growth_milestones').insert({
    tenant_id: user.tenant_id,
    employee_id: input.employeeId,
    title: input.title,
    target_date: input.targetDate,
    sort_order: input.sortOrder,
    status: 'proposed',
    proposed_by: user.employee_id,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(MY_SKILLS_JOURNEY_PATH)
  revalidatePath(APP_ROUTES.TENANT.SKILL_JOURNEY(input.employeeId))
  return { success: true }
}

// ---- 上司: アドバイスコメント送信 ----

export async function sendAdviceComment(input: {
  employeeId: string
  comment: string
  category?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approver } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', user.employee_id)
    .eq('employee_id', input.employeeId)
    .single()
  if (!approver) return { success: false, error: '送信権限がありません' }

  const { error } = await (supabase as any).from('skill_feedback_comments').insert({
    tenant_id: user.tenant_id,
    sender_employee_id: user.employee_id,
    receiver_employee_id: input.employeeId,
    category: input.category ?? 'career_goal',
    comment: input.comment,
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.SKILL_JOURNEY(input.employeeId))
  return { success: true }
}

// ---- 従業員: 上司に相談（SOS）----

export async function sendConsultation(input: {
  categoryTags: string[]
  message?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: approverRow } = await (supabase as any)
    .from('employee_approvers')
    .select('approver_id')
    .eq('employee_id', user.employee_id)
    .limit(1)
    .single()
  if (!approverRow) return { success: false, error: '担当上司が設定されていません' }

  const { error } = await (supabase as any).from('skill_consultations').insert({
    tenant_id: user.tenant_id,
    employee_id: user.employee_id,
    manager_id: approverRow.approver_id,
    category_tags: input.categoryTags,
    message: input.message ?? null,
    status: 'open',
  })
  if (error) return { success: false, error: error.message }

  revalidatePath(MY_SKILLS_JOURNEY_PATH)
  revalidatePath(SKILL_APPROVALS_PATH)
  return { success: true }
}

// ---- 上司: 相談に返答 ----

export async function replyConsultation(input: {
  consultationId: string
  reply: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.employee_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('skill_consultations')
    .update({
      manager_reply: input.reply,
      status: 'replied',
      replied_at: new Date().toISOString(),
    })
    .eq('id', input.consultationId)
    .eq('manager_id', user.employee_id)
  if (error) return { success: false, error: error.message }

  revalidatePath(SKILL_APPROVALS_PATH)
  return { success: true }
}

// ---- 人事: 評価者設定 upsert ----

export async function upsertEvalApprovers(input: {
  employeeId: string
  primaryApproverId: string | null
  secondaryApproverId: string | null
  confirmerApproverId: string | null
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error: delErr } = await (supabase as any)
    .from('employee_approvers')
    .delete()
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', input.employeeId)
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])
  if (delErr) return { success: false, error: delErr.message }

  const inserts: Array<{ tenant_id: string; employee_id: string; approver_id: string; approver_role: string }> = []
  if (input.primaryApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.primaryApproverId, approver_role: 'eval_primary' })
  }
  if (input.secondaryApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.secondaryApproverId, approver_role: 'eval_secondary' })
  }
  if (input.confirmerApproverId) {
    inserts.push({ tenant_id: user.tenant_id, employee_id: input.employeeId, approver_id: input.confirmerApproverId, approver_role: 'eval_confirmer' })
  }

  if (inserts.length > 0) {
    const { error: insErr } = await (supabase as any).from('employee_approvers').insert(inserts)
    if (insErr) return { success: false, error: insErr.message }
  }

  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}

// ---- 人事: 評価者設定 一括削除 ----

export async function removeEvalApprovers(input: {
  employeeId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('employee_approvers')
    .delete()
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', input.employeeId)
    .in('approver_role', ['eval_primary', 'eval_secondary', 'eval_confirmer'])
  if (error) return { success: false, error: error.message }

  revalidatePath(ADMIN_APPROVERS_PATH)
  return { success: true }
}
