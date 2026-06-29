import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { differenceInDays } from 'date-fns'
import type {
  SessionRow,
  ImplementationRateRow,
  DepartmentRateRow,
  ThemeTemplate,
  OverdueEmployee,
  OneOnOneDashboardData,
  OneOnOneEmployee,
} from './types'

/** 1on1 対象となる在籍中の部下（is_manager=false）一覧を取得する */
export async function getActiveEmployeesForOneOnOne(): Promise<OneOnOneEmployee[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)
    .order('name')

  if (error || !data) return []

  return data.map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })
}

/** 直近50件のセッション一覧（従業員・部署名付き）を取得する */
export async function getOneOnOneSessions(): Promise<SessionRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('one_on_one_sessions')
    .select(
      `
      id,
      manager_id,
      employee_id,
      theme,
      notes,
      next_date,
      conducted_at
    `
    )
    .eq('tenant_id', user.tenant_id)
    .order('conducted_at', { ascending: false })
    .limit(200)

  if (error || !data) return []

  const allEmployeeIds = [
    ...new Set([...data.map(s => s.manager_id), ...data.map(s => s.employee_id)]),
  ]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', allEmployeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  return data.slice(0, 50).map(s => {
    const manager = empMap.get(s.manager_id)
    const employee = empMap.get(s.employee_id)

    const sortedForEmp = data
      .filter(d => d.employee_id === s.employee_id)
      .sort((a, b) => b.conducted_at.localeCompare(a.conducted_at))
    const idx = sortedForEmp.findIndex(d => d.id === s.id)
    const prevSession = sortedForEmp[idx + 1]
    const daysSince = prevSession
      ? differenceInDays(new Date(s.conducted_at), new Date(prevSession.conducted_at))
      : null

    return {
      id: s.id,
      manager_id: s.manager_id,
      manager_name: manager?.name ?? '',
      employee_id: s.employee_id,
      employee_name: employee?.name ?? '',
      department_name: employee?.deptName ?? null,
      theme: s.theme,
      notes: s.notes,
      next_date: s.next_date,
      conducted_at: s.conducted_at,
      days_since_last: daysSince,
    }
  })
}

/** 管理職別の実施率サマリーを取得する（直近30日） */
export async function getImplementationRates(): Promise<ImplementationRateRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('manager_id, employee_id')
    .eq('tenant_id', user.tenant_id)
    .gte('conducted_at', thirtyDaysAgo)

  const { data: managers } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('is_manager', true)
    .eq('active_status', 'active')

  if (!managers) return []

  const { data: subordinates } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)

  const subordinatesByDivision = new Map<string, string[]>()
  for (const sub of subordinates ?? []) {
    if (!sub.division_id) continue
    const arr = subordinatesByDivision.get(sub.division_id) ?? []
    arr.push(sub.id)
    subordinatesByDivision.set(sub.division_id, arr)
  }

  const sessionsByManager = new Map<string, Set<string>>()
  for (const s of sessions ?? []) {
    const set = sessionsByManager.get(s.manager_id) ?? new Set()
    set.add(s.employee_id)
    sessionsByManager.set(s.manager_id, set)
  }

  return managers
    .map(m => {
      const divData = m.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)

      const subs = m.division_id ? (subordinatesByDivision.get(m.division_id) ?? []) : []
      const conducted = sessionsByManager.get(m.id) ?? new Set()
      const totalSubs = subs.length
      const sessionsCount = conducted.size
      const rate = totalSubs > 0 ? Math.round((sessionsCount / totalSubs) * 100) : 0

      return {
        manager_id: m.id,
        manager_name: m.name ?? '',
        department_name: deptName,
        total_subordinates: totalSubs,
        sessions_last_30days: sessionsCount,
        rate,
      }
    })
    .sort((a, b) => b.rate - a.rate)
}

/** 部署別の実施率サマリーを取得する（直近30日） */
export async function getDepartmentImplementationRates(): Promise<DepartmentRateRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // 在籍中の部下（is_manager=false）を部署ごとに集計
  const { data: subordinates } = await supabase
    .from('employees')
    .select('id, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)

  if (!subordinates || subordinates.length === 0) return []

  // 直近30日のセッション（部下ID単位で実施有無を判定）
  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('employee_id')
    .eq('tenant_id', user.tenant_id)
    .gte('conducted_at', thirtyDaysAgo)

  const conductedEmployeeIds = new Set((sessions ?? []).map(s => s.employee_id))

  const byDivision = new Map<
    string,
    { name: string; total: number; conducted: number }
  >()

  for (const sub of subordinates) {
    if (!sub.division_id) continue
    const divData = sub.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? '未設定')
      : (divData?.name ?? '未設定')

    const entry = byDivision.get(sub.division_id) ?? { name: deptName, total: 0, conducted: 0 }
    entry.total += 1
    if (conductedEmployeeIds.has(sub.id)) entry.conducted += 1
    byDivision.set(sub.division_id, entry)
  }

  return Array.from(byDivision.entries())
    .map(([divisionId, v]) => ({
      division_id: divisionId,
      department_name: v.name,
      total_subordinates: v.total,
      sessions_last_30days: v.conducted,
      rate: v.total > 0 ? Math.round((v.conducted / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
}

/** テーマテンプレート一覧を取得する */
export async function getThemeTemplates(): Promise<ThemeTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('one_on_one_theme_templates')
    .select('id, tenant_id, name, description, sort_order, is_active, created_at')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order')

  if (error || !data) return []
  return data as ThemeTemplate[]
}

/** 30日以上未実施の部下一覧（リマインダー対象）を取得する */
export async function getOverdueEmployees(): Promise<OverdueEmployee[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)

  if (!employees || employees.length === 0) return []

  const employeeIds = employees.map(e => e.id)

  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('employee_id, manager_id, conducted_at')
    .eq('tenant_id', user.tenant_id)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const latestByEmployee = new Map<string, { manager_id: string; conducted_at: string }>()
  for (const s of sessions ?? []) {
    if (!latestByEmployee.has(s.employee_id)) {
      latestByEmployee.set(s.employee_id, {
        manager_id: s.manager_id,
        conducted_at: s.conducted_at,
      })
    }
  }

  const managerIds = [...new Set([...latestByEmployee.values()].map(v => v.manager_id))]
  const { data: managers } =
    managerIds.length > 0
      ? await supabase.from('employees').select('id, name').in('id', managerIds)
      : { data: [] }
  const managerMap = new Map((managers ?? []).map(m => [m.id, m.name ?? '']))

  const now = new Date()
  const overdue: OverdueEmployee[] = []

  for (const emp of employees) {
    const last = latestByEmployee.get(emp.id)
    const lastDate = last ? new Date(last.conducted_at) : null
    const daysOverdue = lastDate ? differenceInDays(now, lastDate) : 999

    if (daysOverdue >= 30) {
      const divData = emp.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)

      overdue.push({
        employee_id: emp.id,
        employee_name: emp.name ?? '',
        department_name: deptName,
        manager_name: last ? (managerMap.get(last.manager_id) ?? '未割当') : '未割当',
        last_session_at: last?.conducted_at ?? null,
        days_overdue: daysOverdue === 999 ? -1 : daysOverdue,
      })
    }
  }

  return overdue.sort((a, b) => b.days_overdue - a.days_overdue)
}

/** ダッシュボード用データをまとめて取得する */
export async function getOneOnOneDashboardData(): Promise<OneOnOneDashboardData> {
  const [sessions, implementationRates, departmentRates, themeTemplates, overdueEmployees] =
    await Promise.all([
      getOneOnOneSessions(),
      getImplementationRates(),
      getDepartmentImplementationRates(),
      getThemeTemplates(),
      getOverdueEmployees(),
    ])

  const totalSessionsLast30Days = implementationRates.reduce(
    (sum, r) => sum + r.sessions_last_30days,
    0
  )
  const averageRate =
    implementationRates.length > 0
      ? Math.round(
          implementationRates.reduce((sum, r) => sum + r.rate, 0) / implementationRates.length
        )
      : 0

  return {
    sessions,
    implementationRates,
    departmentRates,
    themeTemplates,
    overdueEmployees,
    totalSessionsLast30Days,
    averageRate,
  }
}
