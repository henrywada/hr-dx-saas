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
