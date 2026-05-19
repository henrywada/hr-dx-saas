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
