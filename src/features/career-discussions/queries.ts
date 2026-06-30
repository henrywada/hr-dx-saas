import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { differenceInDays } from 'date-fns'
import type {
  CareerDiscussionRow,
  CareerDiscussionThemeTemplate,
  CareerDiscussionEmployeeOption,
  EvaluationPeriodOption,
  CareerAppointmentRow,
  CareerOverdueEmployee,
} from './types'

function extractDepartmentName(
  divisions: { name: string } | { name: string }[] | null
): string | null {
  return Array.isArray(divisions) ? (divisions[0]?.name ?? null) : (divisions?.name ?? null)
}

/** キャリア面談の対象となる在籍中の従業員（is_manager=false）一覧を取得する */
export async function getActiveEmployeesForCareerDiscussion(): Promise<
  CareerDiscussionEmployeeOption[]
> {
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

  return data.map(e => ({
    id: e.id,
    name: e.name ?? '',
    department_name: extractDepartmentName(
      e.divisions as { name: string } | { name: string }[] | null
    ),
  }))
}

/** 本人が対象になったキャリア面談履歴を取得する（従業員向け） */
export async function getMyCareerDiscussions(employeeId: string): Promise<CareerDiscussionRow[]> {
  return getCareerDiscussionRows({ employeeId })
}

/** 自分が記録したキャリア面談一覧を取得する（上長向け） */
export async function getDiscussionsIConducted(
  conductedByEmployeeId: string
): Promise<CareerDiscussionRow[]> {
  return getCareerDiscussionRows({ conductedByEmployeeId })
}

/** HR向け：全社のキャリア面談一覧を取得する */
export async function getCareerDiscussionsForAdmin(): Promise<CareerDiscussionRow[]> {
  return getCareerDiscussionRows({})
}

async function getCareerDiscussionRows(filters: {
  employeeId?: string
  conductedByEmployeeId?: string
}): Promise<CareerDiscussionRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  let query = supabase
    .from('career_discussions')
    .select(
      'id, employee_id, conducted_by_employee_id, theme, career_aspiration, notes, next_date, evaluation_period_id, conducted_at, one_on_one_session_id'
    )
    .eq('tenant_id', user.tenant_id)
    .order('conducted_at', { ascending: false })
    .limit(200)

  if (filters.employeeId) query = query.eq('employee_id', filters.employeeId)
  if (filters.conductedByEmployeeId) {
    query = query.eq('conducted_by_employee_id', filters.conductedByEmployeeId)
  }

  const { data, error } = await query
  if (error || !data || data.length === 0) return []

  const linkedSessionIds = [
    ...new Set(data.map(d => d.one_on_one_session_id).filter((id): id is string => Boolean(id))),
  ]
  const sessionThemeMap = new Map<string, string>()
  if (linkedSessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from('one_on_one_sessions')
      .select('id, theme')
      .in('id', linkedSessionIds)
      .eq('tenant_id', user.tenant_id)
    for (const s of sessions ?? []) {
      sessionThemeMap.set(s.id, s.theme)
    }
  }

  const allEmployeeIds = [
    ...new Set([...data.map(d => d.employee_id), ...data.map(d => d.conducted_by_employee_id)]),
  ]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', allEmployeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => [
      e.id,
      {
        name: e.name ?? '',
        deptName: extractDepartmentName(
          e.divisions as { name: string } | { name: string }[] | null
        ),
      },
    ])
  )

  return data.map(d => {
    const employee = empMap.get(d.employee_id)
    const conductor = empMap.get(d.conducted_by_employee_id)
    return {
      id: d.id,
      employee_id: d.employee_id,
      employee_name: employee?.name ?? '',
      conducted_by_employee_id: d.conducted_by_employee_id,
      conducted_by_name: conductor?.name ?? '',
      department_name: employee?.deptName ?? null,
      theme: d.theme,
      career_aspiration: d.career_aspiration,
      notes: d.notes,
      next_date: d.next_date,
      evaluation_period_id: d.evaluation_period_id,
      conducted_at: d.conducted_at,
      one_on_one_session_id: d.one_on_one_session_id ?? null,
      linked_one_on_one_theme: d.one_on_one_session_id
        ? (sessionThemeMap.get(d.one_on_one_session_id) ?? null)
        : null,
    }
  })
}

/**
 * succession-plan連携用：指定した従業員それぞれの直近のキャリア面談を取得する（読み取り専用の参照パネル用）。
 * readinessへの自動反映は行わない。
 */
export async function getRecentCareerDiscussionsForEmployees(
  employeeIds: string[],
  limit = 3
): Promise<Record<string, CareerDiscussionRow[]>> {
  const user = await getServerUser()
  if (!user?.tenant_id || employeeIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('career_discussions')
    .select(
      'id, employee_id, conducted_by_employee_id, theme, career_aspiration, notes, next_date, evaluation_period_id, conducted_at'
    )
    .eq('tenant_id', user.tenant_id)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })

  if (error || !data) return {}

  const allEmployeeIds = [
    ...new Set([...data.map(d => d.employee_id), ...data.map(d => d.conducted_by_employee_id)]),
  ]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', allEmployeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => [
      e.id,
      {
        name: e.name ?? '',
        deptName: extractDepartmentName(
          e.divisions as { name: string } | { name: string }[] | null
        ),
      },
    ])
  )

  const byEmployee: Record<string, CareerDiscussionRow[]> = {}
  for (const d of data) {
    const list = byEmployee[d.employee_id] ?? []
    if (list.length >= limit) continue
    const employee = empMap.get(d.employee_id)
    const conductor = empMap.get(d.conducted_by_employee_id)
    list.push({
      id: d.id,
      employee_id: d.employee_id,
      employee_name: employee?.name ?? '',
      conducted_by_employee_id: d.conducted_by_employee_id,
      conducted_by_name: conductor?.name ?? '',
      department_name: employee?.deptName ?? null,
      theme: d.theme,
      career_aspiration: d.career_aspiration,
      notes: d.notes,
      next_date: d.next_date,
      evaluation_period_id: d.evaluation_period_id,
      conducted_at: d.conducted_at,
      one_on_one_session_id: null,
      linked_one_on_one_theme: null,
    })
    byEmployee[d.employee_id] = list
  }
  return byEmployee
}

/** テーマテンプレート一覧を取得する */
export async function getCareerDiscussionThemeTemplates(): Promise<
  CareerDiscussionThemeTemplate[]
> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('career_discussion_theme_templates')
    .select('id, tenant_id, name, description, sort_order, is_active, created_at')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order')

  if (error || !data) return []
  return data as CareerDiscussionThemeTemplate[]
}

/** evaluation連携用：評価期間の選択肢一覧を取得する（任意紐付け用） */
export async function getEvaluationPeriodOptions(): Promise<EvaluationPeriodOption[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('evaluation_periods')
    .select('id, fiscal_year, period_type')
    .eq('tenant_id', user.tenant_id)
    .order('fiscal_year', { ascending: false })

  if (error || !data) return []
  return data as EvaluationPeriodOption[]
}

const OVERDUE_DAYS = 90

/** 予約一覧を取得する（scheduled のみ、日時昇順） */
export async function getUpcomingCareerAppointments(filters?: {
  employeeId?: string
  scheduledByEmployeeId?: string
  includeAll?: boolean
}): Promise<CareerAppointmentRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  let query = supabase
    .from('career_discussion_appointments')
    .select(
      'id, employee_id, scheduled_by_employee_id, theme, scheduled_at, status, notes'
    )
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (filters?.employeeId) query = query.eq('employee_id', filters.employeeId)
  if (filters?.scheduledByEmployeeId) {
    query = query.eq('scheduled_by_employee_id', filters.scheduledByEmployeeId)
  }

  const { data, error } = await query
  if (error || !data || data.length === 0) return []

  const allEmployeeIds = [
    ...new Set([...data.map(d => d.employee_id), ...data.map(d => d.scheduled_by_employee_id)]),
  ]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', allEmployeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => [
      e.id,
      {
        name: e.name ?? '',
        deptName: extractDepartmentName(
          e.divisions as { name: string } | { name: string }[] | null
        ),
      },
    ])
  )

  return data.map(d => {
    const employee = empMap.get(d.employee_id)
    const scheduler = empMap.get(d.scheduled_by_employee_id)
    return {
      id: d.id,
      employee_id: d.employee_id,
      employee_name: employee?.name ?? '',
      scheduled_by_employee_id: d.scheduled_by_employee_id,
      scheduled_by_name: scheduler?.name ?? '',
      department_name: employee?.deptName ?? null,
      theme: d.theme,
      scheduled_at: d.scheduled_at,
      status: d.status as CareerAppointmentRow['status'],
      notes: d.notes,
    }
  })
}

/** 90日以上キャリア面談未実施の従業員（1on1 getOverdueEmployees と同方針） */
export async function getCareerOverdueEmployees(): Promise<CareerOverdueEmployee[]> {
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

  const { data: discussions } = await supabase
    .from('career_discussions')
    .select('employee_id, conducted_at')
    .eq('tenant_id', user.tenant_id)
    .in('employee_id', employeeIds)
    .order('conducted_at', { ascending: false })

  const latestByEmployee = new Map<string, string>()
  for (const d of discussions ?? []) {
    if (!latestByEmployee.has(d.employee_id)) {
      latestByEmployee.set(d.employee_id, d.conducted_at)
    }
  }

  const now = new Date()
  const overdue: CareerOverdueEmployee[] = []

  for (const emp of employees) {
    const lastAt = latestByEmployee.get(emp.id)
    const lastDate = lastAt ? new Date(lastAt) : null
    const daysOverdue = lastDate ? differenceInDays(now, lastDate) : 999

    if (daysOverdue >= OVERDUE_DAYS) {
      overdue.push({
        employee_id: emp.id,
        employee_name: emp.name ?? '',
        department_name: extractDepartmentName(
          emp.divisions as { name: string } | { name: string }[] | null
        ),
        last_discussion_at: lastAt ?? null,
        days_overdue: daysOverdue === 999 ? -1 : daysOverdue,
      })
    }
  }

  return overdue.sort((a, b) => b.days_overdue - a.days_overdue)
}
