/** サービス割当（親定義） */
export type ServiceAssignmentRow = {
  id: string
  tenant_id: string
  service_type: string
  created_at: string
  updated_at: string
}

/** サービス割当ユーザー（従業員紐付け） */
export type ServiceAssignmentUserRow = {
  id: string
  tenant_id: string
  service_assignment_id: string
  employee_id: string
  is_available: boolean
  created_at: string
  updated_at: string
}

/** 対象ユーザー一覧用（従業員名結合） */
export type ServiceAssignmentUserWithEmployee = ServiceAssignmentUserRow & {
  employee_name: string | null
}
