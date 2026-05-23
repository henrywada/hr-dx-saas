// src/features/skill-portal/types.ts

export type ApplicationStatus = 'pending_manager' | 'pending_hr' | 'approved' | 'rejected'

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending_manager: '上長承認待ち',
  pending_hr: '人事承認待ち',
  approved: '承認済み',
  rejected: '却下',
}

/** 職種割り当て申請 */
export type SkillRoleApplication = {
  id: string
  tenant_id: string
  employee_id: string
  skill_id: string
  status: ApplicationStatus
  note: string | null
  manager_comment: string | null
  hr_comment: string | null
  manager_approved_by: string | null
  manager_approved_at: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null
  created_at: string
  updated_at: string
  skill?: { id: string; name: string; color_hex: string }
  employee?: {
    id: string
    name: string | null
    employee_no: string | null
    divisions?: { name: string | null } | null
  }
}

/** 要件達成申請 */
export type SkillRequirementApplication = {
  id: string
  tenant_id: string
  employee_id: string
  requirement_id: string
  status: ApplicationStatus
  evidence: string | null
  manager_comment: string | null
  hr_comment: string | null
  manager_approved_by: string | null
  manager_approved_at: string | null
  hr_approved_by: string | null
  hr_approved_at: string | null
  created_at: string
  updated_at: string
  requirement?: {
    id: string
    name: string
    category: string | null
    level?: { name: string } | null
    skill?: { id: string; name: string; color_hex: string } | null
  }
  employee?: {
    id: string
    name: string | null
    employee_no: string | null
    divisions?: { name: string | null } | null
  }
}

/** 承認者マスタ */
export type SkillApprover = {
  id: string
  tenant_id: string
  employee_id: string
  approver_id: string
  created_at: string
  employee?: { id: string; name: string | null; employee_no: string | null }
  approver?: { id: string; name: string | null; employee_no: string | null }
}

/** マイルストーンステータス */
export type MilestoneStatus = 'proposed' | 'confirmed' | 'in_progress' | 'completed' | 'changed'

/** 育成マイルストーン */
export type SkillGrowthMilestone = {
  id: string
  tenant_id: string
  employee_id: string
  title: string
  description: string | null
  target_date: string | null
  sort_order: number
  status: MilestoneStatus
  proposed_by: string
  confirmed_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** 相談（SOS）ステータス */
export type ConsultationStatus = 'open' | 'replied' | 'resolved'

/** 上司への相談 */
export type SkillConsultation = {
  id: string
  tenant_id: string
  employee_id: string
  manager_id: string
  category_tags: string[]
  message: string | null
  manager_reply: string | null
  status: ConsultationStatus
  replied_at: string | null
  created_at: string
}

/** キャリア目標ステータス */
export type CareerGoalStatus = 'proposed' | 'confirmed' | 'active' | 'achieved'

/** チームメンバー育成カード用サマリー */
export type TeamMemberGrowthCard = {
  employee_id: string
  employee_name: string | null
  goal_skill_name: string | null
  goal_deadline: string | null
  achievement_rate: number
  status: 'consultation' | 'in_progress' | 'on_track' | 'no_goal'
  has_open_consultation: boolean
}

/** 育成ジャーニーボード用データ */
export type GrowthJourneyData = {
  employee_id: string
  employee_name: string | null
  goal: {
    skill_id: string | null
    skill_name: string | null
    target_date: string | null
    status: CareerGoalStatus | null
    message: string | null
  } | null
  achievement_rate: number
  prev_month_rate: number
  milestones: SkillGrowthMilestone[]
  feedback_comments: Array<{
    id: string
    sender_name: string | null
    category: string
    comment: string
    created_at: string
  }>
  recommended_course: { id: string; title: string } | null
  open_consultations: SkillConsultation[]
}
