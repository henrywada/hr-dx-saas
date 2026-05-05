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
  /** 一覧「年度」（ストレス: fiscal_year + 年度。パルス等: 未定義時は UI で「—」） */
  fiscalYearDisplay?: string
  /** 一覧「実施拠点」列（ストレス: 事業場名／拠点未設定はテナント全体表記） */
  establishmentDisplay?: string
  /** 一覧「状態」（ストレス: draft/active/closed の日本語。パルス等は未定義で「—」） */
  statusDisplay?: string
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
