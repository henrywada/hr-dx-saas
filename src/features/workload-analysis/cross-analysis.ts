/**
 * 残業実績（monthly_employee_overtime）とタスク工数記録（task_work_logs）を
 * 従業員×月単位で突き合わせ、負荷偏り・バーンアウト予兆を検知する純粋関数群。
 *
 * docs/implementation-plan-workload-overtime-cross-analysis.md 3章の仕様に対応する。
 * 残業ステータス判定は src/utils/overtimeThresholds.ts の既存ロジックをそのまま使い、
 * ここでは再実装しない。
 */

import {
  getSingleMonthStatus,
  type OvertimeStatus,
  type OvertimeThresholds,
} from '@/utils/overtimeThresholds'

/** 分析対象期間（月数） */
export const ANALYSIS_WINDOW_MONTHS = 6

const SUSTAINED_OVERTIME_LOOKBACK_MONTHS = 3
const SUSTAINED_OVERTIME_MIN_WARNING_MONTHS = 2
const UNDER_REPORTED_GAP_RATIO = 0.3
const WORKLOAD_CONCENTRATION_MULTIPLIER = 1.5
const WORKLOAD_CONCENTRATION_MIN_HOURS = 20
const ATTENTION_NEEDED_MIN_FLAGS = 2

const WARNING_OR_ABOVE_STATUSES: readonly OvertimeStatus[] = [
  'warning',
  'danger',
  'critical',
  'violation',
]

/**
 * 基準日（YYYY-MM-DD）から遡って直近 count ヶ月分の 'YYYY-MM' を昇順で返す（基準日の月を含む）。
 */
export function buildRecentYearMonths(count: number, referenceYmd: string): string[] {
  const [refYear, refMonth] = referenceYmd.split('-').map(Number)
  const result: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - 1 - i, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    result.push(`${y}-${m}`)
  }
  return result
}

export interface MonthlyOvertimeInput {
  yearMonth: string
  overtimeHours: number
}

export interface MonthlyWorkLogInput {
  yearMonth: string
  loggedHours: number
  /** その月に task_work_logs が1件でもあるか（0件と「申告0h」を区別するため） */
  hasAnyLog: boolean
}

export interface EmployeeCrossAnalysisInput {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  /** 昇順・ANALYSIS_WINDOW_MONTHS ヶ月分、workLogMonths と同じ yearMonth 集合 */
  overtimeMonths: MonthlyOvertimeInput[]
  /** 昇順・ANALYSIS_WINDOW_MONTHS ヶ月分、overtimeMonths と同じ yearMonth 集合 */
  workLogMonths: MonthlyWorkLogInput[]
}

export interface MonthlyCrossPoint {
  yearMonth: string
  overtimeHours: number
  overtimeStatus: OvertimeStatus
  loggedHours: number
  hasAnyLog: boolean
  /** loggedHours / overtimeHours。hasAnyLog=false または overtimeHours=0 の場合は null */
  gapRatio: number | null
}

export interface EmployeeCrossAnalysisFlags {
  sustainedOvertime: boolean
  underReportedGap: boolean
  workloadConcentration: boolean
}

export interface EmployeeCrossAnalysisResult {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  months: MonthlyCrossPoint[]
  flags: EmployeeCrossAnalysisFlags
  isAttentionNeeded: boolean
  reasons: string[]
}

function isWarningOrAbove(status: OvertimeStatus): boolean {
  return WARNING_OR_ABOVE_STATUSES.includes(status)
}

function buildMonthlyCrossPoints(
  input: EmployeeCrossAnalysisInput,
  thresholds: OvertimeThresholds
): MonthlyCrossPoint[] {
  const workLogByMonth = new Map(input.workLogMonths.map(m => [m.yearMonth, m]))

  return input.overtimeMonths.map(om => {
    const wl = workLogByMonth.get(om.yearMonth) ?? {
      yearMonth: om.yearMonth,
      loggedHours: 0,
      hasAnyLog: false,
    }
    const overtimeStatus = getSingleMonthStatus(om.overtimeHours, thresholds)
    const gapRatio = wl.hasAnyLog && om.overtimeHours > 0 ? wl.loggedHours / om.overtimeHours : null

    return {
      yearMonth: om.yearMonth,
      overtimeHours: om.overtimeHours,
      overtimeStatus,
      loggedHours: wl.loggedHours,
      hasAnyLog: wl.hasAnyLog,
      gapRatio,
    }
  })
}

function detectSustainedOvertime(months: MonthlyCrossPoint[]): boolean {
  const recent = months.slice(-SUSTAINED_OVERTIME_LOOKBACK_MONTHS)
  const warningCount = recent.filter(m => isWarningOrAbove(m.overtimeStatus)).length
  return warningCount >= SUSTAINED_OVERTIME_MIN_WARNING_MONTHS
}

function detectUnderReportedGap(
  months: MonthlyCrossPoint[],
  thresholds: OvertimeThresholds
): { flagged: boolean; reasons: string[] } {
  const reasons: string[] = []
  for (const m of months) {
    if (m.gapRatio === null) continue // 記録なし月・残業0h月は判定対象外
    if (m.overtimeHours <= thresholds.monthlyWarning) continue
    if (m.gapRatio < UNDER_REPORTED_GAP_RATIO) {
      const pct = Math.round(m.gapRatio * 100)
      reasons.push(`${m.yearMonth}: 残業${m.overtimeHours}h・申告工数${m.loggedHours}h（${pct}%）`)
    }
  }
  return { flagged: reasons.length > 0, reasons }
}

/**
 * 従業員1名分の月次残業・工数データから、負荷偏り・バーンアウト予兆の3フラグと
 * 要注意判定を算出する。
 *
 * @param divisionAverageLoggedHours - 同一部門の「他メンバー」の直近月申告工数平均
 *   （呼び出し側があらかじめ算出して渡す。3.3参照）
 */
export function computeEmployeeCrossAnalysis(
  input: EmployeeCrossAnalysisInput,
  thresholds: OvertimeThresholds,
  divisionAverageLoggedHours: number
): EmployeeCrossAnalysisResult {
  const months = buildMonthlyCrossPoints(input, thresholds)

  const sustainedOvertime = detectSustainedOvertime(months)
  const gapResult = detectUnderReportedGap(months, thresholds)

  const latestMonth = months[months.length - 1] ?? null
  const latestLoggedHours = latestMonth?.loggedHours ?? 0
  const workloadConcentration =
    latestLoggedHours >= divisionAverageLoggedHours * WORKLOAD_CONCENTRATION_MULTIPLIER &&
    latestLoggedHours >= WORKLOAD_CONCENTRATION_MIN_HOURS

  const flags: EmployeeCrossAnalysisFlags = {
    sustainedOvertime,
    underReportedGap: gapResult.flagged,
    workloadConcentration,
  }

  const trueFlagCount = Object.values(flags).filter(Boolean).length
  const isAttentionNeeded = trueFlagCount >= ATTENTION_NEEDED_MIN_FLAGS

  const reasons: string[] = []
  if (sustainedOvertime) {
    reasons.push(
      `直近${SUSTAINED_OVERTIME_LOOKBACK_MONTHS}ヶ月中${SUSTAINED_OVERTIME_MIN_WARNING_MONTHS}ヶ月以上が「注意」以上の残業ステータス`
    )
  }
  if (gapResult.flagged) {
    reasons.push(...gapResult.reasons.map(r => `申告乖離: ${r}`))
  }
  if (workloadConcentration && latestMonth) {
    reasons.push(
      `${latestMonth.yearMonth}: 申告工数${latestLoggedHours}hが部門平均${divisionAverageLoggedHours.toFixed(1)}hの${WORKLOAD_CONCENTRATION_MULTIPLIER}倍以上`
    )
  }

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    divisionId: input.divisionId,
    divisionName: input.divisionName,
    months,
    flags,
    isAttentionNeeded,
    reasons,
  }
}
