export function isObjectiveOwner(ownerEmployeeId: string, currentEmployeeId: string): boolean {
  return ownerEmployeeId === currentEmployeeId
}

export function isTaskGroupManager(
  managerEmployeeIds: string[],
  currentEmployeeId: string
): boolean {
  return managerEmployeeIds.includes(currentEmployeeId)
}

export function isTaskGroupMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean {
  return memberEmployeeIds.includes(currentEmployeeId)
}

export function canAssignManager(isOwner: boolean): boolean {
  return isOwner
}

export function canAssignMember(isOwner: boolean, isManager: boolean): boolean {
  return isOwner || isManager
}

/**
 * 責任者・マネージャー・メンバーのいずれかであれば、自分の工数を記録できる（セクション14.2）。
 *
 * 既知のギャップ：RLS側の `can_log_work_on_task` は担当者本人（グループ非参加でも）も許可するが、
 * このUI判定は3ロールのみをチェックする。現状は `task_groups_select` のRLSにより非参加者は
 * このUIに到達できないため実害はないが、将来別の入口（自分のタスク一覧等）ができた場合は
 * 担当者判定を追加する必要がある。
 */
export function canLogWork(isOwner: boolean, isManager: boolean, isMember: boolean): boolean {
  return isOwner || isManager || isMember
}

export function isTaskResponsible(
  responsibleEmployeeId: string | null,
  currentEmployeeId: string
): boolean {
  return responsibleEmployeeId === currentEmployeeId
}

export function isTaskMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean {
  return memberEmployeeIds.includes(currentEmployeeId)
}

export function canEditTask(isObjectiveOwner: boolean, isTaskResponsible: boolean): boolean {
  return isObjectiveOwner || isTaskResponsible
}
