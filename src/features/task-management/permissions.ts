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

/** 責任者・マネージャー・メンバーのいずれかであれば、自分の工数を記録できる（セクション14.2） */
export function canLogWork(isOwner: boolean, isManager: boolean, isMember: boolean): boolean {
  return isOwner || isManager || isMember
}
