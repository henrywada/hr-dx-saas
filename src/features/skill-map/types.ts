// スキルマップ関連の型定義

export type GlobalSkillTemplate = {
  id: string
  industry_type: 'manufacturing' | 'it'
  name: string
  description: string | null
  is_active: boolean
}

export type GlobalSkillCategory = {
  id: string
  template_id: string
  name: string
  sort_order: number
}

export type GlobalSkill = {
  id: string
  template_id: string
  category_id: string
  name: string
  description: string | null
  sort_order: number
}

export type GlobalProficiencyDef = {
  id: string
  template_id: string
  level: number
  label: string
  color_hex: string
}

export type SkillCategory = {
  id: string
  tenant_id: string
  name: string
  source_template_id: string | null
  sort_order: number
}

export type Skill = {
  id: string
  tenant_id: string
  category_id: string
  name: string
  description: string | null
  sort_order: number
  category?: SkillCategory
}

export type SkillProficiencyDef = {
  id: string
  tenant_id: string
  level: number
  label: string
  color_hex: string
}

export type EmployeeSkill = {
  id: string
  tenant_id: string
  employee_id: string
  skill_id: string
  proficiency_level: number
  evaluated_at: string
  evaluated_by: string | null
}

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

export type SkillMapDraft = {
  id: string
  tenant_id: string
  name: string
  created_by: string | null
  status: 'draft' | 'confirmed'
  snapshot: Record<string, string>  // { employee_id: division_id }
  created_at: string
  updated_at: string
}

/** マトリクス表示用: 従業員 × スキル の習熟度マップ */
export type SkillMatrixRow = {
  employee_id: string
  employee_name: string
  job_title: string | null
  division_name: string | null
  /** { skill_id: proficiency_level } */
  skills: Record<string, number>
  /** スキル充足率 0-100 */
  coverage: number
}

/** 資格期限ステータス */
export type QualificationAlertStatus = 'valid' | 'expiring_soon' | 'expired'

/** 表示用の期限ステータスを計算 */
export function getQualificationStatus(expiryDate: string | null): QualificationAlertStatus {
  if (!expiryDate) return 'valid'
  const expiry = new Date(expiryDate)
  const today = new Date()
  const thirtyDaysLater = new Date()
  thirtyDaysLater.setDate(today.getDate() + 30)
  if (expiry < today) return 'expired'
  if (expiry <= thirtyDaysLater) return 'expiring_soon'
  return 'valid'
}
