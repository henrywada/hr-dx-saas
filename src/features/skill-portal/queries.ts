// src/features/skill-portal/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  SkillRoleApplication,
  SkillRequirementApplication,
  SkillApprover,
  TeamMemberGrowthCard,
  GrowthJourneyData,
  SkillGrowthMilestone,
  SkillConsultation,
} from './types'

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
    .from('employee_approvers')
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
    .from('employee_approvers')
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
    .from('employee_approvers')
    .select(
      '*, employee:employees!employee_approvers_employee_id_fkey(id, name, employee_no), approver:employees!employee_approvers_approver_id_fkey(id, name, employee_no)'
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
    .from('employee_approvers')
    .select('approver_id, approver:employees!employee_approvers_approver_id_fkey(name)')
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
): Promise<
  Array<{
    id: string
    course_id: string
    recommender_id: string
    recommender: { id: string; name: string | null } | null
    course: { id: string; title: string } | null
    requirement_id: string | null
    reason: string | null
  }>
> {
  const { data, error } = await (supabase as any)
    .from('employee_recommended_courses')
    .select(
      'id, course_id, recommender_id, reason, requirement_id, recommender:employees!employee_recommended_courses_recommender_id_fkey(id, name), course:el_courses(id, title)'
    )
    .eq('employee_id', employeeId)
  if (error) throw error
  return data ?? []
}

/** 従業員へのフィードバックコメント一覧 */
export async function getSkillFeedbackComments(
  supabase: DB,
  employeeId: string
): Promise<
  Array<{
    id: string
    sender_employee_id: string
    sender: { id: string; name: string | null } | null
    category: string
    related_id: string | null
    comment: string
    created_at: string
  }>
> {
  const { data, error } = await (supabase as any)
    .from('skill_feedback_comments')
    .select(
      'id, sender_employee_id, category, related_id, comment, created_at, sender:employees!skill_feedback_comments_sender_employee_id_fkey(id, name)'
    )
    .eq('receiver_employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** 上司の担当メンバー育成カード一覧（/skill-approvals 上部グリッド用） */
export async function getTeamGrowthCards(
  supabase: DB,
  approverId: string
): Promise<TeamMemberGrowthCard[]> {
  const { data: approverRows, error: aErr } = await (supabase as any)
    .from('employee_approvers')
    .select('employee_id, employee:employees!employee_approvers_employee_id_fkey(id, name)')
    .eq('approver_id', approverId)
  if (aErr) throw aErr
  if (!approverRows?.length) return []

  const employeeIds = approverRows.map((r: any) => r.employee_id as string)

  const { data: goals, error: gErr } = await (supabase as any)
    .from('employee_career_goals')
    .select('employee_id, target_skill_id, target_date, skill:tenant_skills(name)')
    .in('employee_id', employeeIds)
    .in('status', ['active', 'confirmed'])
  if (gErr) throw gErr

  const { data: consultations, error: cErr } = await (supabase as any)
    .from('skill_consultations')
    .select('employee_id')
    .in('employee_id', employeeIds)
    .eq('status', 'open')
  if (cErr) throw cErr

  const openConsultSet = new Set((consultations ?? []).map((c: any) => c.employee_id as string))

  const { data: snapshots, error: sErr } = await (supabase as any)
    .from('employee_skill_requirement_history')
    .select('employee_id, completion_rate, recorded_at')
    .in('employee_id', employeeIds)
    .order('recorded_at', { ascending: false })
  if (sErr) throw sErr

  const latestRate: Record<string, number> = {}
  for (const snap of snapshots ?? []) {
    if (latestRate[snap.employee_id] === undefined) {
      latestRate[snap.employee_id] = snap.completion_rate ?? 0
    }
  }

  return approverRows.map((row: any) => {
    const eid = row.employee_id as string
    const goal = (goals ?? []).find((g: any) => g.employee_id === eid)
    const hasConsult = openConsultSet.has(eid)
    const rate = latestRate[eid] ?? 0

    let status: TeamMemberGrowthCard['status'] = 'no_goal'
    if (hasConsult) status = 'consultation'
    else if (goal && rate >= 70) status = 'on_track'
    else if (goal) status = 'in_progress'

    return {
      employee_id: eid,
      employee_name: row.employee?.name ?? null,
      goal_skill_name: goal?.skill?.name ?? null,
      goal_deadline: goal?.target_date ?? null,
      achievement_rate: rate,
      status,
      has_open_consultation: hasConsult,
    }
  })
}

/** 上司が担当メンバーかどうかを確認（アクセス制御用） */
export async function verifyManagerAccess(
  supabase: DB,
  approverId: string,
  employeeId: string
): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from('employee_approvers')
    .select('id')
    .eq('approver_id', approverId)
    .eq('employee_id', employeeId)
    .single()
  if (error) return false
  return !!data
}

/** 育成ジャーニーボード用全データ取得 */
export async function getGrowthJourneyData(
  supabase: DB,
  employeeId: string
): Promise<GrowthJourneyData> {
  const [
    { data: empData },
    { data: goalData },
    { data: milestones, error: mErr },
    { data: comments },
    { data: snapshots },
    { data: course },
    { data: consultations },
  ] = await Promise.all([
    (supabase as any).from('employees').select('id, name').eq('id', employeeId).single(),
    (supabase as any)
      .from('employee_career_goals')
      .select('target_skill_id, target_date, status, message, skill:tenant_skills(name)')
      .eq('employee_id', employeeId)
      .in('status', ['proposed', 'confirmed', 'active'])
      .order('created_at', { ascending: false })
      .limit(1),
    (supabase as any)
      .from('skill_growth_milestones')
      .select('*')
      .eq('employee_id', employeeId)
      .neq('status', 'changed')
      .order('sort_order', { ascending: true }),
    (supabase as any)
      .from('skill_feedback_comments')
      .select(
        'id, comment, category, created_at, sender:employees!skill_feedback_comments_sender_employee_id_fkey(name)'
      )
      .eq('receiver_employee_id', employeeId)
      .in('category', ['1on1', 'career_goal'])
      .order('created_at', { ascending: false })
      .limit(10),
    (supabase as any)
      .from('employee_skill_requirement_history')
      .select('completion_rate, recorded_at')
      .eq('employee_id', employeeId)
      .order('recorded_at', { ascending: false })
      .limit(2),
    (supabase as any)
      .from('employee_recommended_courses')
      .select('course:el_courses(id, title)')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1),
    (supabase as any)
      .from('skill_consultations')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ])
  if (mErr) throw mErr

  const latestSnap = (snapshots ?? [])[0]
  const prevSnap = (snapshots ?? [])[1]
  const latestGoal = goalData?.[0] ?? null

  return {
    employee_id: employeeId,
    employee_name: empData?.name ?? null,
    goal: latestGoal
      ? {
          skill_id: latestGoal.target_skill_id,
          skill_name: latestGoal.skill?.name ?? null,
          target_date: latestGoal.target_date,
          status: latestGoal.status,
          message: latestGoal.message,
        }
      : null,
    achievement_rate: latestSnap?.completion_rate ?? 0,
    prev_month_rate: prevSnap?.completion_rate ?? 0,
    milestones: milestones ?? [],
    feedback_comments: (comments ?? []).map((c: any) => ({
      id: c.id,
      sender_name: c.sender?.name ?? null,
      category: c.category,
      comment: c.comment,
      created_at: c.created_at,
    })),
    recommended_course: course?.[0]?.course ?? null,
    open_consultations: consultations ?? [],
  }
}

/** 相談履歴一覧（従業員のSOS送信画面用） */
export async function getConsultationHistory(
  supabase: DB,
  employeeId: string
): Promise<SkillConsultation[]> {
  const { data, error } = await (supabase as any)
    .from('skill_consultations')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
