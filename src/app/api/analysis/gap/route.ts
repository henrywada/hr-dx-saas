import { NextResponse } from 'next/server'
import { requireAnalysisContext } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type GapItem = {
  employee_id: string
  employee_name: string
  approved_hours: number
  actual_hours: number
  gap_hours: number
  gap_type: string
}

export async function GET(request: Request) {
  const ctx = await requireAnalysisContext(request)
  if (ctx.ok === false) return ctx.response

  const { supabase, tenantId, yearMonth } = ctx

  const { data, error } = await supabase.rpc('get_overtime_gap_analysis', {
    p_tenant_id: tenantId,
    p_year_month: yearMonth,
  })

  if (error) {
    console.error('get_overtime_gap_analysis', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const gaps: GapItem[] = (data ?? []).map((row) => ({
    employee_id: row.employee_id,
    employee_name: row.employee_name ?? '',
    approved_hours: toFiniteNumber(row.approved_hours),
    actual_hours: toFiniteNumber(row.actual_hours),
    gap_hours: toFiniteNumber(row.gap_hours),
    gap_type: row.gap_type ?? '',
  }))

  return NextResponse.json({ gaps })
}
