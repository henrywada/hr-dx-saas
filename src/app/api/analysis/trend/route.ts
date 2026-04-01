import { NextResponse } from 'next/server'
import { requireAnalysisSession } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type TrendItem = {
  year_month: string
  avg_overtime: number
  max_overtime: number
  total_employees: number
  violation_count: number
}

export async function GET() {
  const session = await requireAnalysisSession()
  if (session.ok === false) return session.response

  const { supabase, tenantId } = session

  const { data, error } = await supabase.rpc('get_overtime_trend', {
    p_tenant_id: tenantId,
  })

  if (error) {
    console.error('get_overtime_trend', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const trend: TrendItem[] = (data ?? []).map((row) => ({
    year_month:
      typeof row.year_month === 'string'
        ? row.year_month
        : new Date(row.year_month).toISOString().slice(0, 10),
    avg_overtime: toFiniteNumber(row.avg_overtime),
    max_overtime: toFiniteNumber(row.max_overtime),
    total_employees: toFiniteNumber(row.total_employees),
    violation_count: toFiniteNumber(row.violation_count),
  }))

  return NextResponse.json({ trend })
}
