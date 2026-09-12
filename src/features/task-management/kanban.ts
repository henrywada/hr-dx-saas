import { TASK_STATUSES, type Task, type TaskStatus } from './types'

/**
 * このタスクを閲覧者が操作（ステータス変更等）できるか。
 * TaskDetailModal の canOperate 判定と同じ規則を、カンバンのドラッグ可否にも適用する
 * （責任者・マネージャーは全タスク操作可、それ以外は自分が担当者に含まれる場合のみ操作可）。
 */
export function canOperateTask(
  task: Pick<Task, 'assigneeEmployeeIds'>,
  myEmployeeId: string | null,
  canOperateAllTasks: boolean
): boolean {
  if (canOperateAllTasks) return true
  return myEmployeeId !== null && task.assigneeEmployeeIds.includes(myEmployeeId)
}

/**
 * dnd-kit の DragEndEvent.over?.id からドロップ先のステータスを解決する。
 * カンバン列以外へのドロップ（over が null、未知のID）は null を返す。
 */
export function resolveDropStatus(overId: string | number | null | undefined): TaskStatus | null {
  if (typeof overId !== 'string') return null
  return (TASK_STATUSES as readonly string[]).includes(overId) ? (overId as TaskStatus) : null
}
