import { NextResponse } from 'next/server'
import { requireAnalysisContext } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

/** 勤務状況分析のサマリ API（36協定ゲージ用の平均残業と内訳） */
export type SummaryKPI = {
  avg_overtime: number
  /** 対象月の残業時間合計（従業員別の重複を除いた合計） */
  total_overtime_hours: number
  /** 平均の母数となる従業員数 */
  employee_count: number
}

export async function GET(request: Request) {
  const ctx = await requireAnalysisContext(request)
  if (ctx.ok === false) return ctx.response

  const { supabase, tenantId, yearMonth } = ctx

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
  for (const h of hoursByEmployee.values()) {
    sumHours += h
  }

  const avgOvertime = totalEmployees > 0 ? sumHours / totalEmployees : 0

  const summary: SummaryKPI = {
    avg_overtime: Math.round(avgOvertime * 100) / 100,
    total_overtime_hours: Math.round(sumHours * 100) / 100,
    employee_count: totalEmployees,
  }

  return NextResponse.json({ summary })
}
