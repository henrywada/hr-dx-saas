/** 定期健康診断ドメイン型 */

export type CampaignStatus = 'draft' | 'open' | 'closed'
export type EmploymentJudgment = 'fit' | 'restricted' | 'leave' | 'pending' | 'hold'
export type InputSource = 'csv' | 'manual'
export type FileKind = 'main' | 'additional' | 'questionnaire'
export type ItemKind = 'value' | 'category_judgment' | 'finding' | 'questionnaire'
export type ColumnRole =
  | 'value'
  | 'judgment'
  | 'skip'
  | 'identity'
  | 'overall_judgment'
  | 'primary_secondary'
export type OrgLayer = 'all' | '1' | '2' | '3'

export type HealthCheckCampaign = {
  id: string
  tenant_id: string
  fiscal_year: number
  round: 1 | 2
  title: string
  start_date: string | null
  end_date: string | null
  status: CampaignStatus
  created_at: string
  updated_at: string
}

export type HealthCheckInstitution = {
  id: string
  tenant_id: string
  name: string
  is_standard: boolean
  preset_code: string | null
}

export type HealthCheckItem = {
  id: string
  tenant_id: string | null
  code: string
  name: string
  item_kind: ItemKind
  standard_unit: string | null
  sort_order: number
  is_statutory: boolean
}

export type HealthCheckJudgmentCode = {
  id: string
  tenant_id: string
  code: string
  label: string | null
  severity_rank: number
}

export type HealthCheckRecord = {
  id: string
  tenant_id: string
  campaign_id: string
  employee_id: string
  institution_id: string | null
  exam_date: string
  primary_secondary: string | null
  institution_overall_judgment_raw: string | null
  standard_overall_judgment_id: string | null
  input_source: InputSource
  status: 'received'
  employment_judgment: EmploymentJudgment
  employment_judged_at: string | null
  employment_judged_by: string | null
  nurse_interview_recommended: boolean
  doctor_interview_recommended: boolean
  nurse_interview_recommended_at: string | null
  doctor_interview_recommended_at: string | null
}

export type HealthCheckItemResult = {
  id: string
  record_id: string
  item_id: string
  raw_value: string | null
  raw_unit: string | null
  institution_judgment_raw: string | null
  standard_value: string | null
  standard_unit: string | null
  standard_judgment_id: string | null
}

export type HealthCheckMedicalNote = {
  id: string
  record_id: string
  doctor_judgment_code: string | null
  doctor_comment: string | null
  nurse_comment: string | null
}

export type CsvFormatPreset = {
  id: string
  code: string
  name: string
  description: string | null
  spec: KyokaiPresetSpec
}

/** 機関に登録した CSV サンプルの列（health_check_csv_column_maps） */
export type InstitutionCsvColumnMap = {
  institution_id: string
  file_kind: FileKind
  header_name: string
  column_role: ColumnRole
}

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  main: '結果本表',
  additional: '追加検査',
  questionnaire: '問診',
}

export type KyokaiPresetSpec = {
  join_keys: string[]
  date_format: string
  employee_no_header: string
  name_header: string
  exam_date_header: string
  primary_secondary_header: string
  overall_judgment_header: string
  auto_pair_judgment_suffix: string
  questionnaire_yes_token: string
  negative_token: string
  skip_headers: string[]
  judgment_codes: { code: string; label: string; severity_rank: number }[]
}

export type ConvertContext = {
  isStandardInstitution: boolean
  judgmentCodeByRaw: Map<string, HealthCheckJudgmentCode>
  judgmentCodeByStandardCode: Map<string, HealthCheckJudgmentCode>
  unitMultiplierByItemAndFrom: Map<string, { toUnit: string; multiplier: number }>
  thresholdsByItemId: {
    item_id: string
    sex: 'male' | 'female' | null
    min_value: number | null
    max_value: number | null
    judgment_id: string | null
  }[]
  employeeSex: 'male' | 'female' | null
}

export type ConvertedItemValue = {
  itemId: string
  rawValue: string | null
  rawUnit: string | null
  institutionJudgmentRaw: string | null
  standardValue: string | null
  standardUnit: string | null
  standardJudgmentId: string | null
  error?: string
}

export type CsvPersonRow = {
  line: number
  employeeNo: string
  name: string
  examDateRaw: string
  examDateYmd: string | null
  primarySecondary: string | null
  overallJudgmentRaw: string | null
  cells: Record<string, string>
  fileKind: FileKind
}

export type MergedCsvPerson = {
  employeeNo: string
  name: string
  examDateYmd: string
  primarySecondary: string | null
  overallJudgmentRaw: string | null
  files: Partial<Record<FileKind, Record<string, string>>>
  warnings: string[]
}

export type ImportPreviewRow = {
  employeeNo: string
  examDateYmd: string
  csvName: string
  employeeId: string | null
  employeeName: string | null
  nameMismatch: boolean
  error: string | null
  warning: string | null
  itemCount: number
}

export type HrRecordRow = {
  id: string
  employee_id: string
  employee_name: string
  employee_no: string | null
  division_name: string | null
  exam_date: string
  status: 'received'
  employment_judgment: EmploymentJudgment
  nurse_interview_recommended: boolean
  doctor_interview_recommended: boolean
  institution_name: string | null
}

export type ParticipationStats = {
  targetCount: number
  receivedCount: number
  notReceivedCount: number
  rate: number
  pendingJudgmentCount: number
  restrictedCount: number
  leaveCount: number
  nurseRecommendedCount: number
  doctorRecommendedCount: number
}

export type OrgAnalysisRow = {
  division_id: string | null
  division_name: string
  received_count: number
  suppressed: boolean
  judgment_code: string | null
  judgment_label: string | null
  judgment_count: number | null
  severity_rank: number | null
}

export type EmployeeResultView = {
  record: HealthCheckRecord
  campaign: HealthCheckCampaign | null
  institution: HealthCheckInstitution | null
  overallStandardCode: string | null
  notes: HealthCheckMedicalNote | null
  items: {
    item: HealthCheckItem
    result: HealthCheckItemResult
    standardJudgmentCode: string | null
  }[]
}

export type HealthCheckSummaryForInterview = {
  examDate: string | null
  overallStandardCode: string | null
  employmentJudgment: EmploymentJudgment | null
  nurseInterviewRecommended: boolean
  doctorInterviewRecommended: boolean
}

export const EMPLOYMENT_JUDGMENT_LABEL: Record<EmploymentJudgment, string> = {
  pending: '未判定',
  hold: '保留',
  fit: '通常勤務',
  restricted: '就業制限',
  leave: '要休業',
}

export const HR_ROLES = ['hr', 'hr_manager', 'developer', 'test'] as const
export const MEDICAL_ROLES = ['company_doctor', 'company_nurse'] as const
