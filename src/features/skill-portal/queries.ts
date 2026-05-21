// src/features/skill-portal/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { SkillRoleApplication, SkillRequirementApplication, SkillApprover } from './types'

type DB = SupabaseClient<Database>

/** 自分の職種申請一覧 */
export async function getMyRoleApplications(
  supabase: DB,
  employeeId: string
): Promise<SkillRoleApplication[]> {
  const { data, error } = await (supabase as any)
    .from('skill_role_applications')
    .select('*, skill:tenant_skills(id, name, color_hex)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 自分の要件達成申請一覧 */
export async function getMyRequirementApplications(
  supabase: DB,
  employeeId: string
): Promise<SkillRequirementApplication[]> {
  const { data, error } = await (supabase as any)
    .from('skill_requirement_applications')
    .select(
      '*, requirement:skill_requirements(id, name, category, level:skill_levels(name), skill:tenant_skills(id, name, color_hex))'
    )
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 上長として承認待ちの職種申請（pending_manager） */
export async function getPendingRoleApplicationsForApprover(
  supabase: DB,
  approverId: string
): Promise<SkillRoleApplication[]> {
  const { data: approverRows, error: aErr } = await (supabase as any)
    .from('skill_approvers')
    .select('employee_id')
    .eq('approver_id', approverId)
  if (aErr) throw aErr
  const employeeIds = (approverRows ?? []).map((r: any) => r.employee_id as string)
  if (employeeIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from('skill_role_applications')
    .select(
      '*, skill:tenant_skills(id, name, color_hex), employee:employees!skill_role_applications_employee_id_fkey(id, name, employee_no, divisions:divisions(name))'
    )
    .in('employee_id', employeeIds)
    .eq('status', 'pending_manager')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 上長として承認待ちの要件申請（pending_manager） */
export async function getPendingRequirementApplicationsForApprover(
  supabase: DB,
  approverId: string
): Promise<SkillRequirementApplication[]> {
  const { data: approverRows, error: aErr } = await (supabase as any)
    .from('skill_approvers')
    .select('employee_id')
    .eq('approver_id', approverId)
  if (aErr) throw aErr
  const employeeIds = (approverRows ?? []).map((r: any) => r.employee_id as string)
  if (employeeIds.length === 0) return []

  const { data, error } = await (supabase as any)
    .from('skill_requirement_applications')
    .select(
      '*, requirement:skill_requirements(id, name, category, level:skill_levels(name), skill:tenant_skills(id, name, color_hex)), employee:employees!skill_requirement_applications_employee_id_fkey(id, name, employee_no, divisions:divisions(name))'
    )
    .in('employee_id', employeeIds)
    .eq('status', 'pending_manager')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 人事向け: 上長承認済み職種申請（pending_hr） */
export async function getHrPendingRoleApplications(supabase: DB): Promise<SkillRoleApplication[]> {
  const { data, error } = await (supabase as any)
    .from('skill_role_applications')
    .select(
      '*, skill:tenant_skills(id, name, color_hex), employee:employees!skill_role_applications_employee_id_fkey(id, name, employee_no, divisions:divisions(name))'
    )
    .eq('status', 'pending_hr')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 人事向け: 上長承認済み要件申請（pending_hr） */
export async function getHrPendingRequirementApplications(
  supabase: DB
): Promise<SkillRequirementApplication[]> {
  const { data, error } = await (supabase as any)
    .from('skill_requirement_applications')
    .select(
      '*, requirement:skill_requirements(id, name, category, level:skill_levels(name), skill:tenant_skills(id, name, color_hex)), employee:employees!skill_requirement_applications_employee_id_fkey(id, name, employee_no, divisions:divisions(name))'
    )
    .eq('status', 'pending_hr')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 承認者マスタ一覧 */
export async function getSkillApprovers(supabase: DB): Promise<SkillApprover[]> {
  const { data, error } = await (supabase as any)
    .from('skill_approvers')
    .select(
      '*, employee:employees!skill_approvers_employee_id_fkey(id, name, employee_no), approver:employees!skill_approvers_approver_id_fkey(id, name, employee_no)'
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 自分に承認者が設定されているか確認 */
export async function getMyApprovers(
  supabase: DB,
  employeeId: string
): Promise<Array<{ approver_id: string; approver: { name: string | null } | null }>> {
  const { data, error } = await (supabase as any)
    .from('skill_approvers')
    .select('approver_id, approver:employees!skill_approvers_approver_id_fkey(name)')
    .eq('employee_id', employeeId)
  if (error) throw error
  return data ?? []
}

/** 従業員の自己評価一覧 */
export async function getEmployeeSelfEvaluations(
  supabase: DB,
  employeeId: string
): Promise<Array<{ requirement_id: string; self_level_id: string | null; note: string | null }>> {
  const { data, error } = await (supabase as any)
    .from('employee_skill_self_evaluations')
    .select('requirement_id, self_level_id, note')
    .eq('employee_id', employeeId)
  if (error) throw error
  return data ?? []
}

/** 従業員へのおすすめコース一覧 */
export async function getRecommendedCourses(
  supabase: DB,
  employeeId: string
): Promise<Array<{
  id: string
  course_id: string
  recommender_id: string
  recommender: { id: string; name: string | null } | null
  course: { id: string; title: string } | null
  requirement_id: string | null
  reason: string | null
}>> {
  const { data, error } = await (supabase as any)
    .from('employee_recommended_courses')
    .select('id, course_id, recommender_id, reason, requirement_id, recommender:employees!employee_recommended_courses_recommender_id_fkey(id, name), course:el_courses(id, title)')
    .eq('employee_id', employeeId)
  if (error) throw error
  return data ?? []
}

/** 従業員へのフィードバックコメント一覧 */
export async function getSkillFeedbackComments(
  supabase: DB,
  employeeId: string
): Promise<Array<{
  id: string
  sender_employee_id: string
  sender: { id: string; name: string | null } | null
  category: string
  related_id: string | null
  comment: string
  created_at: string
}>> {
  const { data, error } = await (supabase as any)
    .from('skill_feedback_comments')
    .select('id, sender_employee_id, category, related_id, comment, created_at, sender:employees!skill_feedback_comments_sender_employee_id_fkey(id, name)')
    .eq('receiver_employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

