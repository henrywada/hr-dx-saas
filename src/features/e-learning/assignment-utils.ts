import { toJSTDateString } from '@/lib/datetime'
import type { AssignmentProgress } from './queries'

/** 期限超過判定（未修了かつ due_date が今日より過去） */
export function isAssignmentOverdue(
  dueDate: string | null | undefined,
  isCompleted: boolean
): boolean {
  if (!dueDate || isCompleted) return false
  return dueDate < toJSTDateString()
}

/** 割当一覧から期限超過件数を算出 */
export function countOverdueAssignments(
  assignmentIds: { id: string; due_date: string | null }[],
  progressMap: Record<string, AssignmentProgress>
): number {
  return assignmentIds.filter(a => {
    const p = progressMap[a.id]
    return isAssignmentOverdue(a.due_date, p?.isCompleted ?? false)
  }).length
}

/** 部署別 eラーニング受講集計行 */
export interface ElDivisionCompletionRow {
  divisionId: string | null
  divisionName: string
  assignmentCount: number
  completedCount: number
  overdueCount: number
  completionRatePercent: number | null
}

/** 割当と進捗から部署別集計を構築 */
export function buildElDivisionCompletionStats(
  assignments: {
    id: string
    due_date: string | null
    employee?: {
      division_id: string | null
      divisions?: { name: string } | { name: string }[] | null
    } | null
  }[],
  progressMap: Record<string, AssignmentProgress>
): ElDivisionCompletionRow[] {
  const buckets = new Map<
    string,
    { divisionId: string | null; divisionName: string; total: number; completed: number; overdue: number }
  >()

  for (const a of assignments) {
    const divId = a.employee?.division_id ?? null
    const key = divId ?? '__unassigned__'
    const divRaw = a.employee?.divisions
    const divName = Array.isArray(divRaw)
      ? (divRaw[0]?.name ?? '部署名未設定')
      : (divRaw?.name ?? (divId ? '部署名未設定' : '未所属'))
    const bucket = buckets.get(key) ?? {
      divisionId: divId,
      divisionName: divName,
      total: 0,
      completed: 0,
      overdue: 0,
    }
    bucket.total += 1
    const p = progressMap[a.id]
    if (p?.isCompleted) bucket.completed += 1
    if (isAssignmentOverdue(a.due_date, p?.isCompleted ?? false)) bucket.overdue += 1
    buckets.set(key, bucket)
  }

  return Array.from(buckets.values())
    .map(b => ({
      divisionId: b.divisionId,
      divisionName: b.divisionName,
      assignmentCount: b.total,
      completedCount: b.completed,
      overdueCount: b.overdue,
      completionRatePercent:
        b.total > 0 ? Math.round((b.completed / b.total) * 1000) / 10 : null,
    }))
    .sort((a, b) => b.assignmentCount - a.assignmentCount)
}
