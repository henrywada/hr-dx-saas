export interface EmployeeOption {
  id: string
  name: string
}

/** 従業員一覧を氏名の部分一致（大文字小文字を区別しない）で絞り込む */
export function filterEmployeesByName(
  employees: EmployeeOption[],
  query: string
): EmployeeOption[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return employees

  return employees.filter(e => e.name.toLowerCase().includes(trimmed))
}
