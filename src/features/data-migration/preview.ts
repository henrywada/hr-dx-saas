import { normalizeEmployeeNo } from '@/features/health-check/csv-parse'
import type { MergedCsvPerson } from '@/features/health-check/types'
import { japaneseFiscalYear } from './dates'
import { buildDivisionPlans } from './org-tree'
import type {
  EmployeeCsvRow,
  ExistingEmployee,
  HealthPreviewRow,
  MigrationPreview,
  MigrationScope,
  PreviewIssue,
  StressCsvRow,
  StressPreviewRow,
} from './types'

function employeeNoSet(
  csvRows: EmployeeCsvRow[],
  existing: ExistingEmployee[]
): Map<string, { id: string | null; name: string | null; fromCsv: boolean }> {
  const map = new Map<string, { id: string | null; name: string | null; fromCsv: boolean }>()
  for (const e of existing) {
    const no = normalizeEmployeeNo(e.employee_no)
    if (!no) continue
    map.set(no, { id: e.id, name: e.name, fromCsv: false })
  }
  for (const r of csvRows) {
    if (!r.employeeNo || r.error) continue
    const prev = map.get(r.employeeNo)
    map.set(r.employeeNo, {
      id: prev?.id ?? null,
      name: r.name || prev?.name || null,
      fromCsv: true,
    })
  }
  return map
}

export function buildMigrationPreview(input: {
  employeeRows: EmployeeCsvRow[]
  healthPeople: MergedCsvPerson[]
  stressRows: StressCsvRow[]
  existingEmployees: ExistingEmployee[]
  maxEmployees: number | null
  existingCount: number
  /** 系統別プレビューでは、従業員上限は従業員取込時のみ判定する */
  scope?: MigrationScope
}): MigrationPreview {
  const issues: PreviewIssue[] = []
  for (const r of input.employeeRows) {
    if (r.error) {
      issues.push({
        source: 'employee',
        line: r.line,
        employeeNo: r.employeeNo || undefined,
        level: 'error',
        message: r.error,
      })
    }
  }

  const nos = employeeNoSet(input.employeeRows, input.existingEmployees)
  const createCount = [...nos.values()].filter(v => v.fromCsv && !v.id).length
  const updateCount = [...nos.values()].filter(v => v.fromCsv && v.id).length
  const divisions = buildDivisionPlans(input.employeeRows.filter(r => !r.error))

  const healthRows: HealthPreviewRow[] = []
  const fySet = new Set<number>()
  const healthDup = new Map<string, string>()
  for (const p of input.healthPeople) {
    const no = normalizeEmployeeNo(p.employeeNo)
    const emp = nos.get(no)
    const fy = p.examDateYmd ? japaneseFiscalYear(p.examDateYmd) : null
    if (fy != null) fySet.add(fy)
    const dupKey = fy != null ? `${no}::${fy}` : ''
    let warning = p.warnings[0] ?? null
    if (dupKey && healthDup.has(dupKey)) {
      warning = `同一年度の健診が複数あります。後勝ちで上書きします（先: ${healthDup.get(dupKey)}）`
      issues.push({
        source: 'health',
        employeeNo: no,
        level: 'warning',
        message: warning,
      })
    } else if (dupKey) {
      healthDup.set(dupKey, p.examDateYmd)
    }
    if (emp && p.name && emp.name && p.name !== emp.name) {
      warning = warning ?? `氏名不一致: CSV=${p.name} / マスタ=${emp.name}`
    }
    let error: string | null = null
    if (!p.examDateYmd) error = '健診日が不正です'
    else if (!emp) error = `個人コード ${p.employeeNo} が社員番号に一致しません`
    if (error) {
      issues.push({ source: 'health', employeeNo: no, level: 'error', message: error })
    }
    healthRows.push({
      employeeNo: p.employeeNo,
      examDateYmd: p.examDateYmd,
      csvName: p.name,
      matched: Boolean(emp),
      employeeName: emp?.name ?? null,
      fiscalYear: fy,
      error,
      warning,
    })
  }

  const stressRows: StressPreviewRow[] = []
  const dates = new Set<string>()
  for (const r of input.stressRows) {
    if (r.examDateYmd) dates.add(r.examDateYmd)
    const emp = nos.get(normalizeEmployeeNo(r.employeeNo))
    let error = r.error
    if (!error && !emp) error = `employee_no ${r.employeeNo} が社員番号に一致しません`
    if (error) {
      issues.push({
        source: 'stress',
        line: r.line,
        employeeNo: r.employeeNo,
        level: 'error',
        message: error,
      })
    }
    stressRows.push({
      employeeNo: r.employeeNo,
      examDateYmd: r.examDateYmd,
      matched: Boolean(emp),
      error,
    })
  }

  let maxEmployeesError: string | null = null
  const hasLimit = typeof input.maxEmployees === 'number' && Number.isFinite(input.maxEmployees)
  const checkLimit = !input.scope || input.scope === 'employee'
  if (hasLimit && checkLimit) {
    const after = input.existingCount + createCount
    if (after > input.maxEmployees) {
      maxEmployeesError = `従業員の登録上限（${input.maxEmployees}名）を超えます（取込後 ${after} 名）`
      issues.push({ source: 'employee', level: 'error', message: maxEmployeesError })
    }
  }

  const errorCount = issues.filter(i => i.level === 'error').length
  const warningCount = issues.filter(i => i.level === 'warning').length

  return {
    employees: {
      total: input.employeeRows.length,
      createCount,
      updateCount,
      divisionCount: divisions.length,
    },
    health: {
      total: input.healthPeople.length,
      fiscalYears: [...fySet].sort((a, b) => a - b),
    },
    stress: {
      total: input.stressRows.length,
      dates: [...dates].sort(),
    },
    healthRows,
    stressRows,
    issues,
    errorCount,
    warningCount,
    maxEmployeesError,
  }
}
