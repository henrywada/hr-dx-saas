import { differenceInCalendarDays, parseISO } from 'date-fns'
import { toJSTDateString } from '@/lib/datetime'
import { TASK_STATUSES, type TaskStatus } from './types'

/** 「長期未更新」「blocked長期滞在」の日数基準（PRDセクション21.1で決定） */
export const STALE_DAYS_THRESHOLD = 14

export type StalledReason = 'overdue' | 'stale' | 'blocked_long'

export interface StalledTaskCandidate {
  status: TaskStatus
  dueDate: string | null
  updatedAt: string
}

/**
 * タスクが「滞留」に該当するか判定し、該当する理由をすべて返す（複数該当し得る）。
 * - overdue: 期限が過ぎており、done/blocked以外
 * - stale: 14日以上更新が無く、done以外
 * - blocked_long: blockedのまま14日以上更新が無い
 */
export function classifyStalledReasons(
  task: StalledTaskCandidate,
  todayYmd: string,
  staleDays: number = STALE_DAYS_THRESHOLD
): StalledReason[] {
  const reasons: StalledReason[] = []

  if (
    task.dueDate &&
    task.dueDate < todayYmd &&
    task.status !== 'done' &&
    task.status !== 'blocked'
  ) {
    reasons.push('overdue')
  }

  const updatedYmd = toJSTDateString(new Date(task.updatedAt))
  const daysSinceUpdate = differenceInCalendarDays(parseISO(todayYmd), parseISO(updatedYmd))

  if (task.status !== 'done' && daysSinceUpdate >= staleDays) {
    reasons.push('stale')
  }

  if (task.status === 'blocked' && daysSinceUpdate >= staleDays) {
    reasons.push('blocked_long')
  }

  return reasons
}

export type StatusCounts = Record<TaskStatus, number>

/** タスクのステータス別件数を集計する（該当0件のステータスも0として含む） */
export function summarizeStatusCounts(tasks: { status: TaskStatus }[]): StatusCounts {
  const counts = Object.fromEntries(TASK_STATUSES.map(s => [s, 0])) as StatusCounts
  for (const task of tasks) {
    counts[task.status] += 1
  }
  return counts
}

export interface WorkloadAggregate {
  employeeId: string
  totalCount: number
  inProgressCount: number
}

/** 進行中とみなすステータス（todo/in_progress/review）。done/blockedは含めない */
const IN_PROGRESS_STATUSES: ReadonlySet<TaskStatus> = new Set(['todo', 'in_progress', 'review'])

/** 従業員ごとの担当タスク件数・うち進行中件数を集計する */
export function aggregateWorkloadByEmployee(
  assignments: { employeeId: string; status: TaskStatus }[]
): WorkloadAggregate[] {
  const byEmployee = new Map<string, WorkloadAggregate>()

  for (const a of assignments) {
    const existing = byEmployee.get(a.employeeId) ?? {
      employeeId: a.employeeId,
      totalCount: 0,
      inProgressCount: 0,
    }
    existing.totalCount += 1
    if (IN_PROGRESS_STATUSES.has(a.status)) {
      existing.inProgressCount += 1
    }
    byEmployee.set(a.employeeId, existing)
  }

  return Array.from(byEmployee.values())
}
