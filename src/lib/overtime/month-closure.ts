/**
 * 月次締め（/adm/closure）と残業上長承認（/approval）の整合用。
 * 集計済み以降は勤怠スナップショット前提のため、上長の承認・却下・修正依頼を不可にする。
 */

/** このステータス以降は残業の承認系操作をブロック */
export const MONTHLY_CLOSURE_STATUSES_BLOCKING_OVERTIME_APPROVAL = [
  'aggregated',
  'approved',
  'locked',
] as const

export function monthlyClosureBlocksOvertimeApproval(
  status: string | null | undefined,
): boolean {
  if (!status) return false
  return (MONTHLY_CLOSURE_STATUSES_BLOCKING_OVERTIME_APPROVAL as readonly string[]).includes(status)
}

/**
 * 勤務日（YYYY-MM-DD）から monthly_overtime_closures.year_month と揃えた月初キー（YYYY-MM-01）を得る。
 */
export function yearMonthFirstDayFromWorkDate(workDate: string | null | undefined): string | null {
  if (workDate == null || typeof workDate !== 'string') {
    return null
  }
  const m = /^(\d{4}-\d{2})-\d{2}/.exec(workDate.trim())
  if (!m) {
    return null
  }
  return `${m[1]}-01`
}

/** 一覧の ym（YYYY-MM）を monthly_overtime_closures.year_month と同じキー（YYYY-MM-01）に揃える */
export function yearMonthToClosureYearMonthKey(yearMonth: string): string {
  return `${yearMonth}-01`
}
