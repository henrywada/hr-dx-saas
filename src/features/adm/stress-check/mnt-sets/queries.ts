import { createClient } from '@/lib/supabase/server'
import type {
  StressCheckPeriod,
  StressCheckPeriodWithDivisions,
} from '@/features/stress-check/types'

export async function getStressCheckPeriodsList(tenantId: string): Promise<StressCheckPeriod[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getStressCheckPeriodsList error:', error)
    return []
  }

  return (data || []) as StressCheckPeriod[]
}

/** 実施グループ（division ベース）でカバーされていない従業員数を返す */
export async function countEmployeesNotCoveredByPeriods(tenantId: string): Promise<number> {
  const supabase = await createClient()

  const [{ data: periodDivs }, { data: divisions }, { data: employees }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('stress_check_period_divisions')
      .select('division_id')
      .eq('tenant_id', tenantId),
    supabase.from('divisions').select('id, parent_id').eq('tenant_id', tenantId),
    supabase.from('employees').select('id, division_id').eq('tenant_id', tenantId),
  ])

  const coveredIds = new Set<string>(
    (periodDivs ?? []).map((d: { division_id: string }) => d.division_id)
  )
  const parentMap = new Map<string, string | null>(
    (divisions ?? []).map((d: { id: string; parent_id: string | null }) => [d.id, d.parent_id])
  )

  const isCovered = (divisionId: string | null): boolean => {
    let cur: string | null = divisionId
    const guard = new Set<string>()
    while (cur && !guard.has(cur)) {
      if (coveredIds.has(cur)) return true
      guard.add(cur)
      cur = parentMap.get(cur) ?? null
    }
    return false
  }

  return (employees ?? []).filter((e: { division_id: string | null }) => !isCovered(e.division_id))
    .length
}

/** period + 紐づく division ID リストを取得（実施グループ管理画面用） */
export async function getStressCheckPeriodsWithDivisions(
  tenantId: string
): Promise<StressCheckPeriodWithDivisions[]> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('stress_check_periods')
    .select('*, stress_check_period_divisions(division_id)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getStressCheckPeriodsWithDivisions error:', error)
    return []
  }

  return (data ?? []).map(
    (p: StressCheckPeriod & { stress_check_period_divisions?: { division_id: string }[] }) => ({
      ...p,
      divisionIds: (p.stress_check_period_divisions ?? []).map(d => d.division_id),
    })
  )
}
