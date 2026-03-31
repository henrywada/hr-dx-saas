/**
 * GET /api/overtime/applications — 残業申請一覧（テナント・月・フィルタ・ページネーション）
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { formatTimeInJSTFromIso, lastDayOfMonthYmd } from '@/lib/datetime'
import type { Database } from '@/lib/supabase/types'
import {
  fetchDivisionPeersForOvertimeList,
  fetchEmployeeIdsInDivision,
  getOvertimeListContext,
} from '@/app/api/overtime/_approver-auth'
import type {
  OvertimeApplication,
  OvertimeApplicationSource,
  OvertimeApplicationStatus,
} from '@/app/(tenant)/(default)/(overtime)/approval/types'
import {
  buildEmployeeWarningsMap,
  MONTHLY_WARNING_STATUSES,
  resolveOvertimeThresholds,
  type OvertimeSettingsRow,
} from '@/lib/overtime/thresholds'
import { monthlyClosureBlocksOvertimeApproval } from '@/lib/overtime/month-closure'

type WtrLite = {
  employee_id: string
  record_date: string
  start_time: string | null
  end_time: string | null
  is_holiday: boolean | null
  source: string | null
}

/** URL ステータスフィルタで受け付ける値（「未申請」は一覧生成専用） */
const FILTERABLE_STATUSES = ['申請中', '承認済', '却下', '修正依頼'] as const satisfies readonly string[]

/** 部署全員モード時の申請取得上限（超えた分は集計・行に含めない） */
const ALL_DIVISION_APPS_LIMIT = 2000

function mapWtrSourceToDisplay(source: string | null | undefined): OvertimeApplicationSource {
  if (source === 'csv_import') return 'csv'
  return 'manual'
}

/** supervisor_comment が無い旧データ向けに修正履歴の理由をフォールバック */
function resolveSupervisorComment(
  row: {
    supervisor_comment?: string | null
    overtime_corrections?:
      | { correction_reason?: string | null; corrected_at?: string | null }[]
      | null
  },
): string | undefined {
  const direct = row.supervisor_comment?.trim()
  if (direct) return direct
  const cors = row.overtime_corrections
  if (!Array.isArray(cors) || cors.length === 0) return undefined
  const sorted = [...cors].sort((a, b) =>
    (b.corrected_at ?? '').localeCompare(a.corrected_at ?? ''),
  )
  const reason = sorted[0]?.correction_reason?.trim()
  return reason || undefined
}

/** 警告用: employee_id ごとの requested_hours 合計 */
function sumRequestedHoursByEmployee(
  rows: { employee_id: string; requested_hours: number | null }[] | null,
): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows ?? []) {
    const id = r.employee_id
    const h = Number(r.requested_hours ?? 0)
    m.set(id, (m.get(id) ?? 0) + h)
  }
  return m
}

function buildApplicationRow(
  row: {
    id: string
    tenant_id: string
    employee_id: string
    work_date: string
    overtime_start: string
    overtime_end: string
    requested_hours: number
    reason: string | null
    status: string
    created_at: string | null
    updated_at: string | null
    supervisor_comment?: string | null
    overtime_corrections?:
      | { correction_reason?: string | null; corrected_at?: string | null }[]
      | null
  },
  employeeName: string,
  wtr: WtrLite | undefined,
  employeeNo?: string | null,
): OvertimeApplication {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    employee_id: row.employee_id,
    employee_name: employeeName,
    employee_no: employeeNo ?? undefined,
    work_date: row.work_date,
    clock_in: wtr?.start_time ? formatTimeInJSTFromIso(wtr.start_time) ?? undefined : undefined,
    clock_out: wtr?.end_time ? formatTimeInJSTFromIso(wtr.end_time) ?? undefined : undefined,
    is_holiday: wtr?.is_holiday === true,
    overtime_start: row.overtime_start,
    overtime_end: row.overtime_end,
    requested_hours: row.requested_hours != null ? Number(row.requested_hours) : undefined,
    reason: row.reason ?? undefined,
    source: mapWtrSourceToDisplay(wtr?.source),
    status: row.status as OvertimeApplicationStatus,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    supervisor_comment: resolveSupervisorComment(row),
  }
}

export async function handleOvertimeApplicationsList(
  request: Request,
  supabase: SupabaseClient<Database>,
): Promise<NextResponse> {
  const ctx = await getOvertimeListContext(supabase)
  if ('error' in ctx) {
    if (ctx.error === 'unauthorized') {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }
    return NextResponse.json({ error: '従業員情報が見つかりません' }, { status: 403 })
  }

  const url = new URL(request.url)
  const tenantIdParam = url.searchParams.get('tenant_id')
  const month = url.searchParams.get('month')

  if (!tenantIdParam || !month) {
    return NextResponse.json({ error: 'tenant_id と month は必須です' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'month は YYYY-MM 形式で指定してください' }, { status: 400 })
  }
  if (tenantIdParam !== ctx.tenantId) {
    return NextResponse.json({ error: 'テナントが一致しません' }, { status: 403 })
  }

  const firstDay = `${month}-01`
  const lastDay = lastDayOfMonthYmd(month)
  const year = month.slice(0, 4)
  const yearFirstDay = `${year}-01-01`

  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '10') || 10))
  /** 一覧空応答・非管理者応答で返す閾値（行なし＝労基法デフォルト） */
  const emptyThresholds = resolveOvertimeThresholds(null)

  if (!ctx.isManager) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      limit,
      month_approved_hours_total: 0,
      month_unapproved_hours_total: 0,
      overtime_thresholds: {
        monthly_limit_hours: emptyThresholds.monthly_limit_hours,
        monthly_warning_hours: emptyThresholds.monthly_warning_hours,
        annual_limit_hours: emptyThresholds.annual_limit_hours,
        average_limit_hours: emptyThresholds.average_limit_hours,
        source: emptyThresholds.source,
      },
      employee_overtime_warnings: {},
      employee_overtime_aggs: {},
      month_closure_blocks_overtime_approval: false,
    })
  }
  if (!ctx.divisionId) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      limit,
      month_approved_hours_total: 0,
      month_unapproved_hours_total: 0,
      overtime_thresholds: {
        monthly_limit_hours: emptyThresholds.monthly_limit_hours,
        monthly_warning_hours: emptyThresholds.monthly_warning_hours,
        annual_limit_hours: emptyThresholds.annual_limit_hours,
        average_limit_hours: emptyThresholds.average_limit_hours,
        source: emptyThresholds.source,
      },
      employee_overtime_warnings: {},
      employee_overtime_aggs: {},
      month_closure_blocks_overtime_approval: false,
    })
  }

  const { ids: peerIds, error: peerErr } = await fetchEmployeeIdsInDivision(
    supabase,
    ctx.tenantId,
    ctx.divisionId,
  )
  if (peerErr) {
    return NextResponse.json({ error: peerErr }, { status: 500 })
  }

  const { data: closureForMonth, error: closureErr } = await supabase
    .from('monthly_overtime_closures')
    .select('status')
    .eq('tenant_id', ctx.tenantId)
    .eq('year_month', firstDay)
    .maybeSingle()

  if (closureErr) {
    console.error('monthly_overtime_closures list:', closureErr)
    return NextResponse.json({ error: '月次締め状態の取得に失敗しました' }, { status: 500 })
  }

  const month_closure_blocks_overtime_approval = monthlyClosureBlocksOvertimeApproval(
    closureForMonth?.status,
  )

  if (peerIds.length === 0) {
    return NextResponse.json({
      items: [],
      total: 0,
      page,
      limit,
      month_approved_hours_total: 0,
      month_unapproved_hours_total: 0,
      overtime_thresholds: {
        monthly_limit_hours: emptyThresholds.monthly_limit_hours,
        monthly_warning_hours: emptyThresholds.monthly_warning_hours,
        annual_limit_hours: emptyThresholds.annual_limit_hours,
        average_limit_hours: emptyThresholds.average_limit_hours,
        source: emptyThresholds.source,
      },
      employee_overtime_warnings: {},
      employee_overtime_aggs: {},
      month_closure_blocks_overtime_approval,
    })
  }

  const statusParams = url.searchParams.getAll('status')
  const statuses: OvertimeApplicationStatus[] =
    statusParams.length > 0
      ? (statusParams.filter((s): s is OvertimeApplicationStatus =>
          (FILTERABLE_STATUSES as readonly string[]).includes(s),
        ) as OvertimeApplicationStatus[])
      : []

  const allDivisionEmployees =
    url.searchParams.get('all_division_employees') === '1' ||
    url.searchParams.get('all_division_employees') === 'true'

  /** 警告用集計は一覧のステータスフィルタに依存しない（承認判断の参考） */
  const overtimeSettingsPromise = supabase
    .from('overtime_settings')
    .select('monthly_limit_hours, monthly_warning_hours, annual_limit_hours, average_limit_hours')
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()

  const monthlyForWarningPromise = supabase
    .from('overtime_applications')
    .select('employee_id, requested_hours')
    .eq('tenant_id', ctx.tenantId)
    .in('employee_id', peerIds)
    .gte('work_date', firstDay)
    .lte('work_date', lastDay)
    .in('status', [...MONTHLY_WARNING_STATUSES])

  const ytdApprovedForWarningPromise = supabase
    .from('overtime_applications')
    .select('employee_id, requested_hours')
    .eq('tenant_id', ctx.tenantId)
    .in('employee_id', peerIds)
    .gte('work_date', yearFirstDay)
    .lte('work_date', lastDay)
    .eq('status', '承認済')

  const wtrMapPromise = supabase
    .from('work_time_records')
    .select('employee_id, record_date, start_time, end_time, is_holiday, source')
    .eq('tenant_id', ctx.tenantId)
    .gte('record_date', firstDay)
    .lte('record_date', lastDay)

  const approvedHoursPromise = supabase
    .from('overtime_applications')
    .select('requested_hours')
    .eq('tenant_id', ctx.tenantId)
    .in('employee_id', peerIds)
    .gte('work_date', firstDay)
    .lte('work_date', lastDay)
    .eq('status', '承認済')

  /** 承認済以外（申請中・却下・修正依頼など）の requested_hours 合計 */
  const unapprovedHoursPromise = supabase
    .from('overtime_applications')
    .select('requested_hours')
    .eq('tenant_id', ctx.tenantId)
    .in('employee_id', peerIds)
    .gte('work_date', firstDay)
    .lte('work_date', lastDay)
    .neq('status', '承認済')

  const from = (page - 1) * limit
  const to = from + limit - 1

  /** * で既存列のみ返す（supervisor_comment 未マイグレ時も 42703 にならない） */
  const selectApplications = `
      *,
      employee:employees!overtime_applications_employee_id_fkey ( name, employee_no ),
      overtime_corrections ( correction_reason, corrected_at )
    `

  /** 日付昇順 → 従業員番号（空は後ろ）→ 作成日時 */
  function compareApplicationsByDateThenEmployeeNo(a: OvertimeApplication, b: OvertimeApplication) {
    const dw = a.work_date.localeCompare(b.work_date)
    if (dw !== 0) return dw
    const na = (a.employee_no ?? '').trim()
    const nb = (b.employee_no ?? '').trim()
    const naKey = na === '' ? '\uffff' : na
    const nbKey = nb === '' ? '\uffff' : nb
    const dn = naKey.localeCompare(nbKey, 'ja', { numeric: true })
    if (dn !== 0) return dn
    const ca = a.created_at ?? ''
    const cb = b.created_at ?? ''
    return ca.localeCompare(cb)
  }

  type AppRow = Parameters<typeof buildApplicationRow>[0]
  type RowWithEmployee = AppRow & {
    employee: { name?: string | null; employee_no?: string | null } | null
  }

  let wtrRows: unknown[] | null = null
  let wtrErr: { message?: string } | null = null
  let approvedHourRows: { requested_hours: number | null }[] | null = null
  let approvedSumErr: { message?: string } | null = null
  let unapprovedHourRows: { requested_hours: number | null }[] | null = null
  let unapprovedSumErr: { message?: string } | null = null
  let items: OvertimeApplication[] = []
  let total = 0
  let overtimeSettingsData: OvertimeSettingsRow | null = null
  let overtimeSettingsErr: { message?: string } | null = null
  let monthlyWarnRows: { employee_id: string; requested_hours: number | null }[] | null = null
  let monthlyWarnErr: { message?: string } | null = null
  let ytdApprovedRows: { employee_id: string; requested_hours: number | null }[] | null = null
  let ytdApprovedErr: { message?: string } | null = null

  function buildWtrMap(rows: unknown[] | null): Map<string, WtrLite> {
    const m = new Map<string, WtrLite>()
    for (const r of rows ?? []) {
      const row = r as WtrLite
      m.set(`${row.employee_id}|${row.record_date}`, row)
    }
    return m
  }

  if (allDivisionEmployees) {
    const peersPromise = fetchDivisionPeersForOvertimeList(supabase, ctx.tenantId, ctx.divisionId)
    let allAppsQuery = supabase
      .from('overtime_applications')
      .select(selectApplications)
      .eq('tenant_id', ctx.tenantId)
      .in('employee_id', peerIds)
      .gte('work_date', firstDay)
      .lte('work_date', lastDay)
      .order('work_date', { ascending: true })
      .order('employee_no', { ascending: true, foreignTable: 'employees' })
      .order('created_at', { ascending: true })
      .limit(ALL_DIVISION_APPS_LIMIT)

    if (statuses.length > 0) {
      allAppsQuery = allAppsQuery.in('status', statuses)
    }

    const [wtrRes, peersRes, appsRes, apprRes, unapprRes, settingsRes, monthlyWarnRes, ytdWarnRes] =
      await Promise.all([
        wtrMapPromise,
        peersPromise,
        allAppsQuery,
        approvedHoursPromise,
        unapprovedHoursPromise,
        overtimeSettingsPromise,
        monthlyForWarningPromise,
        ytdApprovedForWarningPromise,
      ])

    wtrRows = wtrRes.data as unknown[] | null
    wtrErr = wtrRes.error
    approvedHourRows = apprRes.data
    approvedSumErr = apprRes.error
    unapprovedHourRows = unapprRes.data
    unapprovedSumErr = unapprRes.error

    overtimeSettingsData = settingsRes.data as OvertimeSettingsRow | null
    overtimeSettingsErr = settingsRes.error
    monthlyWarnRows = monthlyWarnRes.data
    monthlyWarnErr = monthlyWarnRes.error
    ytdApprovedRows = ytdWarnRes.data
    ytdApprovedErr = ytdWarnRes.error

    if (peersRes.error) {
      return NextResponse.json({ error: peersRes.error }, { status: 500 })
    }
    if (appsRes.error) {
      console.error('overtime_applications list (all division):', appsRes.error)
      return NextResponse.json({ error: '一覧の取得に失敗しました' }, { status: 500 })
    }
    if (wtrErr) {
      console.error('work_time_records:', wtrErr)
      return NextResponse.json({ error: '勤怠データの取得に失敗しました' }, { status: 500 })
    }

    const wtrMap = buildWtrMap(wtrRows)
    const peers = peersRes.peers ?? []
    const allRows = (appsRes.data ?? []) as RowWithEmployee[]
    const peerById = new Map(peers.map((p) => [p.id, p]))
    const hasApp = new Set(allRows.map((r) => r.employee_id))

    const merged: OvertimeApplication[] = []
    for (const row of allRows) {
      const peer = peerById.get(row.employee_id)
      const emp = row.employee
      const name = emp?.name?.trim() || peer?.name?.trim() || '（氏名未設定）'
      const empNo = emp?.employee_no?.trim() || peer?.employee_no?.trim() || null
      const w = wtrMap.get(`${row.employee_id}|${row.work_date}`)
      merged.push(buildApplicationRow(row, name, w, empNo))
    }
    for (const peer of peers) {
      if (!hasApp.has(peer.id)) {
        merged.push({
          id: `no-application:${peer.id}`,
          tenant_id: ctx.tenantId,
          employee_id: peer.id,
          employee_name: peer.name?.trim() || '（氏名未設定）',
          employee_no: peer.employee_no?.trim() || null,
          work_date: firstDay,
          status: '未申請',
        })
      }
    }

    merged.sort(compareApplicationsByDateThenEmployeeNo)
    total = merged.length
    items = merged.slice(from, from + limit)
  } else {
    let listQuery = supabase
      .from('overtime_applications')
      .select(selectApplications, { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .in('employee_id', peerIds)
      .gte('work_date', firstDay)
      .lte('work_date', lastDay)
      .order('work_date', { ascending: true })
      .order('employee_no', { ascending: true, foreignTable: 'employees' })
      .order('created_at', { ascending: true })

    if (statuses.length > 0) {
      listQuery = listQuery.in('status', statuses)
    }

    const [wtrRes, listRes, apprRes, unapprRes, settingsRes, monthlyWarnRes, ytdWarnRes] =
      await Promise.all([
        wtrMapPromise,
        listQuery.range(from, to),
        approvedHoursPromise,
        unapprovedHoursPromise,
        overtimeSettingsPromise,
        monthlyForWarningPromise,
        ytdApprovedForWarningPromise,
      ])

    wtrRows = wtrRes.data as unknown[] | null
    wtrErr = wtrRes.error
    approvedHourRows = apprRes.data
    approvedSumErr = apprRes.error
    unapprovedHourRows = unapprRes.data
    unapprovedSumErr = unapprRes.error
    overtimeSettingsData = settingsRes.data as OvertimeSettingsRow | null
    overtimeSettingsErr = settingsRes.error
    monthlyWarnRows = monthlyWarnRes.data
    monthlyWarnErr = monthlyWarnRes.error
    ytdApprovedRows = ytdWarnRes.data
    ytdApprovedErr = ytdWarnRes.error

    const { data: rows, error, count } = listRes

    if (error) {
      console.error('overtime_applications list:', error)
      return NextResponse.json({ error: '一覧の取得に失敗しました' }, { status: 500 })
    }
    if (wtrErr) {
      console.error('work_time_records:', wtrErr)
      return NextResponse.json({ error: '勤怠データの取得に失敗しました' }, { status: 500 })
    }

    const wtrMap = buildWtrMap(wtrRows)
    total = count ?? 0
    items = ((rows ?? []) as RowWithEmployee[]).map((row) => {
      const emp = row.employee
      const name = emp?.name?.trim() || '（氏名未設定）'
      const empNo = emp?.employee_no?.trim() || null
      const w = wtrMap.get(`${row.employee_id}|${row.work_date}`)
      return buildApplicationRow(row, name, w, empNo)
    })
  }

  if (approvedSumErr) {
    console.error('overtime_applications approved sum:', approvedSumErr)
    return NextResponse.json({ error: '集計の取得に失敗しました' }, { status: 500 })
  }

  if (unapprovedSumErr) {
    console.error('overtime_applications unapproved sum:', unapprovedSumErr)
    return NextResponse.json({ error: '集計の取得に失敗しました' }, { status: 500 })
  }

  if (overtimeSettingsErr) {
    console.error('overtime_settings list:', overtimeSettingsErr)
  }
  if (monthlyWarnErr) {
    console.error('overtime_applications monthly warning sum:', monthlyWarnErr)
    return NextResponse.json({ error: '閾値判定用の集計に失敗しました' }, { status: 500 })
  }
  if (ytdApprovedErr) {
    console.error('overtime_applications ytd approved sum:', ytdApprovedErr)
    return NextResponse.json({ error: '閾値判定用の集計に失敗しました' }, { status: 500 })
  }

  const thresholds = resolveOvertimeThresholds(
    overtimeSettingsErr ? null : overtimeSettingsData,
  )
  const monthlyByEmployee = sumRequestedHoursByEmployee(monthlyWarnRows)
  const ytdByEmployee = sumRequestedHoursByEmployee(ytdApprovedRows)
  const employeeOvertimeWarnings = buildEmployeeWarningsMap(
    thresholds,
    peerIds,
    monthlyByEmployee,
    ytdByEmployee,
  )

  const pageEmployeeIds = [...new Set(items.map((i) => i.employee_id))]
  const employeeOvertimeAggs: Record<
    string,
    { monthly_requested: number; ytd_approved: number }
  > = {}
  for (const id of pageEmployeeIds) {
    employeeOvertimeAggs[id] = {
      monthly_requested: Math.round((monthlyByEmployee.get(id) ?? 0) * 100) / 100,
      ytd_approved: Math.round((ytdByEmployee.get(id) ?? 0) * 100) / 100,
    }
  }

  const monthApprovedHoursTotal = (approvedHourRows ?? []).reduce(
    (acc, r) => acc + Number(r.requested_hours ?? 0),
    0,
  )
  const monthApprovedHoursRounded = Math.round(monthApprovedHoursTotal * 100) / 100

  const monthUnapprovedHoursTotal = (unapprovedHourRows ?? []).reduce(
    (acc, r) => acc + Number(r.requested_hours ?? 0),
    0,
  )
  const monthUnapprovedHoursRounded = Math.round(monthUnapprovedHoursTotal * 100) / 100

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    month_approved_hours_total: monthApprovedHoursRounded,
    month_unapproved_hours_total: monthUnapprovedHoursRounded,
    overtime_thresholds: {
      monthly_limit_hours: thresholds.monthly_limit_hours,
      monthly_warning_hours: thresholds.monthly_warning_hours,
      annual_limit_hours: thresholds.annual_limit_hours,
      average_limit_hours: thresholds.average_limit_hours,
      source: thresholds.source,
    },
    employee_overtime_warnings: employeeOvertimeWarnings,
    employee_overtime_aggs: employeeOvertimeAggs,
    month_closure_blocks_overtime_approval,
  })
}
