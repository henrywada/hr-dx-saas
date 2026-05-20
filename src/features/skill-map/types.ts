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
  skill_level_set_id?: string | null
  criteria?: string | null
}

export type TenantSkillLevelSet = {
  id: string
  tenant_id: string
  name: string
  sort_order: number
  created_at: string
}

export type TenantSkillLevelSetWithLevels = TenantSkillLevelSet & {
  levels: SkillLevel[]
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
  /** 従業員番号 */
  employee_no: string | null
  /** 氏名（employees.name） */
  full_name: string | null
  /** 所属部署コード（divisions.code、一覧の並びに使用） */
  division_code: string | null
  division_name: string | null
  division_id: string | null
  currentAssignments: Record<string, EmployeeSkillAssignment> // skill_id → 最新割り当て
  latestStartedAt: string | null
}

export type SkillGroupRow = {
  skill: TenantSkill
  employees: Array<{
    employee_id: string
    employee_no: string | null
    full_name: string | null
    division_name: string | null
    started_at: string
  }>
}

/** テナント職種（tenant_skills）と、紐づく要件一覧（skill_requirements + level）を保持 */
export type TenantSkillWithRequirements = TenantSkill & {
  requirements: SkillRequirement[]
}

/** 詳細モーダル用: 要件 + テナントのスキルレベルマスタを含む */
export type TenantSkillDetail = TenantSkillWithRequirements & {
  levels: SkillLevel[]
}

/** eラーニングコース × スキルレベルマッピング（コース情報付き） */
export type CourseSkillLevelMapping = {
  id: string
  course_id: string
  skill_level_id: string
  created_at: string
  course: { id: string; title: string }
}

/** スキルレベル（eラーニング紐付き） */
export type SkillLevelWithMappings = SkillLevel & {
  courseMappings: CourseSkillLevelMapping[]
}

/** スキルレベルセット（eラーニング紐付き） */
export type TenantSkillLevelSetWithMappings = TenantSkillLevelSet & {
  levels: SkillLevelWithMappings[]
}

/** 分析ビュー用: 従業員ごとの職種要件充足状況 */
export type EmployeeCompletionRow = {
  employee_id: string
  employee_no: string | null
  full_name: string | null
  division_name: string | null
  division_id: string | null
  /** 割り当て済み職種IDの配列 */
  assignedSkillIds: string[]
  /** requirement_id → 達成(true) / 未達成(false) */
  requirementCompletions: Record<string, boolean>
  /** 割り当て職種の全要件数（未割り当て従業員は 0） */
  totalRequirements: number
  /** ON になっている要件数 */
  completedRequirements: number
  /** 0〜100（totalRequirements === 0 のとき null） */
  completionRate: number | null
}
