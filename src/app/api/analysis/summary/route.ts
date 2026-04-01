import { NextResponse } from 'next/server'
import { requireAnalysisContext } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type SummaryKPI = {
  total_employees: number
  avg_overtime: number
  violation_count: number
  warning_count: number
  anomaly_count: number
}

export async function GET(request: Request) {
  const ctx = await requireAnalysisContext(request)
  if (ctx.ok === false) return ctx.response

  const { supabase, tenantId, yearMonth } = ctx

  const { data: settings, error: settingsErr } = await supabase
    .from('overtime_settings')
    .select('monthly_limit_hours')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (settingsErr) {
    console.error('analysis summary overtime_settings', settingsErr)
    return NextResponse.json({ error: settingsErr.message }, { status: 500 })
  }

  const monthlyLimit = settings?.monthly_limit_hours ?? 45

  const { data: meoRows, error: meoErr } = await supabase
    .from('monthly_employee_overtime')
    .select('employee_id, total_overtime_hours')
    .eq('tenant_id', tenantId)
    .eq('year_month', yearMonth)

  if (meoErr) {
    console.error('analysis summary monthly_employee_overtime', meoErr)
    return NextResponse.json({ error: meoErr.message }, { status: 500 })
  }

  const hoursByEmployee = new Map<string, number>()
  for (const row of meoRows ?? []) {
    const eid = row.employee_id
    const h = toFiniteNumber(row.total_overtime_hours)
    const prev = hoursByEmployee.get(eid)
    hoursByEmployee.set(eid, prev === undefined ? h : Math.max(prev, h))
  }

  const totalEmployees = hoursByEmployee.size
  let sumHours = 0
  let violationCount = 0
  let warningCount = 0
  const limit = monthlyLimit
  const warnThreshold = limit * 0.8

  for (const h of hoursByEmployee.values()) {
    sumHours += h
    if (h > limit) {
      violationCount += 1
    } else if (h > warnThreshold) {
      warningCount += 1
    }
  }

  const avgOvertime = totalEmployees > 0 ? sumHours / totalEmployees : 0

  const { data: closures, error: cloErr } = await supabase
    .from('monthly_overtime_closures')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('year_month', yearMonth)

  if (cloErr) {
    console.error('analysis summary monthly_overtime_closures', cloErr)
    return NextResponse.json({ error: cloErr.message }, { status: 500 })
  }

  const closureIds = (closures ?? []).map((c) => c.id).filter(Boolean)
  let anomalyCount = 0
  if (closureIds.length > 0) {
    const { count, error: cwErr } = await supabase
      .from('closure_warnings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('closure_id', closureIds)

    if (cwErr) {
      console.error('analysis summary closure_warnings', cwErr)
      return NextResponse.json({ error: cwErr.message }, { status: 500 })
    }
    anomalyCount = count ?? 0
  }

  const summary: SummaryKPI = {
    total_employees: totalEmployees,
    avg_overtime: Math.round(avgOvertime * 100) / 100,
    violation_count: violationCount,
    warning_count: warningCount,
    anomaly_count: anomalyCount,
  }

  return NextResponse.json({ summary })
}
