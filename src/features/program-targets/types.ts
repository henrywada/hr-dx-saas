/** プログラム種別 */
export type ProgramType =
  | 'stress_check'
  | 'pulse_survey'
  | 'survey'
  | 'e_learning'

/** 実施枠一覧用（ストレスチェック期間・パルスサーベイ期間等） */
export type ProgramInstanceRow = {
  programType: ProgramType
  instanceId: string
  label: string
  subLabel?: string
  targetCount?: number
}

/** 対象者一覧用（従業員情報結合） */
export type ProgramTargetWithEmployee = {
  id: string
  employee_id: string
  is_eligible: boolean
  exclusion_reason: string | null
  employee_name: string | null
  employee_no: string | null
  division_name: string | null
}

/** 対象者追加用の従業員候補 */
export type EmployeeForTargetSelection = {
  id: string
  name: string | null
  employee_no: string | null
  division_name: string | null
}
