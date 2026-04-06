'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getAttendanceStatusTier, statusTierSortRank } from './status'
import type {
  AttendanceActionResult,
  EmployeeAttendanceListFilters,
  EmployeeAttendancePageResult,
  EmployeeAttendanceRow,
  ExportAttendanceCsvResult,
  HrAlertStatusUi,
  HrOvertimeAlertView,
  MonthlyStatsView,
  OvertimeAlertRow,
  OverviewStats,
  WorkTimeRecordRow,
} from './types'
import { alertTypeSeverity } from './types'
import { canAccessHrAttendanceDashboard } from './hr-dashboard-access'

/** YYYY-MM の暦上の末日 YYYY-MM-DD */
function lastDayOfCalendarMonth(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function periodMonthDate(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

type AttendanceCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>
  employeeId: string
}

async function requireEmployeeContext(): Promise<AttendanceActionResult<AttendanceCtx>> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }

  const supabase = await createClient()
  let employeeId = user.employee_id

  if (!employeeId) {
    const { data: emp, error } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error || !emp) {
      return { ok: false, error: '従業員情報が見つかりません。管理者にお問い合わせください。' }
    }
    employeeId = (emp as { id: string }).id
  }

  return { ok: true, data: { supabase, employeeId } }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase
}

/**
 * 月次集計（overtime_monthly_stats）。無い場合は work_time_records から合算。
 */
export async function getMonthlyStats(
  year: number,
  month: number,
): Promise<AttendanceActionResult<MonthlyStatsView>> {
  const ctx = await requireEmployeeContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }

  const { supabase, employeeId } = ctx.data
  const period = periodMonthDate(year, month)
  const start = period
  const end = lastDayOfCalendarMonth(year, month)

  try {
    const { data: statRow, error: statErr } = await db(supabase)
      .from('overtime_monthly_stats')
      .select(
        'total_minutes, overtime_minutes, holiday_minutes, period_month',
      )
      .eq('employee_id', employeeId)
      .eq('period_month', period)
      .maybeSingle()

    if (statErr) {
      return { ok: false, error: statErr.message }
    }

    if (statRow) {
      const total = Number(statRow.total_minutes ?? 0)
      const ot = Number(statRow.overtime_minutes ?? 0)
      const hol = Number(statRow.holiday_minutes ?? 0)

      const { data: dayRows } = await db(supabase)
        .from('work_time_records')
        .select('record_date')
        .eq('employee_id', employeeId)
        .gte('record_date', start)
        .lte('record_date', end)

      const distinctDays = new Set(
        (dayRows as { record_date: string }[] | null)?.map((r) => r.record_date) ??
          [],
      ).size

      return {
        ok: true,
        data: {
          total_work_minutes: total,
          overtime_minutes: ot,
          holiday_work_minutes: hol,
          avg_daily_work_minutes:
            distinctDays > 0 ? Math.round(total / distinctDays) : null,
          source: 'monthly_table',
        },
      }
    }

    const { data: records, error: recErr } = await db(supabase)
      .from('work_time_records')
      .select('duration_minutes, is_holiday, record_date')
      .eq('employee_id', employeeId)
      .gte('record_date', start)
      .lte('record_date', end)
      .order('record_date', { ascending: true })

    if (recErr) {
      return { ok: false, error: recErr.message }
    }

    const list = (records ?? []) as {
      duration_minutes: number
      is_holiday: boolean | null
      record_date: string
    }[]

    let totalM = 0
    let holidayM = 0
    const days = new Set<string>()
    for (const r of list) {
      totalM += Number(r.duration_minutes ?? 0)
      days.add(r.record_date)
      if (r.is_holiday) {
        holidayM += Number(r.duration_minutes ?? 0)
      }
    }

    const dCount = days.size
    return {
      ok: true,
      data: {
        total_work_minutes: totalM,
        overtime_minutes: 0,
        holiday_work_minutes: holidayM,
        avg_daily_work_minutes: dCount > 0 ? Math.round(totalM / dCount) : null,
        source: 'aggregated',
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return {
      ok: false,
      error: `テーブルが利用できない可能性があります: ${msg}`,
    }
  }
}

export async function getMonthlyRecords(
  year: number,
  month: number,
): Promise<AttendanceActionResult<WorkTimeRecordRow[]>> {
  const ctx = await requireEmployeeContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }

  const { supabase, employeeId } = ctx.data
  const start = periodMonthDate(year, month)
  const end = lastDayOfCalendarMonth(year, month)

  try {
    const { data, error } = await db(supabase)
      .from('work_time_records')
      .select(
        'id, tenant_id, employee_id, record_date, start_time, end_time, duration_minutes, is_holiday, source, created_at',
      )
      .eq('employee_id', employeeId)
      .gte('record_date', start)
      .lte('record_date', end)
      .order('record_date', { ascending: true })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, data: (data ?? []) as WorkTimeRecordRow[] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}

/**
 * 同一日複数行は created_at 降順で先頭1件（DB上は通常1日1行想定）
 */
export async function getDailyRecord(
  workDate: string,
): Promise<AttendanceActionResult<WorkTimeRecordRow | null>> {
  const ctx = await requireEmployeeContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }

  const { supabase, employeeId } = ctx.data

  try {
    const { data, error } = await db(supabase)
      .from('work_time_records')
      .select(
        'id, tenant_id, employee_id, record_date, start_time, end_time, duration_minutes, is_holiday, source, created_at',
      )
      .eq('employee_id', employeeId)
      .eq('record_date', workDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true, data: data as WorkTimeRecordRow | null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}

/**
 * 未解決アラート。year/month 指定時は triggered_at がその暦月に含まれるものに限定。
 */
export async function getUnresolvedAlerts(
  year?: number,
  month?: number,
): Promise<AttendanceActionResult<OvertimeAlertRow[]>> {
  const ctx = await requireEmployeeContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }

  const { supabase, employeeId } = ctx.data

  try {
    let q = db(supabase)
      .from('overtime_alerts')
      .select(
        'id, tenant_id, employee_id, alert_type, alert_value, triggered_at, resolved_at',
      )
      .eq('employee_id', employeeId)
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })

    if (year != null && month != null) {
      const start = `${periodMonthDate(year, month)}T00:00:00+09:00`
      const nm = month === 12 ? 1 : month + 1
      const ny = month === 12 ? year + 1 : year
      const endExclusive = `${periodMonthDate(ny, nm)}T00:00:00+09:00`
      q = q.gte('triggered_at', start).lt('triggered_at', endExclusive)
    }

    const { data, error } = await q

    if (error) {
      return { ok: false, error: error.message }
    }

    return {
      ok: true,
      data: (data ?? []) as OvertimeAlertRow[],
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}

// =============================================================================
// 人事向け勤怠ダッシュボード
// =============================================================================

type HrAttendanceCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>
}

async function requireHrAttendanceContext(): Promise<
  AttendanceActionResult<HrAttendanceCtx>
> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    return {
      ok: false,
      error: 'この機能は人事（hr / hr_manager）、テナント管理者、または開発者ロールのみ利用できます。',
    }
  }
  const supabase = await createClient()
  return { ok: true, data: { supabase } }
}

function addCalendarMonths(year: number, month: number, delta: number): { y: number; m: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

/** 指定月を終端とする過去 n ヶ月の period_month（YYYY-MM-01） */
function lastNPeriodMonths(year: number, month: number, n: number): string[] {
  const out: string[] = []
  let y = year
  let m = month
  for (let i = 0; i < n; i++) {
    out.push(periodMonthDate(y, m))
    const prev = addCalendarMonths(y, m, -1)
    y = prev.y
    m = prev.m
  }
  return out
}

const M45 = 45 * 60
const M80 = 80 * 60
const M360Y = 360 * 60

type EmpRow = {
  id: string
  employeeNo: string | null
  name: string
  divisionId: string | null
  divisionName: string
  jobTitle: string | null
}

type OtStatRow = {
  employee_id: string
  total_minutes: number
  overtime_minutes: number
  holiday_minutes: number
}

function alertTypeLabelJp(alertType: string): string {
  const map: Record<string, string> = {
    annual_ot_360_exceeded: '年360時間超',
    yearly_360_exceeded: '年360時間超',
    monthly_ot_100_exceeded: '月100時間超',
    monthly_100_exceeded: '月100時間超',
    rolling_6m_avg_80_exceeded: '2〜6ヶ月平均80時間超',
    rolling_6m_80_exceeded: '2〜6ヶ月平均80時間超',
    monthly_ot_45_exceeded: '月45時間超',
    monthly_45_exceeded: '月45時間超',
    monthly_overtime_warning: '残業注意',
  }
  return map[alertType] ?? alertType
}

function formatThresholdDisplay(alertValue: Record<string, unknown> | null): string {
  if (!alertValue) return '-'
  const th = alertValue.threshold_hours ?? alertValue.threshold
  const ac = alertValue.actual_hours ?? alertValue.actual
  if (typeof th === 'number' && typeof ac === 'number') return `${th}h / ${ac}h`
  if (typeof th === 'number' && typeof ac === 'string') return `${th}h / ${ac}`
  if (typeof th === 'string' && typeof ac === 'number') return `${th} / ${ac}h`
  if (typeof th === 'number') return `${th}h / -`
  if (typeof ac === 'number') return `- / ${ac}h`
  return '-'
}

function alertStatusUiFromValue(alertValue: Record<string, unknown> | null): HrAlertStatusUi {
  if (alertValue?.status === 'in_progress') return 'in_progress'
  return 'open'
}

/** 人事ダッシュ用の従業員別行を組み立て（一覧・CSV・サマリーで共用） */
async function buildEmployeeAttendanceRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  month: number,
): Promise<AttendanceActionResult<EmployeeAttendanceRow[]>> {
  const period = periodMonthDate(year, month)
  const start = period
  const end = lastDayOfCalendarMonth(year, month)
  const triggeredStart = `${period}T00:00:00+09:00`
  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year
  const triggeredEndEx = `${periodMonthDate(ny, nm)}T00:00:00+09:00`

  try {
    const { data: empRows, error: empErr } = await db(supabase)
      .from('employees')
      .select('id, employee_no, name, job_title, division_id, divisions:division_id(name)')
    if (empErr) {
      return { ok: false, error: empErr.message }
    }

    const employees: EmpRow[] = (empRows ?? []).map(
      (r: {
        id: string
        employee_no: string | null
        name: string | null
        division_id: string | null
        job_title: string | null
        divisions: { name: string | null } | null
      }) => ({
        id: r.id,
        employeeNo: r.employee_no?.trim() ? r.employee_no.trim() : null,
        name: r.name ?? '（無名）',
        divisionId: r.division_id,
        divisionName: r.divisions?.name ?? '—',
        jobTitle: r.job_title ?? null,
      }),
    )

    const { data: statRows, error: statErr } = await db(supabase)
      .from('overtime_monthly_stats')
      .select('employee_id, total_minutes, overtime_minutes, holiday_minutes')
      .eq('period_month', period)
    if (statErr) {
      return { ok: false, error: statErr.message }
    }

    const statByEmp = new Map<string, OtStatRow>()
    for (const s of (statRows ?? []) as OtStatRow[]) {
      statByEmp.set(s.employee_id, s)
    }

    const { data: workRows, error: workErr } = await db(supabase)
      .from('work_time_records')
      .select('employee_id, duration_minutes, is_holiday')
      .gte('record_date', start)
      .lte('record_date', end)
    if (workErr) {
      return { ok: false, error: workErr.message }
    }

    const { data: otAppRows, error: otAppErr } = await db(supabase)
      .from('overtime_applications')
      .select('employee_id, status, requested_hours')
      .gte('work_date', start)
      .lte('work_date', end)
    if (otAppErr) {
      return { ok: false, error: otAppErr.message }
    }

    /** 従業員別: 承認済 / 却下 / 申請中 の requested_hours（時間）合計 */
    const otHoursByEmp = new Map<
      string,
      { approved: number; rejected: number; pending: number }
    >()
    for (const o of (otAppRows ?? []) as {
      employee_id: string
      status: string
      requested_hours: number | null
    }[]) {
      const h = Number(o.requested_hours ?? 0)
      const cur = otHoursByEmp.get(o.employee_id) ?? {
        approved: 0,
        rejected: 0,
        pending: 0,
      }
      if (o.status === '承認済') cur.approved += h
      else if (o.status === '却下') cur.rejected += h
      else if (o.status === '申請中') cur.pending += h
      otHoursByEmp.set(o.employee_id, cur)
    }

    type WorkAgg = { total: number; holiday: number }
    const workAgg = new Map<string, WorkAgg>()
    const workRecordCountByEmp = new Map<string, number>()
    for (const w of (workRows ?? []) as {
      employee_id: string
      duration_minutes: number
      is_holiday: boolean | null
    }[]) {
      const eid = w.employee_id
      workRecordCountByEmp.set(eid, (workRecordCountByEmp.get(eid) ?? 0) + 1)
      const cur = workAgg.get(eid) ?? { total: 0, holiday: 0 }
      const dm = Number(w.duration_minutes ?? 0)
      cur.total += dm
      if (w.is_holiday) cur.holiday += dm
      workAgg.set(eid, cur)
    }

    const { data: alertsMonth, error: amErr } = await db(supabase)
      .from('overtime_alerts')
      .select('employee_id')
      .gte('triggered_at', triggeredStart)
      .lt('triggered_at', triggeredEndEx)
    if (amErr) {
      return { ok: false, error: amErr.message }
    }
    const alertCountInMonth = new Map<string, number>()
    for (const a of (alertsMonth ?? []) as { employee_id: string }[]) {
      alertCountInMonth.set(a.employee_id, (alertCountInMonth.get(a.employee_id) ?? 0) + 1)
    }

    const { data: alertsUnres, error: auErr } = await db(supabase)
      .from('overtime_alerts')
      .select('employee_id')
      .is('resolved_at', null)
    if (auErr) {
      return { ok: false, error: auErr.message }
    }
    const unresolvedCountByEmp = new Map<string, number>()
    for (const a of (alertsUnres ?? []) as { employee_id: string }[]) {
      unresolvedCountByEmp.set(a.employee_id, (unresolvedCountByEmp.get(a.employee_id) ?? 0) + 1)
    }

    const sixPeriods = lastNPeriodMonths(year, month, 6)
    const yearPeriods = Array.from({ length: 12 }, (_, i) => periodMonthDate(year, i + 1))
    const allPeriods = Array.from(new Set([...sixPeriods, ...yearPeriods]))

    const { data: multiStats, error: msErr } = await db(supabase)
      .from('overtime_monthly_stats')
      .select('employee_id, period_month, overtime_minutes')
      .in('period_month', allPeriods)
    if (msErr) {
      return { ok: false, error: msErr.message }
    }

    type MultiMap = Map<string, Map<string, number>>
    const otByEmpPeriod: MultiMap = new Map()
    for (const row of (multiStats ?? []) as {
      employee_id: string
      period_month: string
      overtime_minutes: number
    }[]) {
      let inner = otByEmpPeriod.get(row.employee_id)
      if (!inner) {
        inner = new Map()
        otByEmpPeriod.set(row.employee_id, inner)
      }
      inner.set(row.period_month, Number(row.overtime_minutes ?? 0))
    }

    const rows: EmployeeAttendanceRow[] = []

    for (const emp of employees) {
      const st = statByEmp.get(emp.id)
      const otH = otHoursByEmp.get(emp.id)
      const otApprovedMinutes = Math.round((otH?.approved ?? 0) * 60)
      const otRejectedMinutes = Math.round((otH?.rejected ?? 0) * 60)
      const otPendingMinutes = Math.round((otH?.pending ?? 0) * 60)

      /** ステータス tier・法令リスク用（月次集計、または承認済申請の大きい方を採用） */
      const currentOtMinutes = Math.max(
        st ? Number(st.overtime_minutes ?? 0) : 0,
        otApprovedMinutes
      )

      const inner = otByEmpPeriod.get(emp.id)
      let sum6 = 0
      for (const p of sixPeriods) {
        sum6 += inner?.get(p) ?? 0
      }
      const sixMonthAvg = Math.round(sum6 / 6)

      let sumYear = 0
      for (const p of yearPeriods) {
        sumYear += inner?.get(p) ?? 0
      }

      const legalRisk =
        currentOtMinutes > M45 || sixMonthAvg > M80 || sumYear > M360Y

      const statusTier = getAttendanceStatusTier(currentOtMinutes, legalRisk)

      rows.push({
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        name: emp.name,
        divisionId: emp.divisionId,
        divisionName: emp.divisionName,
        jobTitle: emp.jobTitle,
        otApprovedMinutes,
        otRejectedMinutes,
        otPendingMinutes,
        hasWorkTimeRecordsInMonth: (workRecordCountByEmp.get(emp.id) ?? 0) > 0,
        alertCountInMonth: alertCountInMonth.get(emp.id) ?? 0,
        unresolvedAlertCount: unresolvedCountByEmp.get(emp.id) ?? 0,
        statusTier,
        legalRisk,
      })
    }

    return { ok: true, data: rows }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return {
      ok: false,
      error: `テーブルが利用できない可能性があります: ${msg}`,
    }
  }
}

async function computeOverviewFromRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  list: EmployeeAttendanceRow[],
): Promise<AttendanceActionResult<OverviewStats>> {
  const n = list.length
  const sumOt = list.reduce((a, r) => a + r.otApprovedMinutes, 0)
  const avgOvertimeMinutes = n > 0 ? Math.round(sumOt / n) : 0

  let unresolvedAlertCount = 0
  try {
    const { count, error } = await db(supabase)
      .from('overtime_alerts')
      .select('*', { count: 'exact', head: true })
      .is('resolved_at', null)
    if (error) {
      return { ok: false, error: error.message }
    }
    unresolvedAlertCount = count ?? 0
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }

  const employeeIdsLegalRisk = list.filter((r) => r.legalRisk).map((r) => r.employeeId)
  const employeeIdsWithUnresolvedAlerts = list
    .filter((r) => r.unresolvedAlertCount > 0)
    .map((r) => r.employeeId)
  const employeeIdsAboveAvgOvertime = list
    .filter((r) => r.otApprovedMinutes > avgOvertimeMinutes)
    .map((r) => r.employeeId)

  const data: OverviewStats = {
    totalEmployees: n,
    avgOvertimeMinutes,
    unresolvedAlertCount,
    legalRiskEmployeeCount: employeeIdsLegalRisk.length,
    employeeIdsLegalRisk,
    employeeIdsWithUnresolvedAlerts,
    employeeIdsAboveAvgOvertime,
  }
  return { ok: true, data }
}

export async function getOverviewStats(
  year: number,
  month: number,
): Promise<AttendanceActionResult<OverviewStats>> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  const built = await buildEmployeeAttendanceRows(supabase, year, month)
  if (built.ok === false) {
    return { ok: false, error: built.error }
  }
  return computeOverviewFromRows(supabase, built.data)
}

/** 初回表示用: 行データを1回だけ組み立て overview + 既定ページを返す */
export async function getAttendanceDashboardBundle(
  year: number,
  month: number,
): Promise<
  AttendanceActionResult<{
    overview: OverviewStats
    initialList: EmployeeAttendancePageResult
  }>
> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  const built = await buildEmployeeAttendanceRows(supabase, year, month)
  if (built.ok === false) {
    return { ok: false, error: built.error }
  }
  const baseRows = built.data
  const overviewRes = await computeOverviewFromRows(supabase, baseRows)
  if (overviewRes.ok === false) {
    return { ok: false, error: overviewRes.error }
  }

  const sorted = [...baseRows].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  const initialList: EmployeeAttendancePageResult = {
    rows: sorted.slice(0, 20),
    total: sorted.length,
  }

  return {
    ok: true,
    data: {
      overview: overviewRes.data,
      initialList,
    },
  }
}

export async function getUnresolvedAlertsList(
  limit?: number,
): Promise<AttendanceActionResult<HrOvertimeAlertView[]>> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  try {
    const { data: alerts, error } = await db(supabase)
      .from('overtime_alerts')
      .select('id, employee_id, alert_type, alert_value, triggered_at, resolved_at')
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false })

    if (error) {
      return { ok: false, error: error.message }
    }

    const list = (alerts ?? []) as OvertimeAlertRow[]
    list.sort((a, b) => {
      const ds = alertTypeSeverity(b.alert_type) - alertTypeSeverity(a.alert_type)
      if (ds !== 0) return ds
      const ta = a.triggered_at ?? ''
      const tb = b.triggered_at ?? ''
      return tb.localeCompare(ta)
    })

    const sliced = limit != null ? list.slice(0, limit) : list
    const empIds = Array.from(new Set(sliced.map((a) => a.employee_id)))

    const nameByEmp = new Map<string, string>()
    if (empIds.length > 0) {
      const { data: emps, error: e2 } = await db(supabase)
        .from('employees')
        .select('id, name')
        .in('id', empIds)
      if (e2) {
        return { ok: false, error: e2.message }
      }
      for (const e of (emps ?? []) as { id: string; name: string | null }[]) {
        nameByEmp.set(e.id, e.name ?? '（無名）')
      }
    }

    const views: HrOvertimeAlertView[] = sliced.map((a) => ({
      id: a.id,
      employeeId: a.employee_id,
      employeeName: nameByEmp.get(a.employee_id) ?? '—',
      alertType: a.alert_type,
      alertTypeLabel: alertTypeLabelJp(a.alert_type),
      thresholdDisplay: formatThresholdDisplay(a.alert_value),
      triggeredAt: a.triggered_at,
      statusUi: alertStatusUiFromValue(a.alert_value),
      alertValue: a.alert_value,
    }))

    return { ok: true, data: views }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}

function matchesOverviewFilter(
  row: EmployeeAttendanceRow,
  filter: EmployeeAttendanceListFilters['overviewFilter'],
  avgOvertimeMinutes: number,
): boolean {
  if (!filter || filter === 'all') return true
  if (filter === 'legal_risk') return row.legalRisk
  if (filter === 'unresolved_alerts') return row.unresolvedAlertCount > 0
  if (filter === 'above_avg_ot') return row.otApprovedMinutes > avgOvertimeMinutes
  return true
}

function sortEmployeeRows(
  rows: EmployeeAttendanceRow[],
  sortKey: NonNullable<EmployeeAttendanceListFilters['sortKey']>,
  sortDir: 'asc' | 'desc',
): void {
  const dir = sortDir === 'desc' ? -1 : 1
  rows.sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'ja')
        break
      case 'employee_no': {
        const an = (a.employeeNo ?? '').trim()
        const bn = (b.employeeNo ?? '').trim()
        if (!an && !bn) cmp = 0
        else if (!an) cmp = 1
        else if (!bn) cmp = -1
        else cmp = an.localeCompare(bn, 'ja', { numeric: true })
        break
      }
      case 'division':
        cmp = a.divisionName.localeCompare(b.divisionName, 'ja')
        break
      case 'total_minutes':
        cmp = a.otApprovedMinutes - b.otApprovedMinutes
        break
      case 'overtime_minutes':
        cmp = a.otRejectedMinutes - b.otRejectedMinutes
        break
      case 'holiday_minutes':
        cmp = a.otPendingMinutes - b.otPendingMinutes
        break
      case 'alert_count':
        cmp = a.alertCountInMonth - b.alertCountInMonth
        break
      case 'status':
        cmp = statusTierSortRank(a.statusTier) - statusTierSortRank(b.statusTier)
        break
      default:
        cmp = 0
    }
    return cmp * dir
  })
}

export async function getEmployeeAttendanceList(
  year: number,
  month: number,
  filters?: EmployeeAttendanceListFilters,
): Promise<AttendanceActionResult<EmployeeAttendancePageResult>> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  const built = await buildEmployeeAttendanceRows(supabase, year, month)
  if (built.ok === false) {
    return { ok: false, error: built.error }
  }
  let rows = built.data
  const nAll = rows.length
  const sumOt = rows.reduce((a, r) => a + r.otApprovedMinutes, 0)
  const avgOvertimeMinutes = nAll > 0 ? Math.round(sumOt / nAll) : 0

  const f = filters ?? {}
  const nameQ = (f.nameSearch ?? '').trim().toLowerCase()
  if (nameQ) {
    rows = rows.filter((r) => r.name.toLowerCase().includes(nameQ))
  }

  rows = rows.filter((r) => matchesOverviewFilter(r, f.overviewFilter, avgOvertimeMinutes))

  if (f.statusTier) {
    rows = rows.filter((r) => r.statusTier === f.statusTier)
  }

  if (f.divisionId) {
    rows = rows.filter((r) => r.divisionId === f.divisionId)
  }

  const sortKey = f.sortKey ?? 'name'
  const sortDir = f.sortDir ?? 'asc'
  sortEmployeeRows(rows, sortKey, sortDir)

  const total = rows.length
  const offset = Math.max(0, f.offset ?? 0)
  const limit = Math.min(200, Math.max(1, f.limit ?? 20))
  const pageRows = rows.slice(offset, offset + limit)

  return { ok: true, data: { rows: pageRows, total } }
}

export async function resolveAlert(alertId: string): Promise<AttendanceActionResult<void>> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  try {
    const { error } = await db(supabase)
      .from('overtime_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', alertId)

    if (error) {
      return { ok: false, error: error.message }
    }
    revalidatePath('/adm/attendance/dashboard')
    return { ok: true, data: undefined }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function minutesToHoursLabel(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

export async function exportAttendanceCSV(
  year: number,
  month: number,
): Promise<ExportAttendanceCsvResult> {
  const ctx = await requireHrAttendanceContext()
  if (ctx.ok === false) {
    return { ok: false, error: ctx.error }
  }
  const { supabase } = ctx.data

  const built = await buildEmployeeAttendanceRows(supabase, year, month)
  if (built.ok === false) {
    return { ok: false, error: built.error }
  }
  const rows = built.data
  const header = [
    '従業員名',
    '部署',
    '残業（承認）(時間:分)',
    '残業（却下）(時間:分)',
    '残業（申請中）(時間:分)',
    'アラート件数',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    const line = [
      escapeCsvField(r.name),
      escapeCsvField(r.divisionName),
      escapeCsvField(minutesToHoursLabel(r.otApprovedMinutes)),
      escapeCsvField(minutesToHoursLabel(r.otRejectedMinutes)),
      escapeCsvField(minutesToHoursLabel(r.otPendingMinutes)),
      String(r.alertCountInMonth),
    ].join(',')
    lines.push(line)
  }
  const csvBody = lines.join('\r\n')
  const csvText = `\uFEFF${csvBody}`
  const filename = `勤怠データ_${year}-${String(month).padStart(2, '0')}.csv`
  return { ok: true, csvText, filename }
}
