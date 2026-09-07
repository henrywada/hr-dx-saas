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
