/** 他システムデータ移行のドメイン型 */

export type EmployeeCsvRow = {
  line: number
  employeeNo: string
  name: string
  nameKana: string
  /** CSV の mailadress（ログイン用。小文字化済み） */
  email: string
  sexRaw: string
  /** 従業員フォームに合わせた値（男性 / 女性）。不明は null */
  sex: string | null
  birth: string
  /** 組織１〜最深層までのパス */
  orgPath: string[]
  error: string | null
}

export type DivisionPlan = {
  /** ルートから当該ノードまでの名前を \0 で結合したキー */
  key: string
  name: string
  layer: number
  parentKey: string | null
}

export type StressCsvRow = {
  line: number
  employeeNo: string
  ymdRaw: string
  examDateYmd: string | null
  answers: number[]
  error: string | null
}

export type ExistingEmployee = {
  id: string
  employee_no: string | null
  name: string | null
  sex: string | null
}

export type MigrationScope = 'employee' | 'health' | 'stress'

export type PreviewIssue = {
  source: MigrationScope
  line?: number
  employeeNo?: string
  level: 'error' | 'warning'
  message: string
}

export type HealthPreviewRow = {
  employeeNo: string
  examDateYmd: string
  csvName: string
  matched: boolean
  employeeName: string | null
  fiscalYear: number | null
  error: string | null
  warning: string | null
}

export type StressPreviewRow = {
  employeeNo: string
  examDateYmd: string | null
  matched: boolean
  error: string | null
}

export type MigrationPreview = {
  employees: {
    total: number
    createCount: number
    updateCount: number
    divisionCount: number
  }
  health: {
    total: number
    fiscalYears: number[]
  }
  stress: {
    total: number
    dates: string[]
  }
  healthRows: HealthPreviewRow[]
  stressRows: StressPreviewRow[]
  issues: PreviewIssue[]
  errorCount: number
  warningCount: number
  maxEmployeesError: string | null
}

export type MigrationCommitResult = {
  ok: boolean
  error?: string
  divisionsCreated: number
  employeesCreated: number
  employeesUpdated: number
  healthImported: number
  stressImported: number
  skipped: number
  errors: string[]
}

export type MigrationTenantOption = {
  id: string
  name: string
  max_employees: number | null
  registered_user_count: number
}

export const MIGRATION_INSTITUTION_NAME = '移行（日本予防医学協会）'
export const KYOKAI_PRESET_CODE = 'kyokai_3file'
export const EMPLOYEE_APP_ROLE = 'employee'
/** 移行で作成するログインの仮パスワード（メール確認済み＝認証済） */
export const MIGRATION_TEMP_PASSWORD = 'aaaaaa'
