export interface EmployeeHoursSummary {
  employeeId: string
  employeeName: string
  totalHours: number
}

/** タスクグループ詳細ページ用：メンバー別の工数合計を降順で返す */
export function aggregateHoursByEmployee(
  rows: { employeeId: string; employeeName: string; hours: number }[]
): EmployeeHoursSummary[] {
  const totals = new Map<string, EmployeeHoursSummary>()

  for (const row of rows) {
    const existing = totals.get(row.employeeId)
    if (existing) {
      existing.totalHours += row.hours
    } else {
      totals.set(row.employeeId, {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        totalHours: row.hours,
      })
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours)
}

export interface GroupHoursSummary {
  taskGroupId: string
  taskGroupName: string
  totalHours: number
}

/** 目標詳細ページ用：タスクグループ別の工数合計を降順で返す */
export function aggregateHoursByGroup(
  rows: { taskGroupId: string; taskGroupName: string; hours: number }[]
): GroupHoursSummary[] {
  const totals = new Map<string, GroupHoursSummary>()

  for (const row of rows) {
    const existing = totals.get(row.taskGroupId)
    if (existing) {
      existing.totalHours += row.hours
    } else {
      totals.set(row.taskGroupId, {
        taskGroupId: row.taskGroupId,
        taskGroupName: row.taskGroupName,
        totalHours: row.hours,
      })
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours)
}
