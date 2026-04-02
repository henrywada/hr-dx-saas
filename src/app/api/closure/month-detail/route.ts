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
  /** requested_hours 合計（全ステータス）を分に換算 — 表示は h:mm */
  overtimeRequestedTotalMinutes: number | null
  /** 同一日・同一社員の残業申請の status（複数は「・」区切り） */
  overtimeApplicationStatus: string | null
  approverName: string | null
  /** overtime_applications.reason（同一日複数申請時は改行で連結） */
  overtimeReason: string | null
  /** 承認者コメント（DB: supervisor_comment。同一日複数申請時は改行で連結） */
  supervisorRecommend: string | null
}

/** 一覧表示用: 複数ステータスの並び */
const OA_STATUS_ORDER = ['申請中', '修正依頼', '承認済', '却下'] as const

function formatOvertimeStatuses(statuses: Set<string>): string {
  const arr = [...statuses].sort((a, b) => {
    const ia = OA_STATUS_ORDER.indexOf(a as (typeof OA_STATUS_ORDER)[number])
    const ib = OA_STATUS_ORDER.indexOf(b as (typeof OA_STATUS_ORDER)[number])
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    }
    return a.localeCompare(b, 'ja')
  })
  return arr.join('・')
}

/**
 * GET: 対象月の打刻・残業申請を一覧（月次締め一覧の詳細モーダル用）
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
        status,
        employee_id,
        reason,
        supervisor_comment,
        emp:employees!overtime_applications_employee_id_fkey ( employee_no, name ),
        supervisor:employees!overtime_applications_supervisor_id_fkey ( name )
      `,
      )
      .eq('tenant_id', tenantId)
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
    status: string
    employee_id: string
    reason: string | null
    supervisor_comment: string | null
    emp: { employee_no: string | null; name: string | null } | null
    supervisor: { name: string | null } | null
  }

  /** 承認者コメント（DB 列 supervisor_comment） */
  function supervisorRecommendFromOa(oa: OaRow): string | null {
    const t = oa.supervisor_comment?.trim()
    return t || null
  }

  type OtAgg = {
    /** 同一キーに紐づく全申請の requested_hours 合計（時間） */
    totalRequestedHours: number
    approverName: string | null
    reasons: string[]
    supervisorRecommends: string[]
    statuses: Set<string>
  }

  const wtrRows = (wtrResult.data ?? []) as WtrRow[]
  const oaRows = (oaResult.data ?? []) as OaRow[]

  const otMap = new Map<string, OtAgg>()
  for (const oa of oaRows) {
    const wd = String(oa.work_date).slice(0, 10)
    const key = `${oa.employee_id}|${wd}`
    const reqH = Number(oa.requested_hours ?? 0)
    const isApproved = oa.status === '承認済'
    const sup = isApproved ? (oa.supervisor?.name ?? null) : null
    const r = oa.reason?.trim() ? oa.reason.trim() : null
    const c = supervisorRecommendFromOa(oa)
    const prev = otMap.get(key)
    const st = new Set(prev?.statuses ?? [])
    st.add(oa.status)
    const totalReq = (prev?.totalRequestedHours ?? 0) + reqH
    if (prev) {
      otMap.set(key, {
        totalRequestedHours: totalReq,
        approverName: prev.approverName ?? sup,
        reasons: r ? [...prev.reasons, r] : prev.reasons,
        supervisorRecommends: c ? [...prev.supervisorRecommends, c] : prev.supervisorRecommends,
        statuses: st,
      })
    } else {
      otMap.set(key, {
        totalRequestedHours: reqH,
        approverName: sup,
        reasons: r ? [r] : [],
        supervisorRecommends: c ? [c] : [],
        statuses: st,
      })
    }
  }

  function otTexts(ot: OtAgg | undefined): { reason: string | null; supervisorRecommend: string | null } {
    if (!ot) return { reason: null, supervisorRecommend: null }
    const reason = ot.reasons.length > 0 ? ot.reasons.join('\n') : null
    const supervisorRecommend =
      ot.supervisorRecommends.length > 0 ? ot.supervisorRecommends.join('\n') : null
    return { reason, supervisorRecommend }
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
      overtimeRequestedTotalMinutes:
        ot != null ? Math.round(ot.totalRequestedHours * 60) : null,
      overtimeApplicationStatus: ot ? formatOvertimeStatuses(ot.statuses) : null,
      approverName: ot?.approverName ?? null,
      overtimeReason: texts.reason,
      supervisorRecommend: texts.supervisorRecommend,
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
      overtimeRequestedTotalMinutes: Math.round(agg.totalRequestedHours * 60),
      overtimeApplicationStatus: formatOvertimeStatuses(agg.statuses),
      approverName: agg.approverName,
      overtimeReason: tx.reason,
      supervisorRecommend: tx.supervisorRecommend,
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
