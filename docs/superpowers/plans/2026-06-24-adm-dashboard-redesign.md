# /adm メインダッシュボード再設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/adm` のメインパネルを、採用AI中心の内容から、在籍社員数・離職率などのKPI、サーベイ・ウェルビーイング、学習・成長、ツールボックスの4セクション構成の総合ダッシュボードに完全に置き換える。

**Architecture:** 新規 `src/features/adm-dashboard/` フィーチャーに1つの集約クエリ関数 `getAdmDashboardSummary()` を作成し、既存の `hr-kpi`・`one-on-one`・`stress-check`・`e-learning`・`questionnaire` の各 `queries.ts` をできるだけ再利用して必要な統計値をまとめる。`page.tsx`（Server Component）はこの1関数を呼び出し、結果を新規プレゼンテーションコンポーネント（`DashboardSectionCard`・`ToolboxGrid`）に渡すだけにする。

**Tech Stack:** Next.js 16 App Router（Server Component）、TypeScript、Supabase（既存 `createClient()` / `getServerUser()`）、Tailwind CSS v4、lucide-react、node:test（純粋関数のみ単体テスト）。

## Global Constraints

- 設計書: `docs/superpowers/specs/2026-06-24-adm-dashboard-redesign-design.md`（このプランの元spec）
- 既存テナント分離パターンを厳守する：DBアクセスは必ず `tenant_id` でスコープする（既存クエリ関数を呼ぶ場合はそれらが内部で行っている）
- `createAdminClient()` は使用しない（このページはテナント管理者向けであり、`createClient()`（RLS有効）のみを使う）
- URL は `APP_ROUTES` 定数から参照する（ハードコード禁止）
- コードコメントは日本語で記述する
- **テスト方針（このリポジトリの既存規約に合わせる）:** このコードベースの既存 `queries.ts` 群（hr-kpi, one-on-one, stress-check, questionnaire, e-learning 等）は Supabase に直接依存するため単体テストを持たない。唯一の既存テスト例 `src/features/adm/stress-check/progress-establishments.test.ts` は **DB を介さない純粋関数のみ** を `node:test` でテストしている。このプランも同じ方針を取る：新規に書く純粋な集計ロジック（`summarizeQuestionnaires`）は TDD でテストするが、Supabase 呼び出しを含むクエリ関数自体は既存パターンに合わせてユニットテスト対象外とし、Task 8 の手動確認（`npm run dev` での目視確認）で検証する。
- テストコマンド: `./node_modules/.bin/tsx --test <path-to-test-file>`
- 型チェック: `npm run type-check`、Lint: `npm run lint`

---

### Task 1: `RetentionKpi` に「今月入社」フィールドを追加する

**Files:**
- Modify: `src/features/hr-kpi/types.ts`
- Modify: `src/features/hr-kpi/queries.ts`

**Interfaces:**
- Produces: `RetentionKpi.hiredThisMonth: number`（後続タスクが `kpi.retention.hiredThisMonth` として参照する）

- [ ] **Step 1: `RetentionKpi` 型に `hiredThisMonth` を追加する**

`src/features/hr-kpi/types.ts` の `RetentionKpi` インターフェースを次のように変更する（既存の4フィールドの末尾に1行追加）:

```typescript
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
  /** 当月の入社者数（active_status='active' かつ hired_date が当月） */
  hiredThisMonth: number
}
```

- [ ] **Step 2: `fetchRetentionKpi()` に今月入社の集計クエリを追加する**

`src/features/hr-kpi/queries.ts` の `fetchRetentionKpi` 関数を次のように変更する（関数全体を置き換え）:

```typescript
/** 定着KPIを集計する（既存データの読み取りのみ） */
async function fetchRetentionKpi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tenantId: string,
  yearMonth: string
): Promise<RetentionKpi> {
  const since = `${monthsAgo(yearMonth, 12)}-01`
  const startOfMonth = `${yearMonth}-01`
  const endOfMonth = lastDayOfMonth(yearMonth)

  const [activeRes, turnoverRes, tenureRes, hiredThisMonthRes] = await Promise.all([
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
    supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active_status', 'active')
      .gte('hired_date', startOfMonth)
      .lte('hired_date', endOfMonth),
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
    hiredThisMonth: hiredThisMonthRes.count ?? 0,
  }
}
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし（`RetentionKpi` を参照している既存箇所が壊れていないことを確認する。新規フィールドは optional ではないため、もし他に `RetentionKpi` を手動構築している箇所があればエラーになる — その場合はその箇所にも `hiredThisMonth` を追加する）

- [ ] **Step 4: Commit**

```bash
git add src/features/hr-kpi/types.ts src/features/hr-kpi/queries.ts
git commit -m "feat: add hiredThisMonth to RetentionKpi for dashboard headcount card"
```

---

### Task 2: アンケート集計の純粋関数 `summarizeQuestionnaires` を作成する（TDD）

**Files:**
- Create: `src/features/adm-dashboard/summarize.ts`
- Test: `src/features/adm-dashboard/summarize.test.ts`

**Interfaces:**
- Consumes: `QuestionnaireListItem` from `@/features/questionnaire/types`（既存、`status: 'draft' | 'active' | 'closed'`, `assignment_count: number`, `submitted_count: number`）
- Produces: `summarizeQuestionnaires(items: QuestionnaireListItem[]): QuestionnaireSummary` where `QuestionnaireSummary = { activeCount: number; averageResponseRatePercent: number | null }`（Task 4 が使用する）

- [ ] **Step 1: 失敗するテストを書く**

Create `src/features/adm-dashboard/summarize.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { summarizeQuestionnaires } from './summarize'
import type { QuestionnaireListItem } from '@/features/questionnaire/types'

function makeItem(overrides: Partial<QuestionnaireListItem>): QuestionnaireListItem {
  return {
    id: 'q-1',
    creator_type: 'tenant',
    tenant_id: 'tenant-1',
    title: 'テストアンケート',
    description: null,
    status: 'active',
    created_by_employee_id: null,
    created_at: '2026-06-01T00:00:00+09:00',
    updated_at: '2026-06-01T00:00:00+09:00',
    question_count: 5,
    assignment_count: 0,
    submitted_count: 0,
    period_count: 1,
    has_ongoing_period_display: true,
    ongoing_period_start_date: '2026-06-01',
    ongoing_period_end_date: '2026-06-30',
    ...overrides,
  }
}

test('counts only active questionnaires and averages response rate across them', () => {
  const items = [
    makeItem({ id: 'q-1', status: 'active', assignment_count: 100, submitted_count: 80 }),
    makeItem({ id: 'q-2', status: 'active', assignment_count: 50, submitted_count: 25 }),
    makeItem({ id: 'q-3', status: 'draft', assignment_count: 10, submitted_count: 10 }),
    makeItem({ id: 'q-4', status: 'closed', assignment_count: 10, submitted_count: 10 }),
  ]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 2)
  // (80/100 + 25/50) / 2 = (0.8 + 0.5) / 2 = 0.65 → 65%
  assert.equal(summary.averageResponseRatePercent, 65)
})

test('ignores active questionnaires with zero assignments when averaging response rate', () => {
  const items = [
    makeItem({ id: 'q-1', status: 'active', assignment_count: 0, submitted_count: 0 }),
    makeItem({ id: 'q-2', status: 'active', assignment_count: 20, submitted_count: 10 }),
  ]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 2)
  assert.equal(summary.averageResponseRatePercent, 50)
})

test('returns null average response rate when there are no active questionnaires with assignments', () => {
  const items = [makeItem({ id: 'q-1', status: 'draft', assignment_count: 5, submitted_count: 1 })]

  const summary = summarizeQuestionnaires(items)

  assert.equal(summary.activeCount, 0)
  assert.equal(summary.averageResponseRatePercent, null)
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `./node_modules/.bin/tsx --test src/features/adm-dashboard/summarize.test.ts`
Expected: FAIL（`Cannot find module './summarize'` または同様のモジュール未検出エラー）

- [ ] **Step 3: 最小限の実装を書く**

Create `src/features/adm-dashboard/summarize.ts`:

```typescript
import type { QuestionnaireListItem } from '@/features/questionnaire/types'

export interface QuestionnaireSummary {
  /** status='active' のアンケート件数 */
  activeCount: number
  /** 実施中アンケート（割り当て1件以上）の平均回答率（%） */
  averageResponseRatePercent: number | null
}

/** アンケート一覧から「実施中件数」と「平均回答率」を集計する（汎用アンケートカード用） */
export function summarizeQuestionnaires(items: QuestionnaireListItem[]): QuestionnaireSummary {
  const active = items.filter(item => item.status === 'active')
  const withAssignments = active.filter(item => item.assignment_count > 0)

  const averageResponseRatePercent =
    withAssignments.length > 0
      ? Math.round(
          (withAssignments.reduce(
            (sum, item) => sum + item.submitted_count / item.assignment_count,
            0
          ) /
            withAssignments.length) *
            1000
        ) / 10
      : null

  return {
    activeCount: active.length,
    averageResponseRatePercent,
  }
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `./node_modules/.bin/tsx --test src/features/adm-dashboard/summarize.test.ts`
Expected: `tests 3`, `pass 3`, `fail 0`

- [ ] **Step 5: Commit**

```bash
git add src/features/adm-dashboard/summarize.ts src/features/adm-dashboard/summarize.test.ts
git commit -m "feat: add summarizeQuestionnaires aggregation for adm dashboard"
```

---

### Task 3: ダッシュボード集約データの型を定義する

**Files:**
- Create: `src/features/adm-dashboard/types.ts`

**Interfaces:**
- Produces: `AdmDashboardSummary`（Task 4 が返し、Task 7 の `page.tsx` が消費する）

- [ ] **Step 1: 型ファイルを作成する**

Create `src/features/adm-dashboard/types.ts`:

```typescript
/** /adm メインダッシュボードに表示する集約データ */
export interface AdmDashboardSummary {
  headcount: {
    /** 在籍社員数 */
    activeEmployees: number
    /** 今月入社の社員数 */
    hiredThisMonth: number
    /** 離職率（年換算、%） */
    turnoverRatePercent: number | null
    /** 採用中（公開中）ポジション数 */
    openJobPostings: number
  }
  pulseSurvey: {
    /** 直近パルスサーベイの回答率（%） */
    responseRatePercent: number | null
    /** 直近パルスサーベイのスコア（0-5スケール） */
    score: number | null
  }
  skillDevelopment: {
    /** eラーニング研修完了率（%） */
    elCompletionRatePercent: number | null
    /** スキルギャップ率（%） */
    skillGapRatePercent: number | null
  }
  oneOnOne: {
    /** 直近30日の1on1実施件数 */
    sessionsLast30Days: number
    /** 30日以上未実施の対象者数 */
    overdueCount: number
  }
  stressCheck: {
    /** 実施中期間の受検率（%）。実施中期間が無い場合は null */
    submissionRatePercent: number | null
    /** 高ストレス者数（実施中期間が無い場合は0） */
    highStressCount: number
  }
  eLearning: {
    /** 公開中のコース数 */
    publishedCourseCount: number
    /** 受講中（未完了）の割り当て数 */
    inProgressAssignmentCount: number
    /** 研修完了率（%）— skillDevelopment と同じ値（eラーニング割り当て全体の完了率） */
    completionRatePercent: number | null
  }
  questionnaire: {
    /** 実施中（status='active'）のアンケート件数 */
    activeCount: number
    /** 実施中アンケートの平均回答率（%） */
    averageResponseRatePercent: number | null
  }
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/adm-dashboard/types.ts
git commit -m "feat: add AdmDashboardSummary type for /adm dashboard"
```

---

### Task 4: 集約クエリ `getAdmDashboardSummary()` を実装する

**Files:**
- Create: `src/features/adm-dashboard/queries.ts`

**Interfaces:**
- Consumes:
  - `getServerUser(): Promise<AppUser | null>` from `@/lib/auth/server-user`（`user.tenant_id: string`）
  - `createClient(): Promise<SupabaseClient>` from `@/lib/supabase/server`
  - `getHrKpiBundle(yearMonth?: string): Promise<{ ok: true; data: HrKpiBundle } | { ok: false; error: string }>` from `@/features/hr-kpi/queries`
  - `getOneOnOneDashboardData(): Promise<OneOnOneDashboardData>` from `@/features/one-on-one/queries`（`totalSessionsLast30Days: number`, `overdueEmployees: OverdueEmployee[]`）
  - `getActiveStressCheckPeriod(tenantId: string): Promise<{ id: string } | null>` from `@/features/adm/stress-check/queries`
  - `getProgressStats(tenantId: string, periodId?: string): Promise<ProgressStats>` from `@/features/adm/stress-check/queries`（`submissionRate: number`）
  - `getCourses(options?: { status?: string; category?: string }): Promise<ElCourse[]>` from `@/features/e-learning/queries`
  - `getQuestionnaires(tenantId: string): Promise<QuestionnaireListItem[]>` from `@/features/questionnaire/queries`
  - `summarizeQuestionnaires(items: QuestionnaireListItem[]): QuestionnaireSummary` from `./summarize`（Task 2）
- Produces: `getAdmDashboardSummary(): Promise<AdmDashboardSummary | null>`（Task 7 が `page.tsx` から呼ぶ。テナント情報が取得できない場合は `null`）

- [ ] **Step 1: クエリ関数を実装する**

Create `src/features/adm-dashboard/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getHrKpiBundle } from '@/features/hr-kpi/queries'
import { getOneOnOneDashboardData } from '@/features/one-on-one/queries'
import { getActiveStressCheckPeriod, getProgressStats } from '@/features/adm/stress-check/queries'
import { getCourses } from '@/features/e-learning/queries'
import { getQuestionnaires } from '@/features/questionnaire/queries'
import { summarizeQuestionnaires } from './summarize'
import type { AdmDashboardSummary } from './types'

/** /adm メインダッシュボード用のデータを並列取得し、表示用に集約する */
export async function getAdmDashboardSummary(): Promise<AdmDashboardSummary | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const tenantId = user.tenant_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [kpiResult, oneOnOneData, activeStressPeriod, publishedCourses, questionnaires, inProgressRes] =
    await Promise.all([
      getHrKpiBundle(),
      getOneOnOneDashboardData(),
      getActiveStressCheckPeriod(tenantId),
      getCourses({ status: 'published' }),
      getQuestionnaires(tenantId),
      supabase
        .from('el_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('completed_at', null),
    ])

  if (!kpiResult.ok) return null
  const kpi = kpiResult.data

  let stressSubmissionRatePercent: number | null = null
  let highStressCount = 0

  if (activeStressPeriod?.id) {
    const [progress, highStressRes] = await Promise.all([
      getProgressStats(tenantId, activeStressPeriod.id),
      supabase
        .from('stress_check_results')
        .select('id', { count: 'exact', head: true })
        .eq('period_id', activeStressPeriod.id)
        .eq('is_high_stress', true),
    ])
    stressSubmissionRatePercent = progress.submissionRate
    highStressCount = highStressRes.count ?? 0
  }

  const questionnaireSummary = summarizeQuestionnaires(questionnaires)

  return {
    headcount: {
      activeEmployees: kpi.retention.totalActiveEmployees,
      hiredThisMonth: kpi.retention.hiredThisMonth,
      turnoverRatePercent: kpi.retention.turnoverRatePercent,
      openJobPostings: kpi.recruit.openJobPostings,
    },
    pulseSurvey: {
      responseRatePercent: kpi.engagement.latestPulseResponseRate,
      score: kpi.engagement.latestPulseSurveyScore,
    },
    skillDevelopment: {
      elCompletionRatePercent: kpi.development.elCompletionRatePercent,
      skillGapRatePercent: kpi.development.skillGapRatePercent,
    },
    oneOnOne: {
      sessionsLast30Days: oneOnOneData.totalSessionsLast30Days,
      overdueCount: oneOnOneData.overdueEmployees.length,
    },
    stressCheck: {
      submissionRatePercent: stressSubmissionRatePercent,
      highStressCount,
    },
    eLearning: {
      publishedCourseCount: publishedCourses.length,
      inProgressAssignmentCount: inProgressRes.count ?? 0,
      completionRatePercent: kpi.development.elCompletionRatePercent,
    },
    questionnaire: questionnaireSummary,
  }
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし。`getActiveStressCheckPeriod` の戻り値が `any` 寄りの場合、`activeStressPeriod?.id` のアクセスでエラーが出ないことを確認する（既存コードでも同様に `any` キャストされたSupabaseクライアントを使っているため通常は問題ない）。

- [ ] **Step 3: Commit**

```bash
git add src/features/adm-dashboard/queries.ts
git commit -m "feat: add getAdmDashboardSummary aggregating existing KPI/feature queries"
```

---

### Task 5: `DashboardSectionCard` コンポーネントを作成する

**Files:**
- Create: `src/features/adm-dashboard/components/DashboardSectionCard.tsx`

**Interfaces:**
- Consumes: `Badge` from `@/components/ui/Badge`（`variant: 'primary' | 'teal' | 'orange' | 'neutral'`）
- Produces: `DashboardSectionCard` React component with props `{ icon: ReactNode; iconClassName?: string; title: string; description: string; stats: { label: string; value: string }[]; href: string }`（Task 7 が使用する）

- [ ] **Step 1: コンポーネントを実装する**

Create `src/features/adm-dashboard/components/DashboardSectionCard.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'

interface DashboardSectionCardStat {
  label: string
  value: string
}

interface DashboardSectionCardProps {
  icon: ReactNode
  iconClassName?: string
  title: string
  description: string
  stats: DashboardSectionCardStat[]
  href: string
}

/** サーベイ・ウェルビーイング / 学習・成長セクションで使うリンク付きカード */
export function DashboardSectionCard({
  icon,
  iconClassName = 'bg-[#fff3e6] text-[#FD7601]',
  title,
  description,
  stats,
  href,
}: DashboardSectionCardProps) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-2 rounded-lg border border-[#e2e6ec] bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <div className={`shrink-0 rounded-md p-1.5 ${iconClassName}`}>{icon}</div>
        <h3 className="text-sm font-bold text-[#161b22]">{title}</h3>
        <Badge variant="teal" className="ml-auto px-2 py-0.5 text-[10px]">
          NEW
        </Badge>
      </div>
      <p className="text-xs leading-relaxed text-[#57606a]">{description}</p>
      <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-[#57606a]">
        {stats.map(stat => (
          <span key={stat.label}>
            {stat.label} <span className="font-bold text-[#161b22]">{stat.value}</span>
          </span>
        ))}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/adm-dashboard/components/DashboardSectionCard.tsx
git commit -m "feat: add DashboardSectionCard component for adm dashboard sections"
```

---

### Task 6: `ToolboxGrid` コンポーネントを作成する

**Files:**
- Create: `src/features/adm-dashboard/components/ToolboxGrid.tsx`

**Interfaces:**
- Produces: `ToolboxGrid` React component（プロパティなし、Task 7 が `<ToolboxGrid />` として使用する）

- [ ] **Step 1: コンポーネントを実装する**

Create `src/features/adm-dashboard/components/ToolboxGrid.tsx`:

```tsx
import {
  Calculator,
  ShieldAlert,
  FileText,
  Wallet,
  TrendingDown,
  FileSignature,
  Coins,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const TOOLS = [
  { label: '残業代計算', icon: Calculator },
  { label: '36協定チェッカー', icon: ShieldAlert },
  { label: '通知文テンプレ', icon: FileText },
  { label: '有給残数計算', icon: Wallet },
  { label: '離職率シミュ', icon: TrendingDown },
  { label: '雇用契約書生成', icon: FileSignature },
  { label: '賞与試算', icon: Coins },
] as const

/** 業務効率化ツール集。すべて未実装のため「準備中」表示・クリック不可。 */
export function ToolboxGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {TOOLS.map(tool => {
        const Icon = tool.icon
        return (
          <div
            key={tool.label}
            className="flex cursor-default flex-col items-center justify-center gap-2 rounded-lg border border-[#e2e6ec] bg-white p-4 text-center shadow-xs"
          >
            <Icon className="h-5 w-5 text-[#57606a]" />
            <span className="text-xs font-medium text-[#161b22]">{tool.label}</span>
            <Badge variant="neutral" className="px-2 py-0.5 text-[10px]">
              準備中
            </Badge>
          </div>
        )
      })}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#e2e6ec] p-4 text-center text-[#57606a]"
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">ツールを追加</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/adm-dashboard/components/ToolboxGrid.tsx
git commit -m "feat: add ToolboxGrid placeholder component for adm dashboard"
```

---

### Task 7: `/adm` の `page.tsx` を新ダッシュボードに置き換える

**Files:**
- Modify: `src/app/(tenant)/(tenant-admin)/adm/page.tsx`（全面書き換え）

**Interfaces:**
- Consumes:
  - `getAdmDashboardSummary(): Promise<AdmDashboardSummary | null>` from `@/features/adm-dashboard/queries`（Task 4）
  - `DashboardSectionCard` from `@/features/adm-dashboard/components/DashboardSectionCard`（Task 5）
  - `ToolboxGrid` from `@/features/adm-dashboard/components/ToolboxGrid`（Task 6）
  - `KpiSummaryCard` from `@/features/hr-kpi/components/KpiSummaryCard`（既存、props: `{ label: string; value: string; sub?: string; status?: 'normal' | 'warning' | 'danger' | 'info'; icon?: ReactNode }`）
  - `APP_ROUTES.TENANT.{ADMIN_TENANT_QUESTIONNAIRE, ADMIN_SKILL_MAP, ADMIN_ONE_ON_ONE, ADMIN_STRESS_CHECK_GROUP_ANALYSIS, ADMIN_EL_COURSES, ADMIN_SURVEY}` from `@/config/routes`（既存）

- [ ] **Step 1: `page.tsx` を全面置き換えする**

Replace the entire contents of `src/app/(tenant)/(tenant-admin)/adm/page.tsx` with:

```tsx
import {
  Users,
  UserPlus,
  TrendingDown,
  Briefcase,
  HeartPulse,
  GraduationCap,
  MessageCircle,
  Activity,
  BookOpen,
  ClipboardList,
  Wrench,
} from 'lucide-react'
import { KpiSummaryCard } from '@/features/hr-kpi/components/KpiSummaryCard'
import { DashboardSectionCard } from '@/features/adm-dashboard/components/DashboardSectionCard'
import { ToolboxGrid } from '@/features/adm-dashboard/components/ToolboxGrid'
import { getAdmDashboardSummary } from '@/features/adm-dashboard/queries'
import { APP_ROUTES } from '@/config/routes'

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

export default async function HrDashboardPage() {
  const summary = await getAdmDashboardSummary()

  if (!summary) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
        <p className="text-sm text-[#57606a]">
          テナント情報を取得できませんでした。再度ログインしてください。
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#161b22] sm:text-3xl">
          人事ダッシュボード
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSummaryCard
          label="在籍社員数"
          value={`${summary.headcount.activeEmployees}`}
          sub="名"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="今月入社"
          value={`${summary.headcount.hiredThisMonth}`}
          sub="名"
          icon={<UserPlus className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="離職率（年換算）"
          value={formatPercent(summary.headcount.turnoverRatePercent)}
          status={
            summary.headcount.turnoverRatePercent !== null &&
            summary.headcount.turnoverRatePercent >= 10
              ? 'danger'
              : 'normal'
          }
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="採用中ポジション"
          value={`${summary.headcount.openJobPostings}`}
          sub="件"
          icon={<Briefcase className="h-4 w-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#161b22]">サーベイ・ウェルビーイング</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardSectionCard
            icon={<HeartPulse className="h-4 w-4" />}
            iconClassName="bg-rose-50 text-rose-600"
            title="パルスサーベイ"
            description="毎週・隔週・月次で短いアンケートを自動配信。eNPS・エンゲージメントスコアをリアルタイム追跡。"
            href={APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE}
            stats={[
              { label: '回答率', value: formatPercent(summary.pulseSurvey.responseRatePercent) },
              {
                label: 'eNPS',
                value: summary.pulseSurvey.score === null ? '—' : `${summary.pulseSurvey.score}`,
              },
            ]}
          />
          <DashboardSectionCard
            icon={<GraduationCap className="h-4 w-4" />}
            iconClassName="bg-emerald-50 text-emerald-600"
            title="スキル・能力向上"
            description="社員ごとのスキルマップ管理。研修履歴・資格取得状況、不足スキルのギャップ分析も。"
            href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP}
            stats={[
              {
                label: '研修完了率',
                value: formatPercent(summary.skillDevelopment.elCompletionRatePercent),
              },
              {
                label: 'スキルギャップ率',
                value: formatPercent(summary.skillDevelopment.skillGapRatePercent),
              },
            ]}
          />
          <DashboardSectionCard
            icon={<MessageCircle className="h-4 w-4" />}
            iconClassName="bg-sky-50 text-sky-600"
            title="1on1/フォローアップ"
            description="マネージャーと部下の1on1を記録・可視化。アジェンダテンプレート・アクションアイテム管理・次回日程スケジュール。"
            href={APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE}
            stats={[
              { label: '今月実施件数', value: `${summary.oneOnOne.sessionsLast30Days}件` },
              { label: '未実施', value: `${summary.oneOnOne.overdueCount}名` },
            ]}
          />
          <DashboardSectionCard
            icon={<Activity className="h-4 w-4" />}
            iconClassName="bg-amber-50 text-amber-600"
            title="ストレスチェック"
            description="法定57項目を電子実施。高ストレス者の自動判定・産業医連携・集団分析レポートで労働局提出まで対応。"
            href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS}
            stats={[
              {
                label: '実施率',
                value: formatPercent(summary.stressCheck.submissionRatePercent),
              },
              { label: '高ストレス者', value: `${summary.stressCheck.highStressCount}名` },
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#161b22]">学習・成長</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardSectionCard
            icon={<BookOpen className="h-4 w-4" />}
            iconClassName="bg-violet-50 text-violet-600"
            title="eラーニング"
            description="コース作成・受講管理・修了証発行を一元化。スキル・能力向上と連動し、不足スキルに対応した研修を自動配信。"
            href={APP_ROUTES.TENANT.ADMIN_EL_COURSES}
            stats={[
              { label: '公開コース', value: `${summary.eLearning.publishedCourseCount}件` },
              { label: '受講中', value: `${summary.eLearning.inProgressAssignmentCount}件` },
            ]}
          />
          <DashboardSectionCard
            icon={<ClipboardList className="h-4 w-4" />}
            iconClassName="bg-slate-100 text-slate-700"
            title="アンケート（汎用）"
            description="パルスサーベイ・ストレスチェック以外の自由形式アンケートを作成・配信・集計。入社後・退職理由・研修評価など。"
            href={APP_ROUTES.TENANT.ADMIN_SURVEY}
            stats={[
              { label: '実施中', value: `${summary.questionnaire.activeCount}件` },
              {
                label: '平均回答率',
                value: formatPercent(summary.questionnaire.averageResponseRatePercent),
              },
            ]}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#161b22]">
          <Wrench className="h-4 w-4" />
          ツールボックス
        </h2>
        <ToolboxGrid />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックと Lint を実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tenant)/(tenant-admin)/adm/page.tsx"
git commit -m "feat: replace /adm main panel with comprehensive HR dashboard"
```

---

### Task 8: 開発サーバーで目視確認する

**Files:** なし（手動確認のみ）

- [ ] **Step 1: 開発サーバーを起動する**

Run: `npm run dev`
Expected: `http://localhost:3000` で起動し、エラーなし

- [ ] **Step 2: テナント管理者でログインし `/adm` を開く**

ブラウザで `http://localhost:3000/adm` を開き、以下を目視確認する:
- KPIカード4枚（在籍社員数・今月入社・離職率・採用中ポジション）が表示される
- 「サーベイ・ウェルビーイング」セクションに4カード（パルスサーベイ・スキル・能力向上・1on1/フォローアップ・ストレスチェック）が表示され、各カードクリックで対応する既存ページに遷移する
- 「学習・成長」セクションに2カード（eラーニング・アンケート（汎用））が表示され、クリックで対応する既存ページに遷移する
- 「ツールボックス」セクションに7つの「準備中」タイルと「ツールを追加」タイルが表示され、いずれもクリックできない（リンク遷移しない）
- データが存在しない項目（例：実施中のストレスチェック期間が無い等）は `—` 表示になり、画面が崩れない

- [ ] **Step 3: 既存の採用AI機能ページに影響がないことを確認する**

`/adm/funnel`（採用ファネル）など、`page.tsx` 内に直接書かれていた「AI求人・募集文メーカー」等の導線が他のページ（採用ファネルやサイドバーメニュー）からも到達可能であることを確認する。到達できない場合は、サイドバーメニュー（`src/components/layout/`）に該当リンクが既に存在するか確認し、無ければユーザーに報告する（このタスクのスコープ外であり、別タスクとして扱う）。

- [ ] **Step 4: 最終コミット（必要な場合のみ）**

目視確認で軽微な調整（クラス名の微修正など）を行った場合は、修正後に以下を実行する:

```bash
git add -A
git commit -m "fix: adjust /adm dashboard styling after manual verification"
```

確認のみで修正が不要だった場合はこのステップをスキップする。
