/** 月残業時間の法令閾値（分） */
export const MONTHLY_45H_MINUTES = 45 * 60
export const MONTHLY_80H_MINUTES = 80 * 60
export const MONTHLY_100H_MINUTES = 100 * 60
export const ANNUAL_360H_MINUTES = 360 * 60

/** 残業アラートの重要度ランク */
export const ALERT_SEVERITY: Record<string, number> = {
  annual_ot_360_exceeded: 100,
  yearly_360_exceeded: 100,
  monthly_ot_100_exceeded: 90,
  monthly_100_exceeded: 90,
  rolling_6m_avg_80_exceeded: 80,
  rolling_6m_80_exceeded: 80,
  monthly_ot_45_exceeded: 50,
  monthly_45_exceeded: 50,
}

export type AlertSeverityLevel = 'critical' | 'warning' | 'caution'

export function getAlertSeverityLevel(alertType: string): AlertSeverityLevel {
  const score = ALERT_SEVERITY[alertType] ?? 0
  if (score >= 90) return 'critical'
  if (score >= 70) return 'warning'
  return 'caution'
}

/** 残業アラート表示用行 */
export type OvertimeAlertDisplayRow = {
  id: string
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  alertType: string
  alertTypeLabel: string
  severityLevel: AlertSeverityLevel
  triggeredAt: string | null
  resolvedAt: string | null
  alertValue: Record<string, unknown> | null
}

/** 有休取得進捗行 */
export type PaidLeaveProgressRow = {
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  /** 年度開始以降の is_holiday=true のカウント（有休取得日数の近似値） */
  takenDays: number
  /** 法定義務：年5日 */
  requiredDays: 5
  /** 義務未達のリスクあり（5日未満） */
  atRisk: boolean
}

/** 36協定特別条項対象者行 */
export type Article36SubjectRow = {
  employeeId: string
  employeeName: string
  employeeNo: string | null
  divisionName: string
  /** 直近12ヶ月の月100h超アラート件数 */
  monthOver100Count: number
  /** 直近12ヶ月の月45h超アラート件数 */
  monthOver45Count: number
  /** 年360h超アラートあり */
  hasAnnualExceeded: boolean
}

/** 部署別ヒートマップ行 */
export type DivisionHeatmapRow = {
  divisionId: string
  divisionName: string
  employeeCount: number
  /** 部署平均残業時間（分）— overtime_monthly_stats の指定月 */
  avgOvertimeMinutes: number
  /** 法令リスク従業員数（未解決アラートあり） */
  legalRiskCount: number
  /** 有休取得率（takenDays>=5の人 / 全員） */
  paidLeaveComplianceRate: number
}

/** ダッシュボード全体データバンドル */
export type LaborComplianceBundle = {
  /** 選択月（YYYY-MM） */
  yearMonth: string
  /** 残業アラート一覧（未解決、重大度降順） */
  overtimeAlerts: OvertimeAlertDisplayRow[]
  /** 有休取得義務進捗（リスクあり先頭） */
  paidLeaveProgress: PaidLeaveProgressRow[]
  /** 36協定特別条項対象者（月100h超1件以上 or 年360h超） */
  article36Subjects: Article36SubjectRow[]
  /** 部署別ヒートマップ */
  divisionHeatmap: DivisionHeatmapRow[]
  /** サマリー数値 */
  summary: {
    unresolvedAlertCount: number
    paidLeaveAtRiskCount: number
    article36SubjectCount: number
    totalEmployees: number
  }
}

/** alert_type の日本語ラベル */
export const ALERT_TYPE_LABELS: Record<string, string> = {
  annual_ot_360_exceeded: '年360時間超',
  yearly_360_exceeded: '年360時間超',
  monthly_ot_100_exceeded: '月100時間超（特別条項上限）',
  monthly_100_exceeded: '月100時間超（特別条項上限）',
  rolling_6m_avg_80_exceeded: '6ヶ月平均80時間超',
  rolling_6m_80_exceeded: '6ヶ月平均80時間超',
  monthly_ot_45_exceeded: '月45時間超（限度基準）',
  monthly_45_exceeded: '月45時間超（限度基準）',
  monthly_overtime_warning: '月残業警告',
}
