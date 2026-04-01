import { NextResponse } from 'next/server'
import { requireAnalysisContext } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type DepartmentSummary = {
  department_id: string
  department_name: string
  employee_count: number
  avg_overtime: number
  max_overtime: number
  violation_count: number
  warning_count: number
}

export async function GET(request: Request) {
  const ctx = await requireAnalysisContext(request)
  if (ctx.ok === false) return ctx.response

  const { supabase, tenantId, yearMonth } = ctx

  const { data, error } = await supabase.rpc('get_department_overtime_summary', {
    p_tenant_id: tenantId,
    p_year_month: yearMonth,
  })

  if (error) {
    console.error('get_department_overtime_summary', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const departments: DepartmentSummary[] = (data ?? []).map((row) => ({
    department_id: row.department_id ?? '',
    department_name: row.department_name ?? '',
    employee_count: toFiniteNumber(row.employee_count),
    avg_overtime: toFiniteNumber(row.avg_overtime),
    max_overtime: toFiniteNumber(row.max_overtime),
    violation_count: toFiniteNumber(row.violation_count),
    warning_count: toFiniteNumber(row.warning_count),
  }))

  return NextResponse.json({ departments })
}
