import type { DivisionPlan, EmployeeCsvRow } from './types'

export function divisionKey(path: string[]): string {
  return path.join('\0')
}

/** 従業員行の組織パスから、親が先に来る部署プランを作る */
export function buildDivisionPlans(rows: EmployeeCsvRow[]): DivisionPlan[] {
  const map = new Map<string, DivisionPlan>()
  for (const row of rows) {
    if (row.error) continue
    for (let i = 0; i < row.orgPath.length; i++) {
      const path = row.orgPath.slice(0, i + 1)
      const key = divisionKey(path)
      if (map.has(key)) continue
      const parentPath = path.slice(0, -1)
      map.set(key, {
        key,
        name: path[path.length - 1],
        layer: i + 1,
        parentKey: parentPath.length > 0 ? divisionKey(parentPath) : null,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.layer - b.layer || a.key.localeCompare(b.key, 'ja'))
}
