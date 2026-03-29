/**
 * 残業申請の閾値（overtime_settings / 労基法準拠デフォルト）とワーニング判定
 */

/** 労基法の原則上限に揃えたデフォルト（overtime_settings 行なし時） */
export const DEFAULT_LEGAL_OVERTIME_THRESHOLDS = {
  monthly_limit_hours: 45,
  monthly_warning_hours: 40,
  annual_limit_hours: 360,
  average_limit_hours: 80,
} as const

export type OvertimeThresholdSource = 'tenant_settings' | 'legal_default'

export type ResolvedOvertimeThresholds = {
  monthly_limit_hours: number
  monthly_warning_hours: number
  annual_limit_hours: number
  average_limit_hours: number
  source: OvertimeThresholdSource
}

export type OvertimeSettingsRow = {
  monthly_limit_hours: number
  monthly_warning_hours: number
  annual_limit_hours: number
  average_limit_hours: number
}

export function resolveOvertimeThresholds(row: OvertimeSettingsRow | null): ResolvedOvertimeThresholds {
  if (row) {
    return {
      monthly_limit_hours: row.monthly_limit_hours,
      monthly_warning_hours: row.monthly_warning_hours,
      annual_limit_hours: row.annual_limit_hours,
      average_limit_hours: row.average_limit_hours,
      source: 'tenant_settings',
    }
  }
  return {
    monthly_limit_hours: DEFAULT_LEGAL_OVERTIME_THRESHOLDS.monthly_limit_hours,
    monthly_warning_hours: DEFAULT_LEGAL_OVERTIME_THRESHOLDS.monthly_warning_hours,
    annual_limit_hours: DEFAULT_LEGAL_OVERTIME_THRESHOLDS.annual_limit_hours,
    average_limit_hours: DEFAULT_LEGAL_OVERTIME_THRESHOLDS.average_limit_hours,
    source: 'legal_default',
  }
}

export type OvertimeWarningLevel = 'none' | 'warn' | 'limit'

export type EmployeeOvertimeWarning = {
  level: OvertimeWarningLevel
  reasons: string[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * 月次集計に含める申請ステータス（却下除く・確定＋進行中）
 */
export const MONTHLY_WARNING_STATUSES = ['承認済', '申請中', '修正依頼'] as const

export function evaluateEmployeeWarnings(
  thresholds: ResolvedOvertimeThresholds,
  monthlyTotal: number,
  ytdApprovedTotal: number,
): EmployeeOvertimeWarning {
  const monthly = round2(monthlyTotal)
  const ytd = round2(ytdApprovedTotal)
  const reasons: string[] = []

  const monthlyAtOrOverLimit = monthly >= thresholds.monthly_limit_hours
  const monthlyAtOrOverWarn =
    monthly >= thresholds.monthly_warning_hours && !monthlyAtOrOverLimit
  const annualAtOrOverLimit = ytd >= thresholds.annual_limit_hours

  if (monthlyAtOrOverLimit) {
    reasons.push(
      `当月の申請ベース合計が月間上限（${thresholds.monthly_limit_hours}時間）以上です（${monthly}時間）。`,
    )
  } else if (monthlyAtOrOverWarn) {
    reasons.push(
      `当月の申請ベース合計が警告ライン（${thresholds.monthly_warning_hours}時間）以上です（${monthly}時間）。`,
    )
  }

  if (annualAtOrOverLimit) {
    reasons.push(
      `当年（暦年・承認済のみ）の合計が年間上限（${thresholds.annual_limit_hours}時間）以上です（${ytd}時間）。`,
    )
  }

  let level: OvertimeWarningLevel = 'none'
  if (monthlyAtOrOverLimit || annualAtOrOverLimit) {
    level = 'limit'
  } else if (monthlyAtOrOverWarn) {
    level = 'warn'
  }

  return { level, reasons }
}

/**
 * peerIds 全員を走査し、warn / limit のみ JSON に載せる（未該当はフロントで none 扱い）
 */
export function buildEmployeeWarningsMap(
  thresholds: ResolvedOvertimeThresholds,
  peerIds: string[],
  monthlyByEmployee: Map<string, number>,
  ytdApprovedByEmployee: Map<string, number>,
): Record<string, EmployeeOvertimeWarning> {
  const out: Record<string, EmployeeOvertimeWarning> = {}
  for (const id of peerIds) {
    const monthly = monthlyByEmployee.get(id) ?? 0
    const ytd = ytdApprovedByEmployee.get(id) ?? 0
    const w = evaluateEmployeeWarnings(thresholds, monthly, ytd)
    if (w.level !== 'none') {
      out[id] = w
    }
  }
  return out
}
