import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { differenceInDays } from 'date-fns'
import { computePulseTrendDirection, isOneOnOneOverdue } from './condition-summary'
import type {
  UpcomingOneOnOneRow,
  SessionRow,
  ImplementationRateRow,
  DepartmentRateRow,
  ThemeTemplate,
  OverdueEmployee,
  OneOnOneDashboardData,
  OneOnOneEmployee,
  OneOnOneSessionSummary,
  EmployeeConditionSummary,
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
      conducted_at,
      ai_summary
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
      ai_summary: (s as { ai_summary?: string | null }).ai_summary ?? null,
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

  const byDivision = new Map<string, { name: string; total: number; conducted: number }>()

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

/**
 * キャリア面談連携（CR-S3）用：指定従業員それぞれの直近 1on1 セッションを取得する。
 */
export async function getRecentOneOnOneSessionsForEmployees(
  employeeIds: string[],
  limit = 5
): Promise<Record<string, OneOnOneSessionSummary[]>> {
  const user = await getServerUser()
  if (!user?.tenant_id || employeeIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('one_on_one_sessions')
    .select('id, employee_id, manager_id, theme, notes, conducted_at')
    .eq('tenant_id', user.tenant_id)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })

  if (error || !data) return {}

  const managerIds = [...new Set(data.map(s => s.manager_id))]
  const { data: managers } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', managerIds)
    .eq('tenant_id', user.tenant_id)

  const managerMap = new Map((managers ?? []).map(m => [m.id, m.name ?? '']))

  const byEmployee: Record<string, OneOnOneSessionSummary[]> = {}
  for (const s of data) {
    const list = byEmployee[s.employee_id] ?? []
    if (list.length >= limit) continue
    list.push({
      id: s.id,
      employee_id: s.employee_id,
      theme: s.theme,
      notes: s.notes,
      conducted_at: s.conducted_at,
      manager_name: managerMap.get(s.manager_id) ?? '',
    })
    byEmployee[s.employee_id] = list
  }
  return byEmployee
}

/** 従業員本人が受けた 1on1 セッション一覧（O-S1） */
export async function getMyOneOnOneSessions(employeeId: string): Promise<SessionRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('one_on_one_sessions')
    .select('id, manager_id, employee_id, theme, notes, next_date, conducted_at, ai_summary')
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', employeeId)
    .order('conducted_at', { ascending: false })
    .limit(100)

  if (error || !data || data.length === 0) return []

  const managerIds = [...new Set(data.map(s => s.manager_id))]
  const { data: managers } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', managerIds)
    .eq('tenant_id', user.tenant_id)

  const managerMap = new Map(
    (managers ?? []).map(m => {
      const divData = m.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
      return [m.id, { name: m.name ?? '', deptName }]
    })
  )

  const sorted = [...data].sort((a, b) => b.conducted_at.localeCompare(a.conducted_at))

  return sorted.map((s, idx) => {
    const manager = managerMap.get(s.manager_id)
    const prevSession = sorted[idx + 1]
    const daysSince = prevSession
      ? differenceInDays(new Date(s.conducted_at), new Date(prevSession.conducted_at))
      : null

    return {
      id: s.id,
      manager_id: s.manager_id,
      manager_name: manager?.name ?? '',
      employee_id: s.employee_id,
      employee_name: '',
      department_name: manager?.deptName ?? null,
      theme: s.theme,
      notes: s.notes,
      next_date: s.next_date,
      conducted_at: s.conducted_at,
      days_since_last: daysSince,
      ai_summary: (s as { ai_summary?: string | null }).ai_summary ?? null,
    }
  })
}

/** 管理職向け: 予定中の 1on1 一覧 */
export async function getUpcomingOneOnOnesForManager(): Promise<UpcomingOneOnOneRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return []

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('one_on_one_upcoming')
    .select('id, manager_id, employee_id, scheduled_at, theme, agenda, reminded_at, status')
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (error || !data?.length) return []

  const empIds = [
    ...new Set(
      data.flatMap((r: { manager_id: string; employee_id: string }) => [
        r.manager_id,
        r.employee_id,
      ])
    ),
  ] as string[]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', empIds)
    .eq('tenant_id', user.tenant_id)

  const nameMap = new Map((employees ?? []).map(e => [e.id, e.name ?? '']))

  return data.map(row => ({
    id: row.id,
    manager_id: row.manager_id,
    manager_name: nameMap.get(row.manager_id) ?? '',
    employee_id: row.employee_id,
    employee_name: nameMap.get(row.employee_id) ?? '',
    scheduled_at: row.scheduled_at,
    theme: row.theme,
    agenda: row.agenda,
    reminded_at: row.reminded_at,
    status: row.status as UpcomingOneOnOneRow['status'],
  }))
}

/** 従業員向け: 自分宛の予定 1on1 */
export async function getMyUpcomingOneOnOnes(employeeId: string): Promise<UpcomingOneOnOneRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('one_on_one_upcoming')
    .select('id, manager_id, employee_id, scheduled_at, theme, agenda, reminded_at, status')
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', employeeId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(20)

  if (error || !data?.length) return []

  const managerIds = [...new Set(data.map((r: { manager_id: string }) => r.manager_id))] as string[]
  const { data: managers } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', managerIds)
    .eq('tenant_id', user.tenant_id)

  const nameMap = new Map((managers ?? []).map(m => [m.id, m.name ?? '']))

  return data.map(row => ({
    id: row.id,
    manager_id: row.manager_id,
    manager_name: nameMap.get(row.manager_id) ?? '',
    employee_id: row.employee_id,
    employee_name: '',
    scheduled_at: row.scheduled_at,
    theme: row.theme,
    agenda: row.agenda,
    reminded_at: row.reminded_at,
    status: row.status as UpcomingOneOnOneRow['status'],
  }))
}

const PULSE_TREND_LIMIT = 3

/** 対象従業員ごとの直近パルスサーベイ推移（古い→新しい順）を取得する */
async function fetchPulseTrendsByEmployee(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  userIdToEmpId: Map<string, string>
): Promise<Map<string, Array<{ period: string; score: number }>>> {
  const userIds = [...userIdToEmpId.keys()]
  const pulseByEmployeeDesc = new Map<string, Array<{ period: string; score: number }>>()
  if (userIds.length === 0) return pulseByEmployeeDesc

  const { data: pulseData } = await supabase
    .from('pulse_survey_responses')
    .select('user_id, score, survey_period')
    .eq('tenant_id', tenantId)
    .in('user_id', userIds)
    .not('score', 'is', null)
    .order('survey_period', { ascending: false })
    // 従業員ごとに直近 PULSE_TREND_LIMIT 件あれば十分なため、余裕を持った上限で無制限取得を防ぐ
    .limit(userIds.length * PULSE_TREND_LIMIT * 6)

  for (const row of pulseData ?? []) {
    const empId = userIdToEmpId.get(row.user_id)
    if (!empId || row.score === null) continue
    const list = pulseByEmployeeDesc.get(empId) ?? []
    if (list.length < PULSE_TREND_LIMIT) {
      list.push({ period: row.survey_period, score: Math.round((row.score / 2) * 10) / 10 })
      pulseByEmployeeDesc.set(empId, list)
    }
  }

  // 表示用に古い→新しい順へ反転する（DBは新しい→古い順で取得しているため）
  const result = new Map<string, Array<{ period: string; score: number }>>()
  for (const [empId, trend] of pulseByEmployeeDesc) {
    result.set(empId, [...trend].reverse())
  }
  return result
}

/** 対象従業員ごとの直近1on1実施日を取得する */
async function fetchLastOneOnOneByEmployee(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  employeeIds: string[]
): Promise<Map<string, string>> {
  const { data: sessions } = await supabase
    .from('one_on_one_sessions')
    .select('employee_id, conducted_at')
    .eq('tenant_id', tenantId)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })

  const lastSessionByEmployee = new Map<string, string>()
  for (const s of sessions ?? []) {
    if (!lastSessionByEmployee.has(s.employee_id)) {
      lastSessionByEmployee.set(s.employee_id, s.conducted_at)
    }
  }
  return lastSessionByEmployee
}

/**
 * 1on1実施前のコンディションサマリー（パルスサーベイ直近推移・1on1実施状況）を
 * 対象従業員ごとに取得する。ストレスチェック等の機微データは含まない
 * （docs/implementation-plan-1on1-condition-summary.md 参照）。
 */
export async function getEmployeeConditionSummary(
  employeeIds: string[]
): Promise<Record<string, EmployeeConditionSummary>> {
  const user = await getServerUser()
  if (!user?.tenant_id || employeeIds.length === 0) return {}

  const supabase = await createClient()

  const { data: employeesData } = await supabase
    .from('employees')
    .select('id, user_id')
    .eq('tenant_id', user.tenant_id)
    .in('id', employeeIds)

  const userIdToEmpId = new Map<string, string>()
  for (const e of employeesData ?? []) {
    if (e.user_id) userIdToEmpId.set(e.user_id, e.id)
  }

  const [pulseTrendByEmployee, lastSessionByEmployee] = await Promise.all([
    fetchPulseTrendsByEmployee(supabase, user.tenant_id, userIdToEmpId),
    fetchLastOneOnOneByEmployee(supabase, user.tenant_id, employeeIds),
  ])

  const now = new Date()
  const result: Record<string, EmployeeConditionSummary> = {}
  for (const employeeId of employeeIds) {
    const pulseTrend = pulseTrendByEmployee.get(employeeId) ?? []

    const lastOneOnOneAt = lastSessionByEmployee.get(employeeId) ?? null
    const daysSinceLastOneOnOne = lastOneOnOneAt
      ? differenceInDays(now, new Date(lastOneOnOneAt))
      : null

    result[employeeId] = {
      employeeId,
      pulseTrend,
      pulseTrendDirection: computePulseTrendDirection(pulseTrend),
      lastOneOnOneAt,
      daysSinceLastOneOnOne,
      isOverdue: isOneOnOneOverdue(daysSinceLastOneOnOne),
    }
  }
  return result
}
