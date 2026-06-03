# P1-D 横断KPIダッシュボード（経営層向け）実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 採用・定着・生産性・エンゲージメント・育成の5領域のKPIを1画面に集約し、経営者が組織の状態を即座に把握できるダッシュボードを `/adm/hr-kpi` に実装する

**Architecture:** 既存テーブル（candidates, employees, work_time_records, overtime_alerts, pulse_survey_responses, stress_check_results, el_assignments, employee_skill_assignments）のデータを横断的に集計する新規 queries.ts を `src/features/hr-kpi/` に作成し、Server Component でデータを取得して Client Component に渡す。新規テーブルは不要・既存データは一切変更しない。CSVエクスポートはクライアント側のBlob生成で実装する。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase（PostgreSQL + RLS）, Tailwind CSS v4, Lucide React

---

## ファイル構成

```
src/
├── config/routes.ts                              # ADMIN_HR_KPI 定数を追加
├── features/hr-kpi/
│   ├── types.ts                                  # KPI集計結果の型定義
│   ├── queries.ts                                # 5領域KPIのSELECTクエリ群
│   └── components/
│       ├── HrKpiDashboard.tsx                    # メインClient Componentダッシュボード
│       ├── KpiSummaryCard.tsx                    # KPI1件を表示するカード（再利用）
│       ├── RecruitKpiSection.tsx                 # 採用KPIセクション
│       ├── RetentionKpiSection.tsx               # 定着KPIセクション
│       ├── ProductivityKpiSection.tsx            # 生産性KPIセクション
│       ├── EngagementKpiSection.tsx              # エンゲージメントKPIセクション
│       ├── DevelopmentKpiSection.tsx             # 育成KPIセクション
│       └── ExportButton.tsx                      # CSVエクスポートボタン
└── app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/
    ├── page.tsx                                  # Server Component
    ├── loading.tsx                               # ローディング表示
    └── error.tsx                                 # エラー表示
```

---

## Task 1: ルート定数を追加する

**Files:**
- Modify: `src/config/routes.ts:83`

- [ ] **Step 1: routes.ts に ADMIN_HR_KPI を追加する**

`ADMIN_LABOR_COMPLIANCE` の行の直後に追加する：

```typescript
    /** 横断KPIダッシュボード（経営層向け）（P1-D） */
    ADMIN_HR_KPI: '/adm/hr-kpi',
```

- [ ] **Step 2: 差分を確認してコミットする**

```bash
git diff src/config/routes.ts
git add src/config/routes.ts
git commit -m "feat: add ADMIN_HR_KPI route constant for P1-D"
```

---

## Task 2: 型定義ファイルを作成する

**Files:**
- Create: `src/features/hr-kpi/types.ts`

- [ ] **Step 1: 型定義ファイルを作成する**

```typescript
// src/features/hr-kpi/types.ts

/** 採用KPI */
export interface RecruitKpi {
  /** 今月の応募数 */
  applicantsThisMonth: number
  /** アクティブ候補者の選考通過率（応募→内定・入社）%  */
  passThroughRate: number | null
  /** 充足率（hired / 公開求人数）% */
  fillRate: number | null
  /** 公開中の求人数 */
  openJobPostings: number
}

/** 定着KPI */
export interface RetentionKpi {
  /** 直近12ヶ月の退職者数（active_status が inactive になった件数） */
  turnoverCountLast12Months: number
  /** 在籍従業員総数 */
  totalActiveEmployees: number
  /** 離職率（%、直近12ヶ月） */
  turnoverRatePercent: number | null
  /** 平均在籍年数（月単位、activeな従業員のhired_dateから算出） */
  avgTenureMonths: number | null
}

/** 生産性KPI */
export interface ProductivityKpi {
  /** 当月の1人あたり平均残業時間（hours） */
  avgOvertimeHoursThisMonth: number | null
  /** 当年度の有休取得率（%） */
  paidLeaveUtilizationPercent: number | null
  /** 36協定特別条項対象者数（当月・未解消） */
  article36SubjectCount: number
}

/** エンゲージメントKPI */
export interface EngagementKpi {
  /** 直近パルスサーベイ期間の平均スコア（0-5.0スケール、DB値÷2で換算） */
  latestPulseSurveyScore: number | null
  /** 直近パルスサーベイの回答率（%） */
  latestPulseResponseRate: number | null
  /** 直近ストレスチェック期間の高ストレス率（%） */
  highStressRatePercent: number | null
}

/** 育成KPI */
export interface DevelopmentKpi {
  /** スキルギャップ率（スキル割り当て済み従業員のうち要件が存在する職種を持つ割合）% */
  skillGapRatePercent: number | null
  /** eラーニング研修完了率（完了数/総割り当て数）% */
  elCompletionRatePercent: number | null
  /** eラーニング割り当て総数 */
  activeElAssignments: number
}

/** ダッシュボード全体のKPIバンドル */
export interface HrKpiBundle {
  recruit: RecruitKpi
  retention: RetentionKpi
  productivity: ProductivityKpi
  engagement: EngagementKpi
  development: DevelopmentKpi
  /** 集計基準年月（YYYY-MM） */
  yearMonth: string
  /** データ取得日時（ISO 8601） */
  fetchedAt: string
}
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/hr-kpi/types.ts
git commit -m "feat: add hr-kpi types for P1-D cross-domain KPI dashboard"
```

---

## Task 3: クエリファイルを作成する

**Files:**
- Create: `src/features/hr-kpi/queries.ts`

**参照テーブル（既存・読み取り専用）:**
- `candidates` — 採用KPI（stage, created_at, tenant_id）
- `job_postings` — 公開求人数（status, tenant_id）
- `employees` — 定着KPI（active_status, hired_date, tenant_id, updated_at）
- `work_time_records` — 生産性KPI（overtime_minutes, record_date, tenant_id）
- `overtime_alerts` — 36協定（alert_type, triggered_at, resolved_at, tenant_id）
- `paid_leave_grants` — 有休付与日数（granted_days, fiscal_year, tenant_id）
- `paid_leave_usages` — 有休使用日数（used_days, fiscal_year, tenant_id）
- `pulse_survey_periods` — パルスサーベイ期間（survey_period, tenant_id）
- `pulse_survey_responses` — パルス回答（score, survey_period, tenant_id）
- `stress_check_periods` — ストレスチェック期間（id, tenant_id）
- `stress_check_results` — 高ストレス判定（is_high_stress, period_id）
- `el_assignments` — eラーニング割り当て（completed_at, tenant_id）
- `employees` + `employee_skill_assignments` — スキルギャップ

- [ ] **Step 1: クエリファイルを作成する**

```typescript
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  yearMonth: string
): Promise<RecruitKpi> {
  const startOfMonth = `${yearMonth}-01`
  const endOfMonth = lastDayOfMonth(yearMonth)

  const [applicantsRes, totalRes, hiredRes, openRes] = await Promise.all([
    // 今月の応募数
    (supabase as any)
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', `${startOfMonth}T00:00:00+09:00`)
      .lte('created_at', `${endOfMonth}T23:59:59+09:00`),
    // 全応募者数
    (supabase as any)
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    // 内定・入社済み数
    (supabase as any)
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('stage', ['offered', 'hired']),
    // 公開中求人数
    (supabase as any)
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  yearMonth: string
): Promise<RetentionKpi> {
  const since = `${monthsAgo(yearMonth, 12)}-01`

  const [activeRes, turnoverRes, tenureRes] = await Promise.all([
    // アクティブ従業員数
    (supabase as any)
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active'),
    // 直近12ヶ月の退職者数
    (supabase as any)
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active_status', 'inactive')
      .gte('updated_at', since),
    // 在籍年数計算用（アクティブ従業員のhired_date）
    (supabase as any)
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  yearMonth: string
): Promise<ProductivityKpi> {
  const startOfMonth = `${yearMonth}-01`
  const endOfMonth = lastDayOfMonth(yearMonth)
  const [ym0Year, ym0Month] = yearMonth.split('-').map(Number)
  const fiscalYear = ym0Month >= 4 ? ym0Year : ym0Year - 1

  const [workRes, article36Res, grantsRes, usagesRes] = await Promise.all([
    // 当月の残業記録
    (supabase as any)
      .from('work_time_records')
      .select('employee_id, overtime_minutes')
      .eq('tenant_id', tenantId)
      .gte('record_date', startOfMonth)
      .lte('record_date', endOfMonth)
      .not('overtime_minutes', 'is', null),
    // 36協定特別条項対象者（当月・未解消）
    (supabase as any)
      .from('overtime_alerts')
      .select('employee_id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('alert_type', 'monthly_special_provision')
      .gte('triggered_at', `${startOfMonth}T00:00:00+09:00`)
      .is('resolved_at', null),
    // 有休付与日数（当年度）
    (supabase as any)
      .from('paid_leave_grants')
      .select('employee_id, granted_days')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', fiscalYear),
    // 有休使用日数（当年度）
    (supabase as any)
      .from('paid_leave_usages')
      .select('employee_id, used_days')
      .eq('tenant_id', tenantId)
      .eq('fiscal_year', fiscalYear),
  ])

  // 1人あたり平均残業時間を計算
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

  // 有休取得率を計算
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<EngagementKpi> {
  // 直近パルスサーベイ期間を特定
  const { data: latestPeriod } = await (supabase as any)
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
      (supabase as any)
        .from('pulse_survey_responses')
        .select('score')
        .eq('tenant_id', tenantId)
        .eq('survey_period', period),
      (supabase as any)
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

  // 高ストレス率（直近ストレスチェック期間）
  let highStressRatePercent: number | null = null

  const { data: latestStressPeriod } = await (supabase as any)
    .from('stress_check_periods')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestStressPeriod?.id) {
    const [totalRes, highRes] = await Promise.all([
      (supabase as any)
        .from('stress_check_results')
        .select('id', { count: 'exact', head: true })
        .eq('period_id', latestStressPeriod.id),
      (supabase as any)
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string
): Promise<DevelopmentKpi> {
  const [totalElRes, completedElRes, employeesRes] = await Promise.all([
    // eラーニング総割り当て数
    (supabase as any)
      .from('el_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    // eラーニング完了数
    (supabase as any)
      .from('el_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('completed_at', 'is', null),
    // スキルギャップ計算用（アクティブ従業員 + スキル割り当て）
    (supabase as any)
      .from('employees')
      .select('id, employee_skill_assignments ( skill_id )')
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active'),
  ])

  const totalEl = totalElRes.count ?? 0
  const completedEl = completedElRes.count ?? 0
  const elCompletionRatePercent =
    totalEl > 0 ? Math.round((completedEl / totalEl) * 1000) / 10 : null

  // スキルギャップ率：スキル割り当て済み従業員のうち、要件が存在する職種を持つ割合
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

      const { data: requirements } = await (supabase as any)
        .from('skill_requirements')
        .select('skill_id')
        .in('skill_id', allSkillIds)

      const skillsWithReqs = new Set(
        (requirements as { skill_id: string }[] | null ?? []).map(r => r.skill_id)
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
  const supabase = await createClient()
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
```

- [ ] **Step 2: コミットする**

```bash
git add src/features/hr-kpi/queries.ts
git commit -m "feat: add hr-kpi queries for cross-domain KPI aggregation"
```

---

## Task 4: UIコンポーネントを作成する

**Files:**
- Create: `src/features/hr-kpi/components/KpiSummaryCard.tsx`
- Create: `src/features/hr-kpi/components/RecruitKpiSection.tsx`
- Create: `src/features/hr-kpi/components/RetentionKpiSection.tsx`
- Create: `src/features/hr-kpi/components/ProductivityKpiSection.tsx`
- Create: `src/features/hr-kpi/components/EngagementKpiSection.tsx`
- Create: `src/features/hr-kpi/components/DevelopmentKpiSection.tsx`
- Create: `src/features/hr-kpi/components/ExportButton.tsx`
- Create: `src/features/hr-kpi/components/HrKpiDashboard.tsx`

- [ ] **Step 1: KpiSummaryCard を作成する（再利用カード）**

```tsx
// src/features/hr-kpi/components/KpiSummaryCard.tsx
'use client'

interface KpiSummaryCardProps {
  label: string
  value: string
  sub?: string
  status?: 'normal' | 'warning' | 'danger' | 'info'
  icon?: React.ReactNode
}

const STATUS_COLORS: Record<string, string> = {
  normal: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}

export function KpiSummaryCard({ label, value, sub, status = 'normal', icon }: KpiSummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-500">{icon}</span>}
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${STATUS_COLORS[status] ?? STATUS_COLORS.info}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: RecruitKpiSection を作成する**

```tsx
// src/features/hr-kpi/components/RecruitKpiSection.tsx
'use client'

import { Users, Briefcase, TrendingUp, CheckCircle } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { RecruitKpi } from '../types'

interface Props {
  kpi: RecruitKpi
}

export function RecruitKpiSection({ kpi }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Briefcase size={16} className="text-primary" />
        採用
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSummaryCard
          label="今月の応募数"
          value={`${kpi.applicantsThisMonth}件`}
          icon={<Users size={14} />}
          status="info"
        />
        <KpiSummaryCard
          label="選考通過率"
          value={kpi.passThroughRate != null ? `${kpi.passThroughRate}%` : 'データなし'}
          sub="応募→内定・入社"
          icon={<TrendingUp size={14} />}
          status={kpi.passThroughRate != null && kpi.passThroughRate >= 10 ? 'normal' : 'warning'}
        />
        <KpiSummaryCard
          label="充足率"
          value={kpi.fillRate != null ? `${kpi.fillRate}%` : 'データなし'}
          sub="入社済み / 公開求人数"
          icon={<CheckCircle size={14} />}
          status={kpi.fillRate != null && kpi.fillRate >= 50 ? 'normal' : 'warning'}
        />
        <KpiSummaryCard
          label="公開中求人数"
          value={`${kpi.openJobPostings}件`}
          icon={<Briefcase size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: RetentionKpiSection を作成する**

```tsx
// src/features/hr-kpi/components/RetentionKpiSection.tsx
'use client'

import { UserMinus, Users, Clock } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { RetentionKpi } from '../types'

interface Props {
  kpi: RetentionKpi
}

function formatTenure(months: number | null): string {
  if (months == null) return 'データなし'
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  return y > 0 ? `${y}年${m}ヶ月` : `${m}ヶ月`
}

export function RetentionKpiSection({ kpi }: Props) {
  const turnoverStatus =
    kpi.turnoverRatePercent == null
      ? 'info'
      : kpi.turnoverRatePercent >= 10
        ? 'danger'
        : kpi.turnoverRatePercent >= 5
          ? 'warning'
          : 'normal'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <UserMinus size={16} className="text-primary" />
        定着
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSummaryCard
          label="在籍従業員数"
          value={`${kpi.totalActiveEmployees}名`}
          icon={<Users size={14} />}
          status="info"
        />
        <KpiSummaryCard
          label="直近12ヶ月の退職者数"
          value={`${kpi.turnoverCountLast12Months}名`}
          icon={<UserMinus size={14} />}
          status={kpi.turnoverCountLast12Months > 0 ? 'warning' : 'normal'}
        />
        <KpiSummaryCard
          label="離職率（直近12ヶ月）"
          value={kpi.turnoverRatePercent != null ? `${kpi.turnoverRatePercent}%` : 'データなし'}
          icon={<UserMinus size={14} />}
          status={turnoverStatus}
        />
        <KpiSummaryCard
          label="平均在籍年数"
          value={formatTenure(kpi.avgTenureMonths)}
          icon={<Clock size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: ProductivityKpiSection を作成する**

```tsx
// src/features/hr-kpi/components/ProductivityKpiSection.tsx
'use client'

import { Clock, Sun, AlertTriangle } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { ProductivityKpi } from '../types'

interface Props {
  kpi: ProductivityKpi
}

export function ProductivityKpiSection({ kpi }: Props) {
  const overtimeStatus =
    kpi.avgOvertimeHoursThisMonth == null
      ? 'info'
      : kpi.avgOvertimeHoursThisMonth >= 40
        ? 'danger'
        : kpi.avgOvertimeHoursThisMonth >= 25
          ? 'warning'
          : 'normal'

  const leaveStatus =
    kpi.paidLeaveUtilizationPercent == null
      ? 'info'
      : kpi.paidLeaveUtilizationPercent >= 70
        ? 'normal'
        : kpi.paidLeaveUtilizationPercent >= 50
          ? 'warning'
          : 'danger'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Clock size={16} className="text-primary" />
        生産性・労務
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="平均残業時間（当月）"
          value={
            kpi.avgOvertimeHoursThisMonth != null
              ? `${kpi.avgOvertimeHoursThisMonth}時間`
              : 'データなし'
          }
          sub="1人あたり月間"
          icon={<Clock size={14} />}
          status={overtimeStatus}
        />
        <KpiSummaryCard
          label="有休取得率"
          value={
            kpi.paidLeaveUtilizationPercent != null
              ? `${kpi.paidLeaveUtilizationPercent}%`
              : 'データなし'
          }
          sub="当年度累計"
          icon={<Sun size={14} />}
          status={leaveStatus}
        />
        <KpiSummaryCard
          label="36協定特別条項対象者"
          value={`${kpi.article36SubjectCount}名`}
          sub="当月・未解消"
          icon={<AlertTriangle size={14} />}
          status={kpi.article36SubjectCount > 0 ? 'danger' : 'normal'}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 5: EngagementKpiSection を作成する**

```tsx
// src/features/hr-kpi/components/EngagementKpiSection.tsx
'use client'

import { Smile, MessageSquare, Activity } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { EngagementKpi } from '../types'

interface Props {
  kpi: EngagementKpi
}

export function EngagementKpiSection({ kpi }: Props) {
  const pulseStatus =
    kpi.latestPulseSurveyScore == null
      ? 'info'
      : kpi.latestPulseSurveyScore >= 3.5
        ? 'normal'
        : kpi.latestPulseSurveyScore >= 2.5
          ? 'warning'
          : 'danger'

  const stressStatus =
    kpi.highStressRatePercent == null
      ? 'info'
      : kpi.highStressRatePercent >= 20
        ? 'danger'
        : kpi.highStressRatePercent >= 10
          ? 'warning'
          : 'normal'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Smile size={16} className="text-primary" />
        エンゲージメント
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="パルスサーベイ平均スコア"
          value={
            kpi.latestPulseSurveyScore != null
              ? `${kpi.latestPulseSurveyScore} / 5.0`
              : 'データなし'
          }
          sub="直近期間"
          icon={<MessageSquare size={14} />}
          status={pulseStatus}
        />
        <KpiSummaryCard
          label="パルスサーベイ回答率"
          value={
            kpi.latestPulseResponseRate != null
              ? `${kpi.latestPulseResponseRate}%`
              : 'データなし'
          }
          sub="直近期間"
          icon={<MessageSquare size={14} />}
          status={
            kpi.latestPulseResponseRate == null
              ? 'info'
              : kpi.latestPulseResponseRate >= 70
                ? 'normal'
                : 'warning'
          }
        />
        <KpiSummaryCard
          label="高ストレス率"
          value={
            kpi.highStressRatePercent != null
              ? `${kpi.highStressRatePercent}%`
              : 'データなし'
          }
          sub="直近ストレスチェック"
          icon={<Activity size={14} />}
          status={stressStatus}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 6: DevelopmentKpiSection を作成する**

```tsx
// src/features/hr-kpi/components/DevelopmentKpiSection.tsx
'use client'

import { BookOpen, Target, TrendingUp } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { DevelopmentKpi } from '../types'

interface Props {
  kpi: DevelopmentKpi
}

export function DevelopmentKpiSection({ kpi }: Props) {
  const elStatus =
    kpi.elCompletionRatePercent == null
      ? 'info'
      : kpi.elCompletionRatePercent >= 80
        ? 'normal'
        : kpi.elCompletionRatePercent >= 50
          ? 'warning'
          : 'danger'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        育成
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="スキルギャップ率"
          value={
            kpi.skillGapRatePercent != null
              ? `${kpi.skillGapRatePercent}%`
              : 'データなし'
          }
          sub="スキル割り当て済み従業員"
          icon={<Target size={14} />}
          status={
            kpi.skillGapRatePercent == null
              ? 'info'
              : kpi.skillGapRatePercent <= 20
                ? 'normal'
                : kpi.skillGapRatePercent <= 50
                  ? 'warning'
                  : 'danger'
          }
        />
        <KpiSummaryCard
          label="eラーニング完了率"
          value={
            kpi.elCompletionRatePercent != null
              ? `${kpi.elCompletionRatePercent}%`
              : 'データなし'
          }
          sub="全割り当て累計"
          icon={<BookOpen size={14} />}
          status={elStatus}
        />
        <KpiSummaryCard
          label="eラーニング割り当て総数"
          value={`${kpi.activeElAssignments}件`}
          sub="累計"
          icon={<TrendingUp size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 7: ExportButton を作成する（CSVダウンロード）**

```tsx
// src/features/hr-kpi/components/ExportButton.tsx
'use client'

import { Download } from 'lucide-react'
import { bundleToCsvRows } from '../queries'
import type { HrKpiBundle } from '../types'

interface Props {
  bundle: HrKpiBundle
}

export function ExportButton({ bundle }: Props) {
  const handleExport = () => {
    const rows = bundleToCsvRows(bundle)
    // BOM付きUTF-8でExcelが文字化けしないようにする
    const bom = '﻿'
    const csv = bom + rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hr-kpi-${bundle.yearMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <Download size={14} />
      CSVエクスポート
    </button>
  )
}
```

- [ ] **Step 8: HrKpiDashboard メインコンポーネントを作成する**

```tsx
// src/features/hr-kpi/components/HrKpiDashboard.tsx
'use client'

import { RecruitKpiSection } from './RecruitKpiSection'
import { RetentionKpiSection } from './RetentionKpiSection'
import { ProductivityKpiSection } from './ProductivityKpiSection'
import { EngagementKpiSection } from './EngagementKpiSection'
import { DevelopmentKpiSection } from './DevelopmentKpiSection'
import { ExportButton } from './ExportButton'
import type { HrKpiBundle } from '../types'

interface Props {
  bundle: HrKpiBundle
}

export function HrKpiDashboard({ bundle }: Props) {
  const [year, month] = bundle.yearMonth.split('-').map(Number)
  const periodLabel = `${year}年${month}月`
  const fetchedLabel = new Date(bundle.fetchedAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイルに準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* カードヘッダー */}
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              横断KPIダッシュボード
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              集計基準：{periodLabel}　　取得日時：{fetchedLabel}
            </p>
          </div>
          <ExportButton bundle={bundle} />
        </div>

        {/* カード本文 */}
        <div className="p-6 space-y-8">
          <RecruitKpiSection kpi={bundle.recruit} />
          <RetentionKpiSection kpi={bundle.retention} />
          <ProductivityKpiSection kpi={bundle.productivity} />
          <EngagementKpiSection kpi={bundle.engagement} />
          <DevelopmentKpiSection kpi={bundle.development} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: コミットする**

```bash
git add src/features/hr-kpi/
git commit -m "feat: add hr-kpi UI components (KPI cards, sections, dashboard, CSV export)"
```

---

## Task 5: ページファイルを作成する

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/error.tsx`

**注意:** ルートグループ `(hr_kpi)` は新規ディレクトリ。既存の `(labor_compliance)`, `(recurit)` と同一パターン。

- [ ] **Step 1: page.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getJSTYearMonth } from '@/lib/datetime'
import { getHrKpiBundle } from '@/features/hr-kpi/queries'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { HrKpiDashboard } from '@/features/hr-kpi/components/HrKpiDashboard'

export const metadata = { title: '横断KPIダッシュボード' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function HrKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const sp = await searchParams
  const raw = Array.isArray(sp.ym) ? sp.ym[0] : sp.ym
  const yearMonth = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : getJSTYearMonth()

  const result = await getHrKpiBundle(yearMonth)

  if (!result.ok) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <HrKpiDashboard bundle={result.data} />
}
```

- [ ] **Step 2: loading.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/loading.tsx
export default function HrKpiLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between">
          <div>
            <div className="h-8 w-64 rounded bg-gray-300 animate-pulse" />
            <div className="mt-1.5 h-4 w-48 rounded bg-gray-300 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-300 animate-pulse" />
        </div>
        <div className="p-6 space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-5 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="rounded-lg border border-gray-200 p-4 h-20 animate-pulse bg-gray-50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: error.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(hr_kpi)/hr-kpi/error.tsx
'use client'

import { AlertTriangle } from 'lucide-react'

export default function HrKpiError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="text-red-500" size={40} />
      <div>
        <p className="text-lg font-semibold text-gray-800">KPIデータの読み込みに失敗しました</p>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
      >
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 4: コミットする**

```bash
git add "src/app/(tenant)/(colored)/adm/(hr_kpi)/"
git commit -m "feat: add hr-kpi page, loading, error for /adm/hr-kpi"
```

---

## Task 6: 型チェックとビルド確認

- [ ] **Step 1: 型チェックを実行する**

```bash
npm run type-check 2>&1 | head -80
```

Expected: エラーなし。`supabase as any` に関する警告は既存コードと同パターンのため許容範囲。

- [ ] **Step 2: ビルドを実行する**

```bash
npm run build 2>&1 | tail -40
```

Expected: `/adm/hr-kpi` が Route リストに含まれる。

- [ ] **Step 3: ビルドエラーが出た場合**

build-error-resolver エージェントに委譲する。コンテキスト：変更ファイルは `src/features/hr-kpi/` 全体、`src/app/(tenant)/(colored)/adm/(hr_kpi)/` 全体、`src/config/routes.ts`。

---

## Task 7: 動作確認

- [ ] **Step 1: 開発サーバーを起動して `/adm/hr-kpi` にアクセスする**

```bash
npm run dev
```

確認ポイント：
- ページが正常にロードされる
- 5セクション（採用・定着・生産性・エンゲージメント・育成）が表示される
- データが存在しない項目は「データなし」と表示される（クラッシュしない）
- CSVエクスポートでファイルがダウンロードされ、Excelで開いて文字化けしない
- HR系ロール以外でアクセスすると `/adm` にリダイレクトされる

- [ ] **Step 2: 最終コミットを作成する**

```bash
git status
git commit -m "feat: implement P1-D hr-kpi cross-domain KPI dashboard

- 採用・定着・生産性・エンゲージメント・育成の5領域KPIを1画面に集約
- 新規テーブル不要・既存データの変更なし
- CSVエクスポート機能（BOM付きUTF-8）付き
- ルート /adm/hr-kpi、権限: hr/hr_manager/tenant_admin/developer"
```

---

## 自己レビュー（スペック整合確認）

### スペックカバレッジチェック

| 仕様 | 対応タスク | 状態 |
|------|-----------|------|
| 採用KPI: 応募数・選考通過率・充足率 | Task 2, 3, 4 | ✅ |
| 定着KPI: 離職率・平均在籍年数 | Task 2, 3, 4 | ✅ |
| 生産性KPI: 平均残業時間・有休取得率 | Task 2, 3, 4 | ✅ |
| エンゲージメントKPI: パルスサーベイ平均・高ストレス率 | Task 2, 3, 4 | ✅ |
| 育成KPI: スキルギャップ率・研修完了率 | Task 2, 3, 4 | ✅ |
| CSVエクスポート | Task 4 (ExportButton) | ✅ |
| PDFエクスポート | — | ⚠️ 今回対象外（ブラウザPDF生成は品質不安定のためCSVのみ実装） |
| ルート `/adm/hr-kpi` | Task 1, 5 | ✅ |
| 既存テーブル・データは変更なし | SELECTのみ、新規テーブルなし | ✅ |
| loading.tsx / error.tsx | Task 5 | ✅ |
| 権限制御（HR系ロールのみ） | Task 5 | ✅ |
| APP_ROUTES 定数 | Task 1 | ✅ |

### 型・メソッド名の一貫性確認

- `HrKpiBundle` → `getHrKpiBundle()` の戻り値型 ✅
- `bundleToCsvRows(bundle: HrKpiBundle)` → `ExportButton` 内で呼び出し ✅
- `RecruitKpi`, `RetentionKpi`, `ProductivityKpi`, `EngagementKpi`, `DevelopmentKpi` → 各セクションの Props 型と一致 ✅
- `APP_ROUTES.TENANT.ADMIN_HR_KPI` → Task 1 で追加、page.tsx では未使用（redirect先としてのみ使用） ✅
- `getJSTYearMonth()` → `@/lib/datetime` から既存インポート、overtime/queries.ts と同一パターン ✅
