export type LifecycleType = 'onboarding' | 'offboarding'
export type InstanceStatus = 'in_progress' | 'completed' | 'cancelled'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'

/** タスクテンプレート（テナントカスタマイズ可能） */
export interface LifecycleTaskTemplate {
  id: string
  tenant_id: string
  lifecycle_type: LifecycleType
  title: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** タスク表示用（担当者名付き） */
export interface TaskRow {
  id: string
  instance_id: string
  title: string
  description: string | null
  assignee_id: string | null
  assignee_name: string | null
  status: TaskStatus
  sort_order: number
  due_date: string | null
  completed_at: string | null
}

/** インスタンス一覧表示用（従業員名・部署名・タスク進捗付き） */
export interface InstanceRow {
  id: string
  lifecycle_type: LifecycleType
  status: InstanceStatus
  employee_id: string
  employee_name: string
  department_name: string | null
  scheduled_date: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
  tasks: TaskRow[]
  total_tasks: number
  completed_tasks: number
}

/** ダッシュボード全体データ */
export interface LifecycleDashboardData {
  onboardingInstances: InstanceRow[]
  offboardingInstances: InstanceRow[]
  templates: LifecycleTaskTemplate[]
}

/** 自分が担当者になっている未完了タスク表示用（/top通知カード用） */
export interface PendingTaskRow {
  task_id: string
  title: string
  due_date: string | null
  is_overdue: boolean
  instance_employee_name: string
  lifecycle_type: LifecycleType
}

const LIFECYCLE_HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** /adm/lifecycle にアクセスして自分のタスクを管理できる権限かどうかを判定する */
export function canManageLifecycle(appRole: string | null | undefined): boolean {
  return appRole != null && LIFECYCLE_HR_ROLES.includes(appRole)
}

/** due_date が今日より過去なら期限超過と判定する（YYYY-MM-DD文字列同士の比較） */
export function isTaskOverdue(dueDate: string | null, todayYmd: string): boolean {
  if (!dueDate) return false
  return dueDate < todayYmd
}
