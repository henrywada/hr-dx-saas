// src/features/hr-kpi/queries.ts
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getJSTYearMonth } from '@/lib/datetime'
import type {
  HrKpiBundle,
  RecruitKpi,
  RetentionKpi,
  ProductivityKpi,
  EngagementKpi,
  DevelopmentKpi,
} from './types'

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

function monthsAgo(yearMonth: string, n: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - 1 - n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 採用KPIを集計する（既存データの読み取りのみ） */
async function fetchRecruitKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  yearMonth: string
): Promise<RecruitKpi> {
  const startOfMonth = `${yearMonth}-01`
  const endOfMonth = lastDayOfMonth(yearMonth)

  const [applicantsRes, totalRes, hiredRes, openRes] = await Promise.all([
    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', `${startOfMonth}T00:00:00+09:00`)
      .lte('created_at', `${endOfMonth}T23:59:59+09:00`),
    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('stage', ['offered', 'hired']),
    supabase
      .from('job_postings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'published'),
  ])

  const totalApplied = totalRes.count ?? 0
  const hiredCount = hiredRes.count ?? 0
  const openJobPostings = openRes.count ?? 0

  const passThroughRate =
    totalApplied > 0 ? Math.round((hiredCount / totalApplied) * 1000) / 10 : null

  const fillRate =
    openJobPostings > 0 ? Math.round((hiredCount / openJobPostings) * 1000) / 10 : null

  return {
    applicantsThisMonth: applicantsRes.count ?? 0,
    passThroughRate,
    fillRate,
    openJobPostings,
  }
}

/** 定着KPIを集計する（既存データの読み取りのみ） */
async function fetchRetentionKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  yearMonth: string
): Promise<RetentionKpi> {
  const since = `${monthsAgo(yearMonth, 12)}-01`

  const [activeRes, turnoverRes, tenureRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active'),
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active_status', 'inactive')
      .gte('updated_at', since),
    supabase
      .from('employees')
      .select('hired_date')
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active')
      .not('hired_date', 'is', null),
  ])

  const totalActive = activeRes.count ?? 0
  const turnover = turnoverRes.count ?? 0
  const denominator = totalActive + turnover

  const turnoverRatePercent =
    denominator > 0 ? Math.round((turnover / denominator) * 1000) / 10 : null

  let avgTenureMonths: number | null = null
  const tenureData = tenureRes.data as { hired_date: string }[] | null
  if (tenureData && tenureData.length > 0) {
    const now = new Date()
    const totalMonths = tenureData.reduce((sum, row) => {
      const hired = new Date(row.hired_date)
      const months =
        (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth())
      return sum + Math.max(0, months)
    }, 0)
    avgTenureMonths = Math.round((totalMonths / tenureData.length) * 10) / 10
  }

  return {
    turnoverCountLast12Months: turnover,
    totalActiveEmployees: totalActive,
    turnoverRatePercent,
    avgTenureMonths,
  }
}

/** 生産性KPIを集計する（既存データの読み取りのみ） */
async function fetchProductivityKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  yearMonth: string
): Promise<ProductivityKpi> {
  const startOfMonth = `${yearMonth}-01`
  const endOfMonth = lastDayOfMonth(yearMonth)
  const [ym0Year, ym0Month] = yearMonth.split('-').map(Number)
  const fiscalYear = ym0Month >= 4 ? ym0Year : ym0Year - 1

  const [workRes, article36Res, grantsRes, usagesRes] = await Promise.all([
    supabase
      .from('work_time_records')
      .select('employee_id, overtime_minutes')
      .eq('tenant_id', tenantId)
      .gte('record_date', startOfMonth)
      .lte('record_date', endOfMonth)
      .not('overtime_minutes', 'is', null),
    supabase
      .from('overtime_alerts')
      .select('employee_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'monthly_special_provision')
      .gte('triggered_at', `${startOfMonth}T00:00:00+09:00`)
      .is('resolved_at', null),
    supabase
      .from('paid_leave_grants')
      .select('employee_id, granted_days')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', fiscalYear),
    supabase
      .from('paid_leave_usages')
      .select('employee_id, used_days')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', fiscalYear),
  ])

  let avgOvertimeHoursThisMonth: number | null = null
  const workData = workRes.data as { employee_id: string; overtime_minutes: number }[] | null
  if (workData && workData.length > 0) {
    const perEmployee = new Map<string, number>()
    for (const row of workData) {
      perEmployee.set(row.employee_id, (perEmployee.get(row.employee_id) ?? 0) + row.overtime_minutes)
    }
    const totalMinutes = Array.from(perEmployee.values()).reduce((a, b) => a + b, 0)
    avgOvertimeHoursThisMonth =
      perEmployee.size > 0 ? Math.round((totalMinutes / perEmployee.size / 60) * 10) / 10 : null
  }

  let paidLeaveUtilizationPercent: number | null = null
  const grants = grantsRes.data as { granted_days: number }[] | null
  if (grants && grants.length > 0) {
    const totalGranted = grants.reduce((s, r) => s + (r.granted_days ?? 0), 0)
    const usages = usagesRes.data as { used_days: number }[] | null
    const totalUsed = (usages ?? []).reduce((s, r) => s + (r.used_days ?? 0), 0)
    paidLeaveUtilizationPercent =
      totalGranted > 0 ? Math.round((totalUsed / totalGranted) * 1000) / 10 : null
  }

  return {
    avgOvertimeHoursThisMonth,
    paidLeaveUtilizationPercent,
    article36SubjectCount: article36Res.count ?? 0,
  }
}

/** エンゲージメントKPIを集計する（既存データの読み取りのみ） */
async function fetchEngagementKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string
): Promise<EngagementKpi> {
  const { data: latestPeriod } = await supabase
    .from('pulse_survey_periods')
    .select('survey_period')
    .eq('tenant_id', tenantId)
    .order('survey_period', { ascending: false })
    .limit(1)
    .maybeSingle()

  let latestPulseSurveyScore: number | null = null
  let latestPulseResponseRate: number | null = null

  if (latestPeriod?.survey_period) {
    const period = latestPeriod.survey_period as string

    const [responsesRes, totalEmpRes] = await Promise.all([
      supabase
        .from('pulse_survey_responses')
        .select('score')
        .eq('tenant_id', tenantId)
        .eq('survey_period', period),
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('active_status', 'active'),
    ])

    const responses = responsesRes.data as { score: number }[] | null
    if (responses && responses.length > 0) {
      const avg = responses.reduce((a, b) => a + b.score, 0) / responses.length
      // DB score 1-10 → 表示は ÷2 で 0-5スケール（survey/dashboard-queries.ts と同じ換算）
      latestPulseSurveyScore = Math.round((avg / 2) * 10) / 10
    }

    const totalEmployees = totalEmpRes.count ?? 0
    if (totalEmployees > 0 && responses) {
      latestPulseResponseRate = Math.round((responses.length / totalEmployees) * 1000) / 10
    }
  }

  let highStressRatePercent: number | null = null

  const { data: latestStressPeriod } = await supabase
    .from('stress_check_periods')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestStressPeriod?.id) {
    const [totalRes, highRes] = await Promise.all([
      supabase
        .from('stress_check_results')
        .select('id', { count: 'exact', head: true })
        .eq('period_id', latestStressPeriod.id),
      supabase
        .from('stress_check_results')
        .select('id', { count: 'exact', head: true })
        .eq('period_id', latestStressPeriod.id)
        .eq('is_high_stress', true),
    ])

    const total = totalRes.count ?? 0
    highStressRatePercent =
      total > 0 ? Math.round(((highRes.count ?? 0) / total) * 1000) / 10 : null
  }

  return {
    latestPulseSurveyScore,
    latestPulseResponseRate,
    highStressRatePercent,
  }
}

/** 育成KPIを集計する（既存データの読み取りのみ） */
async function fetchDevelopmentKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string
): Promise<DevelopmentKpi> {
  const [totalElRes, completedElRes, employeesRes] = await Promise.all([
    supabase
      .from('el_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('el_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('completed_at', 'is', null),
    supabase
      .from('employees')
      .select('id, employee_skill_assignments ( skill_id )')
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active'),
  ])

  const totalEl = totalElRes.count ?? 0
  const completedEl = completedElRes.count ?? 0
  const elCompletionRatePercent =
    totalEl > 0 ? Math.round((completedEl / totalEl) * 1000) / 10 : null

  let skillGapRatePercent: number | null = null
  const employeesData = employeesRes.data as
    | { id: string; employee_skill_assignments: { skill_id: string }[] }[]
    | null

  if (employeesData) {
    const withSkills = employeesData.filter(e => e.employee_skill_assignments.length > 0)
    if (withSkills.length > 0) {
      const allSkillIds = [
        ...new Set(withSkills.flatMap(e => e.employee_skill_assignments.map(a => a.skill_id))),
      ]

      const { data: requirements } = await supabase
        .from('skill_requirements')
        .select('skill_id')
        .in('skill_id', allSkillIds)

      const skillsWithReqs = new Set(
        ((requirements as { skill_id: string }[] | null) ?? []).map(r => r.skill_id)
      )

      const withGap = withSkills.filter(e =>
        e.employee_skill_assignments.some(a => skillsWithReqs.has(a.skill_id))
      ).length

      skillGapRatePercent = Math.round((withGap / withSkills.length) * 1000) / 10
    }
  }

  return {
    skillGapRatePercent,
    elCompletionRatePercent,
    activeElAssignments: totalEl,
  }
}

/** 全KPIを並列取得してバンドルを返す */
export async function getHrKpiBundle(
  yearMonth?: string
): Promise<{ ok: true; data: HrKpiBundle } | { ok: false; error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }

  const ym = yearMonth ?? getJSTYearMonth()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const tenantId = user.tenant_id

  try {
    const [recruit, retention, productivity, engagement, development] = await Promise.all([
      fetchRecruitKpi(supabase, tenantId, ym),
      fetchRetentionKpi(supabase, tenantId, ym),
      fetchProductivityKpi(supabase, tenantId, ym),
      fetchEngagementKpi(supabase, tenantId),
      fetchDevelopmentKpi(supabase, tenantId),
    ])

    return {
      ok: true,
      data: {
        recruit,
        retention,
        productivity,
        engagement,
        development,
        yearMonth: ym,
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: `KPIデータの取得に失敗しました: ${msg}` }
  }
}

/** CSVエクスポート用：全KPIをフラットな行配列に変換する */
export function bundleToCsvRows(bundle: HrKpiBundle): string[][] {
  const fmt = (v: number | null, suffix = '') =>
    v != null ? `${v}${suffix}` : 'データなし'

  const tenure =
    bundle.retention.avgTenureMonths != null
      ? `${Math.floor(bundle.retention.avgTenureMonths / 12)}年${Math.round(bundle.retention.avgTenureMonths % 12)}ヶ月`
      : 'データなし'

  return [
    ['カテゴリ', 'KPI名', '値', '集計基準月'],
    ['採用', '今月の応募数', fmt(bundle.recruit.applicantsThisMonth, '件'), bundle.yearMonth],
    ['採用', '選考通過率', fmt(bundle.recruit.passThroughRate, '%'), bundle.yearMonth],
    ['採用', '充足率', fmt(bundle.recruit.fillRate, '%'), bundle.yearMonth],
    ['採用', '公開中求人数', fmt(bundle.recruit.openJobPostings, '件'), bundle.yearMonth],
    ['定着', '直近12ヶ月の退職者数', fmt(bundle.retention.turnoverCountLast12Months, '名'), bundle.yearMonth],
    ['定着', '在籍従業員数', fmt(bundle.retention.totalActiveEmployees, '名'), bundle.yearMonth],
    ['定着', '離職率（直近12ヶ月）', fmt(bundle.retention.turnoverRatePercent, '%'), bundle.yearMonth],
    ['定着', '平均在籍年数', tenure, bundle.yearMonth],
    ['生産性', '1人あたり平均残業時間（当月）', fmt(bundle.productivity.avgOvertimeHoursThisMonth, '時間'), bundle.yearMonth],
    ['生産性', '有休取得率', fmt(bundle.productivity.paidLeaveUtilizationPercent, '%'), bundle.yearMonth],
    ['生産性', '36協定特別条項対象者数', fmt(bundle.productivity.article36SubjectCount, '名'), bundle.yearMonth],
    ['エンゲージメント', 'パルスサーベイ平均スコア', fmt(bundle.engagement.latestPulseSurveyScore, '/5.0'), bundle.yearMonth],
    ['エンゲージメント', 'パルスサーベイ回答率', fmt(bundle.engagement.latestPulseResponseRate, '%'), bundle.yearMonth],
    ['エンゲージメント', '高ストレス率', fmt(bundle.engagement.highStressRatePercent, '%'), bundle.yearMonth],
    ['育成', 'スキルギャップ率', fmt(bundle.development.skillGapRatePercent, '%'), bundle.yearMonth],
    ['育成', 'eラーニング研修完了率', fmt(bundle.development.elCompletionRatePercent, '%'), bundle.yearMonth],
    ['育成', 'eラーニング割り当て総数', fmt(bundle.development.activeElAssignments, '件'), bundle.yearMonth],
  ]
}
