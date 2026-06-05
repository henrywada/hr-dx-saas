import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ExitInterview,
  ExitInterviewAnalytics,
  ReasonCount,
  MonthlyCount,
  DepartmentCount,
  TenureGroupCount,
  AgeGroupCount,
  MainReason,
  AgeGroup,
} from './types'
import { ALL_MAIN_REASONS, ALL_AGE_GROUPS } from './types'

/** 退職面談記録一覧（新しい順） */
export async function getExitInterviews(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ExitInterview[]> {
  const { data, error } = await (supabase as any)
    .from('exit_interviews')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('exit_date', { ascending: false })
  if (error) {
    console.warn('[getExitInterviews] failed:', error.message)
    return []
  }
  return (data ?? []) as ExitInterview[]
}

/** テナントの集計データ（直近12ヶ月含む） */
export async function getExitInterviewAnalytics(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ExitInterviewAnalytics> {
  const { data: rows, error } = await (supabase as any)
    .from('exit_interviews')
    .select('main_reason, department_name, tenure_months, age_group, exit_date')
    .eq('tenant_id', tenantId)
  if (error) {
    console.warn('[getExitInterviewAnalytics] failed:', error.message)
    return emptyAnalytics()
  }
  const records = (rows ?? []) as Array<{
    main_reason: MainReason
    department_name: string | null
    tenure_months: number
    age_group: AgeGroup
    exit_date: string
  }>

  const total = records.length

  // ---- 退職理由分布 ----
  const reasonMap = new Map<MainReason, number>()
  for (const r of records) {
    reasonMap.set(r.main_reason, (reasonMap.get(r.main_reason) ?? 0) + 1)
  }
  const reason_distribution: ReasonCount[] = ALL_MAIN_REASONS
    .map(reason => ({ reason, count: reasonMap.get(reason) ?? 0 }))
    .filter(x => x.count > 0)

  // ---- 月次トレンド（直近12ヶ月） ----
  const now = new Date()
  const months: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthMap = new Map<string, number>()
  for (const r of records) {
    const ym = r.exit_date.slice(0, 7)
    if (months.includes(ym)) {
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + 1)
    }
  }
  const monthly_trend: MonthlyCount[] = months.map(ym => ({
    year_month: ym,
    count: monthMap.get(ym) ?? 0,
  }))

  // ---- 部署別集計 ----
  const deptReasonMap = new Map<string, Map<MainReason, number>>()
  const deptCountMap = new Map<string, number>()
  for (const r of records) {
    const dept = r.department_name ?? '（未設定）'
    deptCountMap.set(dept, (deptCountMap.get(dept) ?? 0) + 1)
    if (!deptReasonMap.has(dept)) deptReasonMap.set(dept, new Map())
    const rm = deptReasonMap.get(dept)!
    rm.set(r.main_reason, (rm.get(r.main_reason) ?? 0) + 1)
  }
  const department_breakdown: DepartmentCount[] = [...deptCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([dept, count]) => {
      const rm = deptReasonMap.get(dept) ?? new Map()
      let topReason: MainReason = 'other'
      let topCount = 0
      for (const [reason, c] of rm.entries()) {
        if (c > topCount) { topCount = c; topReason = reason }
      }
      return { department_name: dept, count, top_reason: topReason }
    })

  // ---- 在籍年数グループ別 ----
  function tenureGroup(months: number): string {
    if (months < 12)  return '1年未満'
    if (months < 36)  return '1〜3年'
    if (months < 60)  return '3〜5年'
    if (months < 120) return '5〜10年'
    return '10年以上'
  }
  const TENURE_ORDER = ['1年未満', '1〜3年', '3〜5年', '5〜10年', '10年以上']
  const tenureMap = new Map<string, number>()
  for (const r of records) {
    const g = tenureGroup(r.tenure_months)
    tenureMap.set(g, (tenureMap.get(g) ?? 0) + 1)
  }
  const tenure_breakdown: TenureGroupCount[] = TENURE_ORDER
    .filter(g => tenureMap.has(g))
    .map(g => ({ tenure_group: g, count: tenureMap.get(g)! }))

  // ---- 年齢層別 ----
  const ageMap = new Map<AgeGroup, number>()
  for (const r of records) {
    ageMap.set(r.age_group, (ageMap.get(r.age_group) ?? 0) + 1)
  }
  const age_breakdown: AgeGroupCount[] = ALL_AGE_GROUPS
    .filter(g => ageMap.has(g))
    .map(g => ({ age_group: g, count: ageMap.get(g)! }))

  return { total, reason_distribution, monthly_trend, department_breakdown, tenure_breakdown, age_breakdown }
}

function emptyAnalytics(): ExitInterviewAnalytics {
  return {
    total: 0,
    reason_distribution: [],
    monthly_trend: [],
    department_breakdown: [],
    tenure_breakdown: [],
    age_breakdown: [],
  }
}
