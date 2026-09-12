import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { getOvertimeThresholds } from '@/utils/overtimeThresholds'
import { getTenantDivisions, type DivisionOption } from '@/features/task-management/queries'
import { collectDivisionAndDescendantIds } from '@/features/task-management/division-tree'
import { toJSTDateString } from '@/lib/datetime'
import {
  computeEmployeeCrossAnalysis,
  buildRecentYearMonths,
  ANALYSIS_WINDOW_MONTHS,
  type EmployeeCrossAnalysisInput,
  type EmployeeCrossAnalysisResult,
  type MonthlyOvertimeInput,
  type MonthlyWorkLogInput,
} from './cross-analysis'

/** PostgREST（ローカル・本番とも）のデフォルト1リクエストあたり最大行数 */
const POSTGREST_MAX_ROWS = 1000

/**
 * PostgRESTの1000行上限を超える結果セットを `.range()` によるページネーションで
 * 全件取得するヘルパー（task-management/queries.ts と同じパターン。ドメイン間の
 * 共有ユーティリティ化はしない既存踏襲）。
 */
async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  for (;;) {
    const to = from + POSTGREST_MAX_ROWS - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw error

    const rows = data ?? []
    allRows.push(...rows)

    if (rows.length < POSTGREST_MAX_ROWS) break
    from += POSTGREST_MAX_ROWS
  }

  return allRows
}

interface EmployeeRow {
  id: string
  name: string | null
  division_id: string | null
}

/**
 * 部門フィルタを適用する（純粋関数）。子孫部門を含める規約は collectDivisionAndDescendantIds
 * に集約されている（division-tree.ts のコメント参照）。
 */
function filterEmployeesByDivision(
  employees: EmployeeRow[],
  divisions: DivisionOption[],
  divisionId: string | undefined
): EmployeeRow[] {
  if (!divisionId) return employees
  if (divisionId === 'unassigned') return employees.filter(e => e.division_id === null)

  const allowedIds = collectDivisionAndDescendantIds(divisionId, divisions)
  return employees.filter(e => e.division_id !== null && allowedIds.has(e.division_id))
}

export interface WorkloadOvertimeCrossOptions {
  divisionId?: string
}

/**
 * 残業実績（monthly_employee_overtime）とタスク工数記録（task_work_logs）を
 * 従業員×月単位で突き合わせ、クロス分析結果を返す。
 *
 * divisionId でフィルタしても、タスク集中フラグの「部門内の他メンバー平均」は
 * 常にフィルタ後の対象従業員と同じ部門の同僚から算出される（フィルタが親組織で
 * あっても、同一 division_id の同僚は必ずフィルタ後の集合に含まれるため破綻しない）。
 */
export async function getWorkloadOvertimeCrossData(
  supabase: SupabaseClient<Database>,
  options: WorkloadOvertimeCrossOptions = {}
): Promise<EmployeeCrossAnalysisResult[]> {
  const [thresholds, allEmployees, divisions] = await Promise.all([
    getOvertimeThresholds(supabase),
    fetchAllRows<EmployeeRow>(async (from, to) => {
      const result = await supabase
        .from('employees')
        .select('id, name, division_id')
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
    getTenantDivisions(supabase),
  ])

  const employees = filterEmployeesByDivision(allEmployees, divisions, options.divisionId)
  if (employees.length === 0) return []

  const yearMonths = buildRecentYearMonths(ANALYSIS_WINDOW_MONTHS, toJSTDateString())
  const earliestDate = `${yearMonths[0]}-01`
  const divisionNameById = new Map(divisions.map(d => [d.id, d.name]))

  // 注: employee_id の .in() フィルタは使わない。テナントの従業員数が数百名規模になると
  // UUID を並べたクエリ文字列が PostgREST/Kong の URL 長上限を超えて `URI too long` になるため
  // （ローカル検証で461名データにより実際に発生することを確認済み）。
  // monthly_employee_overtime / task_work_logs はいずれも RLS が tenant_id で完全にスコープする
  // ため、日付範囲のみで絞り込み、対象従業員への絞り込みは後段の Map 参照（employees.map 内）で行う。
  const [overtimeRows, workLogRows] = await Promise.all([
    fetchAllRows<{
      employee_id: string
      year_month: string
      total_overtime_hours: number | null
      updated_at: string
    }>(async (from, to) => {
      const result = await supabase
        .from('monthly_employee_overtime')
        .select('employee_id, year_month, total_overtime_hours, updated_at')
        .gte('year_month', earliestDate)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
    fetchAllRows<{ employee_id: string; work_date: string; hours: number }>(async (from, to) => {
      const result = await supabase
        .from('task_work_logs')
        .select('employee_id, work_date, hours')
        .gte('work_date', earliestDate)
        .order('id', { ascending: true })
        .range(from, to)
      return { data: result.data, error: result.error }
    }),
  ])

  // 同一従業員×月に複数行（複数回の締め処理等）ある場合は updated_at 最新優先でマージする
  // （既存 getEmployeeOvertimeHistory と同じ規約。合算すると二重計上になるため）
  const overtimeByEmployee = new Map<string, Map<string, { hours: number; updatedAt: string }>>()
  for (const row of overtimeRows) {
    const ym = row.year_month.slice(0, 7)
    const byMonth = overtimeByEmployee.get(row.employee_id) ?? new Map()
    const existing = byMonth.get(ym)
    if (!existing || row.updated_at > existing.updatedAt) {
      byMonth.set(ym, { hours: Number(row.total_overtime_hours ?? 0), updatedAt: row.updated_at })
    }
    overtimeByEmployee.set(row.employee_id, byMonth)
  }

  const workLogByEmployee = new Map<string, Map<string, number>>()
  for (const row of workLogRows) {
    const ym = row.work_date.slice(0, 7)
    const byMonth = workLogByEmployee.get(row.employee_id) ?? new Map<string, number>()
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + Number(row.hours))
    workLogByEmployee.set(row.employee_id, byMonth)
  }

  const latestYm = yearMonths[yearMonths.length - 1]
  const latestLoggedHoursByEmployee = new Map<string, number>()
  for (const emp of employees) {
    const hours = workLogByEmployee.get(emp.id)?.get(latestYm) ?? 0
    latestLoggedHoursByEmployee.set(emp.id, hours)
  }

  function averageOfOtherMembers(divisionId: string | null, excludeEmployeeId: string): number {
    const peers = employees.filter(e => e.division_id === divisionId && e.id !== excludeEmployeeId)
    if (peers.length === 0) return 0
    const sum = peers.reduce((acc, e) => acc + (latestLoggedHoursByEmployee.get(e.id) ?? 0), 0)
    return sum / peers.length
  }

  return employees.map(emp => {
    const overtimeMonths: MonthlyOvertimeInput[] = yearMonths.map(ym => ({
      yearMonth: ym,
      overtimeHours: overtimeByEmployee.get(emp.id)?.get(ym)?.hours ?? 0,
    }))
    const workLogMonths: MonthlyWorkLogInput[] = yearMonths.map(ym => {
      const byMonth = workLogByEmployee.get(emp.id)
      return {
        yearMonth: ym,
        loggedHours: byMonth?.get(ym) ?? 0,
        hasAnyLog: byMonth?.has(ym) ?? false,
      }
    })

    const input: EmployeeCrossAnalysisInput = {
      employeeId: emp.id,
      employeeName: emp.name ?? '（名前未設定）',
      divisionId: emp.division_id,
      divisionName: emp.division_id ? (divisionNameById.get(emp.division_id) ?? null) : null,
      overtimeMonths,
      workLogMonths,
    }

    const divisionAverage = averageOfOtherMembers(emp.division_id, emp.id)
    return computeEmployeeCrossAnalysis(input, thresholds, divisionAverage)
  })
}
