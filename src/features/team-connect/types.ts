// src/features/team-connect/types.ts

export type { Division, DivisionTreeNode, EmployeeSummary } from '@/features/organization/types'

/** ディレクトリ表示用の従業員（閲覧専用。email等の管理項目は含めない） */
export type DirectoryEmployee = {
  id: string
  name: string | null
  employee_no: string | null
  job_title: string | null
  division_id: string | null
  is_manager: boolean | null
  active_status: string | null
  division: { id: string; name: string | null } | null
}
