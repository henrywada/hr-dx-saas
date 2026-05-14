// src/features/skill-map/types.ts

export type TenantSkill = {
  id: string
  tenant_id: string
  name: string
  color_hex: string
  sort_order: number
  created_at: string
}

export type EmployeeSkillAssignment = {
  id: string
  tenant_id: string
  employee_id: string
  skill_id: string
  started_at: string // DATE 'YYYY-MM-DD'
  reason: string | null
  assigned_by: string | null
  created_at: string
  skill?: TenantSkill
}

export type SkillLevel = {
  id: string
  tenant_id: string
  name: string
  color_hex: string
  sort_order: number
  created_at: string
}

export type SkillRequirement = {
  id: string
  tenant_id: string
  skill_id: string
  name: string
  category: string | null // '技術' | '知識' | '資格' | '経験'
  level_id: string | null
  criteria: string | null
  sort_order: number
  created_at: string
  level?: SkillLevel
}

export type EmployeeSkillRow = {
  employee_id: string
  employee_name: string
  division_name: string | null
  division_id: string | null
  currentAssignments: Record<string, EmployeeSkillAssignment> // skill_id → 最新割り当て
  latestStartedAt: string | null
}

export type SkillGroupRow = {
  skill: TenantSkill
  employees: Array<{
    employee_id: string
    employee_name: string
    division_name: string | null
    started_at: string
  }>
}

// 資格管理（維持）
export type Qualification = {
  id: string
  tenant_id: string
  name: string
  issuing_body: string | null
  renewal_years: number | null
}

export type EmployeeQualification = {
  id: string
  tenant_id: string
  employee_id: string
  qualification_id: string
  acquired_date: string | null
  expiry_date: string | null
  cert_number: string | null
  qualification?: Qualification
}

export type SkillMatrixRow = {
  employee_id: string
  employee_name: string
  division_name: string | null
  division_id: string | null
  coverage: number // 0-100 スキル充足率
}

export type SkillMapDraft = {
  id: string
  tenant_id: string
  name: string
  created_by: string | null
  status: 'draft' | 'confirmed'
  snapshot: Record<string, string>
  created_at: string
  updated_at: string
}

export type QualificationAlertStatus = 'valid' | 'expiring_soon' | 'expired'

export function getQualificationStatus(expiryDate: string | null): QualificationAlertStatus {
  if (!expiryDate) return 'valid'
  const expiry = new Date(expiryDate)
  const now = new Date()
  const days30 = new Date(now)
  days30.setDate(days30.getDate() + 30)
  if (expiry < now) return 'expired'
  if (expiry <= days30) return 'expiring_soon'
  return 'valid'
}
