/** 育成計画テンプレート */
export interface TrainingPlanTemplate {
  id: string
  tenant_id: string
  skill_id: string | null
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** テンプレートコース紐付け */
export interface TrainingPlanTemplateCourse {
  id: string
  template_id: string
  tenant_id: string
  course_id: string
  sort_order: number
  created_at: string
}

/** 個人育成計画 */
export interface EmployeeTrainingPlan {
  id: string
  tenant_id: string
  employee_id: string
  template_id: string
  due_date: string | null
  created_by: string | null
  created_at: string
}

/** テンプレート一覧表示用（コース一覧付き） */
export interface TrainingPlanTemplateRow {
  id: string
  skill_id: string | null
  /** 対象職種名（tenant_skills.name） */
  skill_name: string | null
  name: string
  description: string | null
  courses: { id: string; title: string; category: string }[]
}

/** 個人育成計画一覧表示用 */
export interface TrainingEmployeePlanRow {
  id: string
  employee_id: string
  employee_name: string
  department_name: string | null
  template_id: string
  template_name: string
  due_date: string | null
  created_at: string
  total_courses: number
  completed_courses: number
}

/** 進捗レポート行 */
export interface TrainingProgressRow {
  employee_id: string
  employee_name: string
  department_name: string | null
  /** eラーニング: 全アサイン数 */
  el_total: number
  /** eラーニング: 完了数 */
  el_completed: number
  /** eラーニング: 完了率 0〜100 */
  el_rate: number
  /** スキル要件: 全件数 */
  skill_total: number
  /** スキル要件: 充足数 */
  skill_completed: number
  /** スキル要件: 充足率 0〜100（職種未割り当ては null） */
  skill_rate: number | null
  /** 直近の育成計画テンプレート名 */
  active_plan_name: string | null
}

/** ダッシュボード全体データ */
export interface TrainingPlanDashboardData {
  templates: TrainingPlanTemplateRow[]
  plans: TrainingEmployeePlanRow[]
  progressRows: TrainingProgressRow[]
  /** コースピッカー用: テナントの非アーカイブコース一覧 */
  availableCourses: { id: string; title: string; category: string }[]
}
