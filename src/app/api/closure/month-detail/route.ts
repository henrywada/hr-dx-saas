import { NextResponse } from 'next/server'
import { formatDateInJST, formatTimeInJSTFromIso, lastDayOfMonthYmd } from '@/lib/datetime'
import { normalizeYearMonthToFirstDay, requireClosureHrContext } from '../_context'

export type ClosureMonthDetailRow = {
  no: number
  workDate: string
  workDateDisplay: string
  employeeNo: string
  employeeName: string
  clockIn: string | null
  clockOut: string | null
  approvedOvertimeHours: number | null
  approverName: string | null
  /** 残業申請の理由（同一日複数申請時は改行で連結） */
  overtimeReason: string | null
  /** 承認者コメント */
  supervisorComment: string | null
}

/**
 * GET: 対象月の打刻・承認済み残業を一覧（月次締め一覧の詳細モーダル用）
 */
export async function GET(request: Request) {
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

  const { searchParams } = new URL(request.url)
  const rawYm = searchParams.get('year_month')?.trim() ?? ''
  const ymd = normalizeYearMonthToFirstDay(rawYm)
  if (!ymd) {
    return NextResponse.json(
      { error: 'year_month は YYYY-MM 形式で指定してください' },
      { status: 400 },
    )
  }

  const ymKey = ymd.slice(0, 7)
  const monthEnd = lastDayOfMonthYmd(ymKey)
  const { supabase, tenantId } = ctx

  const [wtrResult, oaResult] = await Promise.all([
    supabase
      .from('work_time_records')
      .select(
        `
        id,
        record_date,
        start_time,
        end_time,
        employee_id,
        employees ( employee_no, name )
      `,
      )
      .eq('tenant_id', tenantId)
      .gte('record_date', ymd)
      .lte('record_date', monthEnd)
      .order('record_date', { ascending: true }),
    supabase
      .from('overtime_applications')
      .select(
        `
        id,
        work_date,
        requested_hours,
        employee_id,
        reason,
        supervisor_comment,
        emp:employees!overtime_applications_employee_id_fkey ( employee_no, name ),
        supervisor:employees!overtime_applications_supervisor_id_fkey ( name )
      `,
      )
      .eq('tenant_id', tenantId)
      .eq('status', '承認済')
      .gte('work_date', ymd)
      .lte('work_date', monthEnd),
  ])

  if (wtrResult.error) {
    console.error('month-detail wtr', wtrResult.error)
    return NextResponse.json({ error: '打刻データの取得に失敗しました' }, { status: 500 })
  }
  if (oaResult.error) {
    console.error('month-detail oa', oaResult.error)
    return NextResponse.json({ error: '残業申請の取得に失敗しました' }, { status: 500 })
  }

  type WtrEmp = { employee_no: string | null; name: string | null }
  type WtrRow = {
    id: string
    record_date: string
    start_time: string | null
    end_time: string | null
    employee_id: string
    employees: WtrEmp | WtrEmp[] | null
  }

  type OaRow = {
    work_date: string
    requested_hours: number
    employee_id: string
    reason: string | null
    supervisor_comment: string | null
    emp: { employee_no: string | null; name: string | null } | null
    supervisor: { name: string | null } | null
  }

  type OtAgg = {
    hours: number
    approverName: string | null
    reasons: string[]
    comments: string[]
  }

  const wtrRows = (wtrResult.data ?? []) as WtrRow[]
  const oaRows = (oaResult.data ?? []) as OaRow[]

  const otMap = new Map<string, OtAgg>()
  for (const oa of oaRows) {
    const wd = String(oa.work_date).slice(0, 10)
    const key = `${oa.employee_id}|${wd}`
    const sup = oa.supervisor?.name ?? null
    const r = oa.reason?.trim() || null
    const c = oa.supervisor_comment?.trim() || null
    const prev = otMap.get(key)
    const hrs = Number(oa.requested_hours)
    if (prev) {
      otMap.set(key, {
        hours: prev.hours + hrs,
        approverName: prev.approverName ?? sup,
        reasons: r ? [...prev.reasons, r] : prev.reasons,
        comments: c ? [...prev.comments, c] : prev.comments,
      })
    } else {
      otMap.set(key, {
        hours: hrs,
        approverName: sup,
        reasons: r ? [r] : [],
        comments: c ? [c] : [],
      })
    }
  }

  function otTexts(ot: OtAgg | undefined): { reason: string | null; comment: string | null } {
    if (!ot) return { reason: null, comment: null }
    const reason = ot.reasons.length > 0 ? ot.reasons.join('\n') : null
    const comment = ot.comments.length > 0 ? ot.comments.join('\n') : null
    return { reason, comment }
  }

  function empFromWtr(w: WtrRow): { no: string; name: string } {
    const e = w.employees
    const one = Array.isArray(e) ? e[0] : e
    return {
      no: one?.employee_no ?? '—',
      name: one?.name ?? '—',
    }
  }

  const wtrKeySet = new Set(
    wtrRows.map((w) => `${w.employee_id}|${String(w.record_date).slice(0, 10)}`),
  )

  const out: ClosureMonthDetailRow[] = []

  for (const w of wtrRows) {
    const rd = String(w.record_date).slice(0, 10)
    const key = `${w.employee_id}|${rd}`
    const ot = otMap.get(key)
    const emp = empFromWtr(w)
    const texts = otTexts(ot)
    out.push({
      no: 0,
      workDate: rd,
      workDateDisplay: formatDateInJST(`${rd}T12:00:00+09:00`),
      employeeNo: emp.no,
      employeeName: emp.name,
      clockIn: w.start_time ? formatTimeInJSTFromIso(w.start_time) : null,
      clockOut: w.end_time ? formatTimeInJSTFromIso(w.end_time) : null,
      approvedOvertimeHours: ot != null ? ot.hours : null,
      approverName: ot?.approverName ?? null,
      overtimeReason: texts.reason,
      supervisorComment: texts.comment,
    })
  }

  for (const [key, agg] of otMap) {
    if (wtrKeySet.has(key)) continue
    const oa = oaRows.find(
      (o) => `${o.employee_id}|${String(o.work_date).slice(0, 10)}` === key,
    )
    if (!oa) continue
    const wd = String(oa.work_date).slice(0, 10)
    const emp = oa.emp
    const tx = otTexts(agg)
    out.push({
      no: 0,
      workDate: wd,
      workDateDisplay: formatDateInJST(`${wd}T12:00:00+09:00`),
      employeeNo: emp?.employee_no ?? '—',
      employeeName: emp?.name ?? '—',
      clockIn: null,
      clockOut: null,
      approvedOvertimeHours: agg.hours,
      approverName: agg.approverName,
      overtimeReason: tx.reason,
      supervisorComment: tx.comment,
    })
  }

  out.sort((a, b) => {
    const c = a.workDate.localeCompare(b.workDate)
    if (c !== 0) return c
    return a.employeeNo.localeCompare(b.employeeNo, 'ja')
  })

  out.forEach((row, i) => {
    row.no = i + 1
  })

  return NextResponse.json({
    year_month: ymKey,
    rows: out,
  })
}
