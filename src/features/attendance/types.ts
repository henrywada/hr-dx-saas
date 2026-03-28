/** work_time_records 行（DB 実カラムに合わせる） */
export type WorkTimeRecordRow = {
  id: string
  tenant_id: string
  employee_id: string
  record_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number
  is_holiday: boolean | null
  /** csv_import / qr / telework / mixed（複数ソースの同日マージ）など */
  source: string | null
  created_at: string | null
}

/** 月次サマリー（画面用） */
export type MonthlyStatsView = {
  total_work_minutes: number
  overtime_minutes: number
  holiday_work_minutes: number
  /** 勤務記録のある日数で割った平均（分） */
  avg_daily_work_minutes: number | null
  /** overtime_monthly_stats から取得か、日次集計のフォールバックか */
  source: 'monthly_table' | 'aggregated'
}

export type OvertimeAlertRow = {
  id: string
  tenant_id: string
  employee_id: string
  alert_type: string
  alert_value: Record<string, unknown> | null
  triggered_at: string | null
  resolved_at: string | null
}

export type AttendanceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// --- 人事ダッシュボード用 ---

/** アラート種別（DB の alert_type と対応。未知は低優先度） */
export const HR_ALERT_TYPE_SEVERITY: Record<string, number> = {
  annual_ot_360_exceeded: 100,
  yearly_360_exceeded: 100,
  monthly_ot_100_exceeded: 90,
  monthly_100_exceeded: 90,
  rolling_6m_avg_80_exceeded: 80,
  rolling_6m_80_exceeded: 80,
  monthly_ot_45_exceeded: 50,
  monthly_45_exceeded: 50,
  monthly_overtime_warning: 40,
}

export function alertTypeSeverity(alertType: string): number {
  return HR_ALERT_TYPE_SEVERITY[alertType] ?? 0
}

export type AttendanceStatusTier = 'normal' | 'caution' | 'warning' | 'danger'

export type OverviewStats = {
  totalEmployees: number
  /** 全従業員の平均残業（分） */
  avgOvertimeMinutes: number
  unresolvedAlertCount: number
  legalRiskEmployeeCount: number
  employeeIdsLegalRisk: string[]
  employeeIdsWithUnresolvedAlerts: string[]
  employeeIdsAboveAvgOvertime: string[]
}

export type HrAlertStatusUi = 'open' | 'in_progress' | 'resolved'

export type HrOvertimeAlertView = {
  id: string
  employeeId: string
  employeeName: string
  alertType: string
  alertTypeLabel: string
  thresholdDisplay: string
  triggeredAt: string | null
  statusUi: HrAlertStatusUi
  alertValue: Record<string, unknown> | null
}

export type EmployeeAttendanceRow = {
  employeeId: string
  name: string
  divisionId: string | null
  divisionName: string
  jobTitle: string | null
  totalMinutes: number
  overtimeMinutes: number
  holidayMinutes: number
  /** 選択月に triggered_at があるアラート件数（解決済み含む） */
  alertCountInMonth: number
  /** 未解決アラート件数（全期間） */
  unresolvedAlertCount: number
  statusTier: AttendanceStatusTier
  legalRisk: boolean
}

export type EmployeeAttendanceOverviewFilter =
  | 'all'
  | 'legal_risk'
  | 'unresolved_alerts'
  | 'above_avg_ot'

export type EmployeeAttendanceListFilters = {
  divisionId?: string
  statusTier?: AttendanceStatusTier
  nameSearch?: string
  overviewFilter?: EmployeeAttendanceOverviewFilter
  sortKey?:
    | 'name'
    | 'division'
    | 'total_minutes'
    | 'overtime_minutes'
    | 'holiday_minutes'
    | 'alert_count'
    | 'status'
  sortDir?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

export type EmployeeAttendancePageResult = {
  rows: EmployeeAttendanceRow[]
  total: number
}

export type ExportAttendanceCsvResult =
  | { ok: true; csvText: string; filename: string }
  | { ok: false; error: string }
