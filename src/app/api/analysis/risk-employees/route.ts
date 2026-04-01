import { NextResponse } from 'next/server'
import { requireAnalysisContext } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type RiskEmployee = {
  employee_id: string
  employee_name: string
  department_name: string
  total_overtime_hours: number
  monthly_limit: number
  usage_rate: number
  risk_level: '違反' | '警告' | '注意' | '正常'
}

const RISK_LEVELS = ['違反', '警告', '注意', '正常'] as const

function isRiskLevel(s: string): s is RiskEmployee['risk_level'] {
  return (RISK_LEVELS as readonly string[]).includes(s)
}

export async function GET(request: Request) {
  const ctx = await requireAnalysisContext(request)
  if (ctx.ok === false) return ctx.response

  const { searchParams } = new URL(request.url)
  const rawLevel = searchParams.get('risk_level')
  if (rawLevel !== null && rawLevel !== '' && !isRiskLevel(rawLevel)) {
    return NextResponse.json({ error: 'risk_level が不正です' }, { status: 400 })
  }

  const { supabase, tenantId, yearMonth } = ctx

  const { data, error } = await supabase.rpc('get_36_risk_employees', {
    p_tenant_id: tenantId,
    p_year_month: yearMonth,
  })

  if (error) {
    console.error('get_36_risk_employees', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let employees: RiskEmployee[] = (data ?? []).map((row) => {
    const levelRaw = row.risk_level ?? '正常'
    const risk_level: RiskEmployee['risk_level'] = isRiskLevel(levelRaw) ? levelRaw : '正常'
    return {
      employee_id: row.employee_id,
      employee_name: row.employee_name ?? '',
      department_name: row.department_name ?? '',
      total_overtime_hours: toFiniteNumber(row.total_overtime_hours),
      monthly_limit: toFiniteNumber(row.monthly_limit),
      usage_rate: toFiniteNumber(row.usage_rate),
      risk_level,
    }
  })

  if (rawLevel !== null && rawLevel !== '') {
    employees = employees.filter((e) => e.risk_level === rawLevel)
  }

  return NextResponse.json({ employees })
}
