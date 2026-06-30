/**
 * テナント従業員容量の純粋計算（テスト可能なロジック）
 */

export type EmployeeRoleRow = {
  app_role?: { app_role?: string } | { app_role?: string }[] | null
}

export function countEmployeesByRole(rows: EmployeeRoleRow[]): {
  registered_user_count: number
  company_doctor_count: number
} {
  let registered_user_count = 0
  let company_doctor_count = 0
  for (const row of rows) {
    const ar = row.app_role
    const slug = Array.isArray(ar) ? ar[0]?.app_role : ar?.app_role
    if (slug === 'company_doctor') {
      company_doctor_count += 1
    } else {
      registered_user_count += 1
    }
  }
  return { registered_user_count, company_doctor_count }
}

export function computeEmployeeCapacity(
  maxEmployees: number | null | undefined,
  registered_user_count: number,
  company_doctor_count: number,
): {
  limit: number | null
  remaining: number | null
} {
  const limit =
    typeof maxEmployees === 'number' && Number.isFinite(maxEmployees) ? maxEmployees : null
  const total = registered_user_count + company_doctor_count
  const remaining = limit === null ? null : Math.max(limit - total, 0)
  return { limit, remaining }
}
