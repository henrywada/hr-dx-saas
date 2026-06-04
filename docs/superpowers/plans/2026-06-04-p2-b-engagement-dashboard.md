# P2-B 統合エンゲージメントダッシュボード 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** パルスサーベイ・ストレスチェック・Echoアンケートの3ソースを1画面に統合し、部署別ヒートマップと月次スコア推移グラフを提供する統合エンゲージメントダッシュボードを `/adm/engagement` に実装する。

**Architecture:** 既存テーブル（`pulse_survey_responses`・`stress_check_results`・`questionnaire_responses`）を読み取り専用で参照し、新テーブルは **一切追加しない**（既存データ無変更）。`src/features/engagement/queries.ts` で3ソースの集計を行い、Server Component の `page.tsx` が取得してクライアントコンポーネントに渡す。グラフは既存プロジェクトで使用済みの Recharts を利用する。

**Tech Stack:** Next.js 16 App Router、TypeScript 5、Supabase（PostgreSQL + RLS）、Tailwind CSS v4、Recharts、`as any` キャスト（既存パターン踏襲）

---

## スキーマ確認事項（実装前に把握しておく事実）

### pulse_survey_responses
- `survey_period`: `'YYYY-MM'` 文字列（月次）
- `score`: 1〜10 の整数（表示は ÷2 で 0〜5.0 スケール）
- `user_id`: `auth.users.id`（employees.id ではない）
- `question_id` → `pulse_survey_questions.id`（category フィールドあり）
- RLS: tenant_id で分離

### stress_check_results
- `is_high_stress`: boolean
- `employee_id`: `employees.id`（直接参照可能）
- `period_id` → `stress_check_periods.id`（tenant_id, title, start_date, end_date あり）
- `tenant_id` で分離

### questionnaire_responses
- `submitted_at IS NULL` = 未提出、`NOT NULL` = 提出済み
- `employee_id`: `employees.id`
- `period_id` → `questionnaire_periods.id`（start_date, end_date, label あり）
- `questionnaire_id` → `questionnaires.id`（title あり）

### employees
- `active_status = 'active'` でフィルタ
- `user_id`: `auth.users.id`（pulse_survey_responses との結合キー）
- `divisions(id, name)` でリレーション取得可能

---

## ファイル構成（作成 / 変更）

```
src/features/engagement/
├── types.ts                              # 新規作成: 型定義
├── queries.ts                            # 新規作成: 読み取り専用クエリ（3ソース集計）
└── components/
    ├── EngagementDashboard.tsx           # 新規作成: メインダッシュボード (Client)
    ├── EngagementScoreCards.tsx          # 新規作成: 3ソース統合スコアカード
    ├── MonthlyTrendChart.tsx             # 新規作成: 月次推移グラフ (Recharts)
    └── DepartmentHeatmap.tsx             # 新規作成: 部署別ヒートマップ

src/app/(tenant)/(colored)/adm/(engagement)/engagement/
├── page.tsx                              # 新規作成: Server Component
├── loading.tsx                           # 新規作成: スケルトン
└── error.tsx                             # 新規作成: エラー境界

src/config/routes.ts                      # 変更: ADMIN_ENGAGEMENT 追加
```

---

## Task 1: ルート定数を追加する

**Files:**
- Modify: `src/config/routes.ts:87`

- [ ] **Step 1: `ADMIN_ENGAGEMENT` を TENANT オブジェクトに追加する**

[src/config/routes.ts](src/config/routes.ts) の `ADMIN_TURNOVER_RISK` 行の直後に追記:

```typescript
    /** 離職予兆スコアリング & アラート（P2-A） */
    ADMIN_TURNOVER_RISK: '/adm/turnover-risk',
    /** 統合エンゲージメントダッシュボード（P2-B） */
    ADMIN_ENGAGEMENT: '/adm/engagement',
```

- [ ] **Step 2: 型チェックして構文エラーがないことを確認する**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

- [ ] **Step 3: コミットする**

```bash
git add src/config/routes.ts
git commit -m "feat: add ADMIN_ENGAGEMENT route constant for P2-B"
```

---

## Task 2: 型定義を作成する

**Files:**
- Create: `src/features/engagement/types.ts`

- [ ] **Step 1: `src/features/engagement/types.ts` を作成する**

```typescript
/** パルスサーベイ 月次集計 */
export interface PulseTrendPoint {
  period: string          // 'YYYY-MM'
  label: string           // 'YYYY年M月度'
  score: number           // 0.0〜5.0（DBスコア ÷2）
  responseRate: number    // 0〜100（%）
}

/** ストレスチェック 実施期間別集計 */
export interface StressTrendPoint {
  periodTitle: string     // stress_check_periods.title
  periodStart: string     // 'YYYY-MM-DD'
  highStressRate: number  // 0〜100（%）
  totalCount: number
  highStressCount: number
}

/** アンケート（Echo）実施期間別集計 */
export interface QuestionnaireTrendPoint {
  periodLabel: string     // questionnaire_periods.label
  periodStart: string     // 'YYYY-MM-DD'
  responseRate: number    // 0〜100（%）
  submittedCount: number
  totalCount: number
}

/** 部署別スコア（3ソース統合） */
export interface DepartmentEngagementRow {
  divisionId: string
  divisionName: string
  pulseScore: number | null         // 0.0〜5.0
  highStressRate: number | null     // 0〜100（%）
  questionnaireResponseRate: number | null  // 0〜100（%）
  compositeScore: number            // 合計 0〜100 の独自指標
  status: 'good' | 'caution' | 'alert'
}

/** ダッシュボード最上位データ */
export interface EngagementDashboardData {
  /** パルスサーベイ: 直近12ヶ月の月次推移 */
  pulseTrend: PulseTrendPoint[]
  /** 最新期のパルスサーベイスコア */
  latestPulseScore: number | null
  latestPulsePeriod: string | null
  /** ストレスチェック: 直近3期の高ストレス率推移 */
  stressTrend: StressTrendPoint[]
  /** 最新期の高ストレス率 */
  latestHighStressRate: number | null
  /** アンケート: 直近6期の回答率推移 */
  questionnaireTrend: QuestionnaireTrendPoint[]
  /** 最新期のアンケート回答率 */
  latestQuestionnaireResponseRate: number | null
  /** 部署別エンゲージメントヒートマップ */
  departments: DepartmentEngagementRow[]
  /** データ有無フラグ */
  hasPulseData: boolean
  hasStressData: boolean
  hasQuestionnaireData: boolean
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

---

## Task 3: queries.ts を作成する

**Files:**
- Create: `src/features/engagement/queries.ts`

このファイルは **既存テーブルを読み取るだけ**。INSERT / UPDATE / DELETE は一切行わない。

- [ ] **Step 1: `src/features/engagement/queries.ts` を作成する**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  EngagementDashboardData,
  PulseTrendPoint,
  StressTrendPoint,
  QuestionnaireTrendPoint,
  DepartmentEngagementRow,
} from './types'

const toDisplayScore = (dbScore: number) => Math.round((dbScore / 2) * 10) / 10

function periodToLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return `${year}年${month}月度`
}

function deptStatus(composite: number): 'good' | 'caution' | 'alert' {
  if (composite >= 70) return 'good'
  if (composite >= 45) return 'caution'
  return 'alert'
}

const EMPTY: EngagementDashboardData = {
  pulseTrend: [],
  latestPulseScore: null,
  latestPulsePeriod: null,
  stressTrend: [],
  latestHighStressRate: null,
  questionnaireTrend: [],
  latestQuestionnaireResponseRate: null,
  departments: [],
  hasPulseData: false,
  hasStressData: false,
  hasQuestionnaireData: false,
}

export async function getEngagementDashboardData(): Promise<EngagementDashboardData> {
  const user = await getServerUser()
  if (!user?.tenant_id) return EMPTY

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // 1. 従業員リスト（user_id → division 逆引き用）
  const { data: empRaw } = await supabase
    .from('employees')
    .select('id, user_id, divisions(id, name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')

  type EmpRow = { id: string; user_id: string | null; divisions: { id: string; name: string } | null }
  const employees = (empRaw ?? []) as EmpRow[]
  const userIdToEmpId = new Map<string, string>(
    employees.filter(e => e.user_id).map(e => [e.user_id!, e.id])
  )
  const empIdToDivision = new Map<string, { id: string; name: string }>(
    employees.filter(e => e.divisions).map(e => [e.id, e.divisions!])
  )
  const divisionMap = new Map<string, string>()
  for (const emp of employees) {
    if (emp.divisions) divisionMap.set(emp.divisions.id, emp.divisions.name)
  }

  // ----------------------------------------------------------------
  // 2. パルスサーベイ集計（直近12ヶ月）
  // ----------------------------------------------------------------
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const twelveMonthsAgoYm = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const { data: pulseRaw } = await supabase
    .from('pulse_survey_responses')
    .select('user_id, score, survey_period')
    .eq('tenant_id', user.tenant_id)
    .gte('survey_period', twelveMonthsAgoYm)
    .not('score', 'is', null)

  type PulseRow = { user_id: string; score: number; survey_period: string }
  const pulseData = (pulseRaw ?? []) as PulseRow[]

  const pulseByPeriod = new Map<string, { scoreSum: number; scoreCount: number; respondedUsers: Set<string> }>()
  for (const r of pulseData) {
    const acc = pulseByPeriod.get(r.survey_period) ?? { scoreSum: 0, scoreCount: 0, respondedUsers: new Set() }
    acc.scoreSum += r.score
    acc.scoreCount++
    acc.respondedUsers.add(r.user_id)
    pulseByPeriod.set(r.survey_period, acc)
  }

  const totalEmployees = employees.length
  const pulseTrend: PulseTrendPoint[] = Array.from(pulseByPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, acc]) => ({
      period,
      label: periodToLabel(period),
      score: acc.scoreCount > 0 ? toDisplayScore(acc.scoreSum / acc.scoreCount) : 0,
      responseRate: totalEmployees > 0 ? Math.round((acc.respondedUsers.size / totalEmployees) * 100) : 0,
    }))

  const latestPulsePoint = pulseTrend.length > 0 ? pulseTrend[pulseTrend.length - 1] : null

  // ----------------------------------------------------------------
  // 3. ストレスチェック集計（直近3期）
  // ----------------------------------------------------------------
  const { data: stressPeriodRaw } = await supabase
    .from('stress_check_periods')
    .select('id, title, start_date, end_date')
    .eq('tenant_id', user.tenant_id)
    .order('start_date', { ascending: false })
    .limit(3)

  type StressPeriodRow = { id: string; title: string; start_date: string; end_date: string }
  const stressPeriods = (stressPeriodRaw ?? []) as StressPeriodRow[]

  let stressTrend: StressTrendPoint[] = []
  let latestHighStressRate: number | null = null

  if (stressPeriods.length > 0) {
    const periodIds = stressPeriods.map(p => p.id)
    const { data: stressResultRaw } = await supabase
      .from('stress_check_results')
      .select('period_id, is_high_stress, employee_id')
      .eq('tenant_id', user.tenant_id)
      .in('period_id', periodIds)

    type StressResultRow = { period_id: string; is_high_stress: boolean; employee_id: string }
    const stressResults = (stressResultRaw ?? []) as StressResultRow[]

    const resultByPeriod = new Map<string, { total: number; highCount: number }>()
    for (const r of stressResults) {
      const acc = resultByPeriod.get(r.period_id) ?? { total: 0, highCount: 0 }
      acc.total++
      if (r.is_high_stress) acc.highCount++
      resultByPeriod.set(r.period_id, acc)
    }

    stressTrend = stressPeriods
      .filter(p => resultByPeriod.has(p.id))
      .map(p => {
        const acc = resultByPeriod.get(p.id)!
        const rate = acc.total > 0 ? Math.round((acc.highCount / acc.total) * 100) : 0
        return {
          periodTitle: p.title,
          periodStart: p.start_date,
          highStressRate: rate,
          totalCount: acc.total,
          highStressCount: acc.highCount,
        }
      })
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))

    if (stressTrend.length > 0) {
      latestHighStressRate = stressTrend[stressTrend.length - 1].highStressRate
    }
  }

  // ----------------------------------------------------------------
  // 4. アンケート（Echo）回答率集計（直近6期）
  // ----------------------------------------------------------------
  const { data: questPeriodRaw } = await supabase
    .from('questionnaire_periods')
    .select('id, label, start_date, questionnaire_id')
    .eq('tenant_id', user.tenant_id)
    .order('start_date', { ascending: false })
    .limit(6)

  type QuestPeriodRow = { id: string; label: string | null; start_date: string | null; questionnaire_id: string }
  const questPeriods = (questPeriodRaw ?? []) as QuestPeriodRow[]

  let questionnaireTrend: QuestionnaireTrendPoint[] = []
  let latestQuestionnaireResponseRate: number | null = null

  if (questPeriods.length > 0) {
    const qPeriodIds = questPeriods.map(p => p.id)

    const { data: assignRaw } = await supabase
      .from('questionnaire_assignments')
      .select('id, period_id, employee_id')
      .eq('tenant_id', user.tenant_id)
      .in('period_id', qPeriodIds)

    type AssignRow = { id: string; period_id: string | null; employee_id: string }
    const assignments = (assignRaw ?? []) as AssignRow[]
    const assignmentIds = assignments.map(a => a.id)

    const { data: responseRaw } =
      assignmentIds.length > 0
        ? await supabase
            .from('questionnaire_responses')
            .select('assignment_id, submitted_at')
            .in('assignment_id', assignmentIds)
        : { data: [] }

    type RespRow = { assignment_id: string; submitted_at: string | null }
    const responses = (responseRaw ?? []) as RespRow[]
    const submittedSet = new Set(responses.filter(r => r.submitted_at !== null).map(r => r.assignment_id))

    const questByPeriod = new Map<string, { total: number; submitted: number }>()
    for (const a of assignments) {
      if (!a.period_id) continue
      const acc = questByPeriod.get(a.period_id) ?? { total: 0, submitted: 0 }
      acc.total++
      if (submittedSet.has(a.id)) acc.submitted++
      questByPeriod.set(a.period_id, acc)
    }

    questionnaireTrend = questPeriods
      .filter(p => questByPeriod.has(p.id))
      .map(p => {
        const acc = questByPeriod.get(p.id)!
        const rate = acc.total > 0 ? Math.round((acc.submitted / acc.total) * 100) : 0
        return {
          periodLabel: p.label ?? p.start_date ?? p.id,
          periodStart: p.start_date ?? '',
          responseRate: rate,
          submittedCount: acc.submitted,
          totalCount: acc.total,
        }
      })
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))

    if (questionnaireTrend.length > 0) {
      latestQuestionnaireResponseRate = questionnaireTrend[questionnaireTrend.length - 1].responseRate
    }
  }

  // ----------------------------------------------------------------
  // 5. 部署別ヒートマップ集計
  // ----------------------------------------------------------------
  // 5a. パルス（最新期）：部署別平均スコア
  const divPulseScore = new Map<string, { scoreSum: number; count: number }>()
  if (latestPulsePoint) {
    for (const r of pulseData.filter(p => p.survey_period === latestPulsePoint.period)) {
      const empId = userIdToEmpId.get(r.user_id)
      if (!empId) continue
      const div = empIdToDivision.get(empId)
      if (!div) continue
      const acc = divPulseScore.get(div.id) ?? { scoreSum: 0, count: 0 }
      acc.scoreSum += r.score
      acc.count++
      divPulseScore.set(div.id, acc)
    }
  }

  // 5b. ストレス（最新期）：部署別高ストレス率
  const divStressRate = new Map<string, { total: number; high: number }>()
  if (stressPeriods.length > 0) {
    const latestStressPeriodId = stressPeriods[0].id
    const { data: latestStressRaw } = await supabase
      .from('stress_check_results')
      .select('employee_id, is_high_stress')
      .eq('tenant_id', user.tenant_id)
      .eq('period_id', latestStressPeriodId)

    type LSRow = { employee_id: string; is_high_stress: boolean }
    for (const r of (latestStressRaw ?? []) as LSRow[]) {
      const div = empIdToDivision.get(r.employee_id)
      if (!div) continue
      const acc = divStressRate.get(div.id) ?? { total: 0, high: 0 }
      acc.total++
      if (r.is_high_stress) acc.high++
      divStressRate.set(div.id, acc)
    }
  }

  // 5c. アンケート（最新期）：部署別回答率
  const divQuestRate = new Map<string, { total: number; submitted: number }>()
  if (questPeriods.length > 0) {
    const latestQPeriodId = questPeriods[0].id
    const { data: latestAssignRaw } = await supabase
      .from('questionnaire_assignments')
      .select('id, employee_id')
      .eq('tenant_id', user.tenant_id)
      .eq('period_id', latestQPeriodId)

    type LARow = { id: string; employee_id: string }
    const latestAssignments = (latestAssignRaw ?? []) as LARow[]
    const latestAssignIds = latestAssignments.map(a => a.id)

    const { data: latestRespRaw } =
      latestAssignIds.length > 0
        ? await supabase
            .from('questionnaire_responses')
            .select('assignment_id, submitted_at')
            .in('assignment_id', latestAssignIds)
        : { data: [] }

    type LRRow = { assignment_id: string; submitted_at: string | null }
    const latestSubmittedSet = new Set(
      ((latestRespRaw ?? []) as LRRow[])
        .filter(r => r.submitted_at !== null)
        .map(r => r.assignment_id)
    )

    for (const a of latestAssignments) {
      const div = empIdToDivision.get(a.employee_id)
      if (!div) continue
      const acc = divQuestRate.get(div.id) ?? { total: 0, submitted: 0 }
      acc.total++
      if (latestSubmittedSet.has(a.id)) acc.submitted++
      divQuestRate.set(div.id, acc)
    }
  }

  // 5d. 合成スコア計算（0〜100）
  // パルス(0〜5 → 0〜40点) + ストレス（高ストレス率が低いほど高得点, 0〜30点）+ 回答率(0〜30点)
  const departments: DepartmentEngagementRow[] = []
  for (const [divId, divName] of divisionMap) {
    const pulseAcc = divPulseScore.get(divId)
    const stressAcc = divStressRate.get(divId)
    const questAcc = divQuestRate.get(divId)

    const pulseScore = pulseAcc && pulseAcc.count > 0
      ? toDisplayScore(pulseAcc.scoreSum / pulseAcc.count)
      : null
    const highStressRate = stressAcc && stressAcc.total > 0
      ? Math.round((stressAcc.high / stressAcc.total) * 100)
      : null
    const questionnaireResponseRate = questAcc && questAcc.total > 0
      ? Math.round((questAcc.submitted / questAcc.total) * 100)
      : null

    let compositeSum = 0
    let compositeWeight = 0
    if (pulseScore !== null) { compositeSum += (pulseScore / 5) * 40; compositeWeight += 40 }
    if (highStressRate !== null) { compositeSum += ((100 - highStressRate) / 100) * 30; compositeWeight += 30 }
    if (questionnaireResponseRate !== null) { compositeSum += (questionnaireResponseRate / 100) * 30; compositeWeight += 30 }

    const compositeScore = compositeWeight > 0
      ? Math.round((compositeSum / compositeWeight) * 100)
      : 0

    departments.push({
      divisionId: divId,
      divisionName: divName,
      pulseScore,
      highStressRate,
      questionnaireResponseRate,
      compositeScore,
      status: deptStatus(compositeScore),
    })
  }

  departments.sort((a, b) => a.compositeScore - b.compositeScore)

  return {
    pulseTrend,
    latestPulseScore: latestPulsePoint?.score ?? null,
    latestPulsePeriod: latestPulsePoint?.label ?? null,
    stressTrend,
    latestHighStressRate,
    questionnaireTrend,
    latestQuestionnaireResponseRate,
    departments,
    hasPulseData: pulseTrend.length > 0,
    hasStressData: stressTrend.length > 0,
    hasQuestionnaireData: questionnaireTrend.length > 0,
  }
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

- [ ] **Step 3: コミットする**

```bash
git add src/features/engagement/types.ts src/features/engagement/queries.ts
git commit -m "feat: add engagement types and queries (P2-B)"
```

---

## Task 4: MonthlyTrendChart コンポーネントを作成する

**Files:**
- Create: `src/features/engagement/components/MonthlyTrendChart.tsx`

- [ ] **Step 1: `MonthlyTrendChart.tsx` を作成する**

3ソースの推移を1つのチャートコンポーネントにまとめる。Recharts は既存プロジェクトで使用済み。

```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { PulseTrendPoint, StressTrendPoint, QuestionnaireTrendPoint } from '../types'

interface Props {
  pulseTrend: PulseTrendPoint[]
  stressTrend: StressTrendPoint[]
  questionnaireTrend: QuestionnaireTrendPoint[]
}

interface ChartRow {
  label: string
  pulse?: number
  highStress?: number
  questResponse?: number
}

export function MonthlyTrendChart({ pulseTrend, stressTrend, questionnaireTrend }: Props) {
  const labelSet = new Map<string, ChartRow>()

  for (const p of pulseTrend) {
    const row = labelSet.get(p.label) ?? { label: p.label }
    row.pulse = p.score
    labelSet.set(p.label, row)
  }
  for (const s of stressTrend) {
    const lbl = s.periodTitle
    const row = labelSet.get(lbl) ?? { label: lbl }
    row.highStress = s.highStressRate
    labelSet.set(lbl, row)
  }
  for (const q of questionnaireTrend) {
    const lbl = q.periodLabel
    const row = labelSet.get(lbl) ?? { label: lbl }
    row.questResponse = q.responseRate
    labelSet.set(lbl, row)
  }

  const chartData = Array.from(labelSet.values())

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        データなし
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="pulse" domain={[0, 5]} tick={{ fontSize: 11 }} label={{ value: 'スコア', angle: -90, position: 'insideLeft', fontSize: 10 }} />
        <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 10 }} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'パルスサーベイ') return [`${value.toFixed(1)}`, name]
            return [`${value}%`, name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="pulse"
          type="monotone"
          dataKey="pulse"
          name="パルスサーベイ"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="highStress"
          name="高ストレス率"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          yAxisId="rate"
          type="monotone"
          dataKey="questResponse"
          name="アンケート回答率"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

---

## Task 5: DepartmentHeatmap コンポーネントを作成する

**Files:**
- Create: `src/features/engagement/components/DepartmentHeatmap.tsx`

- [ ] **Step 1: `DepartmentHeatmap.tsx` を作成する**

```typescript
'use client'

import type { DepartmentEngagementRow } from '../types'

interface Props {
  departments: DepartmentEngagementRow[]
}

const STATUS_STYLE: Record<DepartmentEngagementRow['status'], { bg: string; text: string; badge: string; label: string }> = {
  good:    { bg: 'bg-green-50',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  label: '良好' },
  caution: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: '要注意' },
  alert:   { bg: 'bg-red-50',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',       label: 'アラート' },
}

function ScoreCell({ value, suffix, invert }: { value: number | null; suffix: string; invert?: boolean }) {
  if (value === null) return <span className="text-gray-300">—</span>
  const isWarning = invert ? value >= 20 : value < 50
  return (
    <span className={isWarning ? 'font-semibold text-red-600' : 'font-semibold text-gray-800'}>
      {suffix === 'pt' ? value.toFixed(1) : value}
      {suffix}
    </span>
  )
}

export function DepartmentHeatmap({ departments }: Props) {
  if (departments.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">
        部署データなし
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-200 text-left text-xs font-semibold text-gray-600">
            <th className="px-4 py-3">部署名</th>
            <th className="px-4 py-3 text-center">パルス<br /><span className="font-normal text-gray-400">（0〜5.0）</span></th>
            <th className="px-4 py-3 text-center">高ストレス率<br /><span className="font-normal text-gray-400">（低いほど良）</span></th>
            <th className="px-4 py-3 text-center">アンケート<br />回答率</th>
            <th className="px-4 py-3 text-center">総合スコア</th>
            <th className="px-4 py-3 text-center">状態</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept, i) => {
            const st = STATUS_STYLE[dept.status]
            return (
              <tr
                key={dept.divisionId}
                className={`border-t border-gray-100 transition-shadow hover:shadow-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-4 py-3 font-medium text-gray-800">{dept.divisionName}</td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.pulseScore} suffix="pt" />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.highStressRate} suffix="%" invert />
                </td>
                <td className="px-4 py-3 text-center">
                  <ScoreCell value={dept.questionnaireResponseRate} suffix="%" />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className={`inline-block rounded px-2 py-0.5 font-bold ${st.bg} ${st.text}`}>
                    {dept.compositeScore}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-medium ${st.badge}`}>
                    {st.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

---

## Task 6: EngagementScoreCards コンポーネントを作成する

**Files:**
- Create: `src/features/engagement/components/EngagementScoreCards.tsx`

- [ ] **Step 1: `EngagementScoreCards.tsx` を作成する**

3ソースの最新値をカードで表示する。

```typescript
interface Props {
  latestPulseScore: number | null
  latestPulsePeriod: string | null
  latestHighStressRate: number | null
  latestQuestionnaireResponseRate: number | null
}

interface ScoreCardProps {
  label: string
  value: string
  sub: string
  colorClass: string
  hasData: boolean
}

function ScoreCard({ label, value, sub, colorClass, hasData }: ScoreCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className={`text-3xl font-bold ${colorClass}`}>
        {hasData ? value : '—'}
      </span>
      <span className="mt-1 text-sm font-medium text-gray-700">{label}</span>
      <span className="mt-0.5 text-xs text-gray-400">{hasData ? sub : 'データなし'}</span>
    </div>
  )
}

export function EngagementScoreCards({
  latestPulseScore,
  latestPulsePeriod,
  latestHighStressRate,
  latestQuestionnaireResponseRate,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ScoreCard
        label="パルスサーベイ"
        value={latestPulseScore !== null ? latestPulseScore.toFixed(1) : '—'}
        sub={latestPulsePeriod ?? ''}
        colorClass="text-indigo-600"
        hasData={latestPulseScore !== null}
      />
      <ScoreCard
        label="高ストレス率"
        value={latestHighStressRate !== null ? `${latestHighStressRate}%` : '—'}
        sub="最新ストレスチェック期"
        colorClass={
          latestHighStressRate !== null && latestHighStressRate >= 20
            ? 'text-red-600'
            : 'text-emerald-600'
        }
        hasData={latestHighStressRate !== null}
      />
      <ScoreCard
        label="アンケート回答率"
        value={latestQuestionnaireResponseRate !== null ? `${latestQuestionnaireResponseRate}%` : '—'}
        sub="最新アンケート期"
        colorClass={
          latestQuestionnaireResponseRate !== null && latestQuestionnaireResponseRate < 50
            ? 'text-red-600'
            : 'text-emerald-600'
        }
        hasData={latestQuestionnaireResponseRate !== null}
      />
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

---

## Task 7: EngagementDashboard（メイン）コンポーネントを作成する

**Files:**
- Create: `src/features/engagement/components/EngagementDashboard.tsx`

- [ ] **Step 1: `EngagementDashboard.tsx` を作成する**

admin-card-and-table.md スタイルに完全準拠。パスバー → グレーヘッダー → カード本文の構成。

```typescript
'use client'

import { EngagementScoreCards } from './EngagementScoreCards'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { DepartmentHeatmap } from './DepartmentHeatmap'
import type { EngagementDashboardData } from '../types'

interface Props {
  data: EngagementDashboardData
}

export function EngagementDashboard({ data }: Props) {
  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/engagement — 統合エンゲージメントダッシュボード
        </div>

        {/* カードヘッダー */}
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            統合エンゲージメントダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            パルスサーベイ・ストレスチェック・Echoアンケートの3ソースを統合表示
          </p>
        </div>

        {/* カード本文 */}
        <div className="space-y-8 p-6">
          {/* 3ソース最新スコアカード */}
          <EngagementScoreCards
            latestPulseScore={data.latestPulseScore}
            latestPulsePeriod={data.latestPulsePeriod}
            latestHighStressRate={data.latestHighStressRate}
            latestQuestionnaireResponseRate={data.latestQuestionnaireResponseRate}
          />

          {/* 月次推移グラフ */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">推移グラフ</h2>
            {!data.hasPulseData && !data.hasStressData && !data.hasQuestionnaireData ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400">
                データなし — まずは各機能でデータを入力してください
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <MonthlyTrendChart
                  pulseTrend={data.pulseTrend}
                  stressTrend={data.stressTrend}
                  questionnaireTrend={data.questionnaireTrend}
                />
              </div>
            )}
          </section>

          {/* 部署別ヒートマップ */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              部署別エンゲージメント（最新期）
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <DepartmentHeatmap departments={data.departments} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを通す**

```bash
npm run type-check 2>&1 | tail -5
```

期待: エラー 0

- [ ] **Step 3: コミットする**

```bash
git add src/features/engagement/components/
git commit -m "feat: add EngagementDashboard, MonthlyTrendChart, DepartmentHeatmap, ScoreCards components (P2-B)"
```

---

## Task 8: ページルート・loading・error を作成する

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(engagement)/engagement/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(engagement)/engagement/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(engagement)/engagement/error.tsx`

- [ ] **Step 1: `page.tsx` を作成する**

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getEngagementDashboardData } from '@/features/engagement/queries'
import { EngagementDashboard } from '@/features/engagement/components/EngagementDashboard'

export const metadata = { title: '統合エンゲージメントダッシュボード' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function EngagementPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const data = await getEngagementDashboardData()

  return <EngagementDashboard data={data} />
}
```

- [ ] **Step 2: `loading.tsx` を作成する**

```typescript
export default function Loading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5">
          <div className="h-4 w-64 animate-pulse rounded bg-gray-300" />
        </div>
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="h-8 w-80 animate-pulse rounded bg-gray-400" />
        </div>
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl border border-gray-100 bg-gray-50" />
          <div className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `error.tsx` を作成する**

```typescript
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-5">
          <h2 className="text-lg font-bold text-red-700">エラーが発生しました</h2>
          <p className="mt-1 text-sm text-red-600">{error.message}</p>
        </div>
        <div className="p-6">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 型チェックとビルドを通す**

```bash
npm run type-check 2>&1 | tail -10
npm run build 2>&1 | tail -10
```

期待: エラー 0・`✓ Compiled successfully`

- [ ] **Step 5: コミットする**

```bash
git add src/app/(tenant)/(colored)/adm/(engagement)/
git commit -m "feat: add engagement page, loading, error for /adm/engagement (P2-B)"
```

---

## Self-Review

### Spec coverage

| 要件 | 対応タスク |
|---|---|
| 複数ソース統合スコア（パルス＋ストレスチェック＋Echo設問） | Task 2/3: types.ts, queries.ts の EngagementDashboardData |
| 部署別・属性別ヒートマップ | Task 5: DepartmentHeatmap |
| 月次スコア推移グラフ | Task 4: MonthlyTrendChart (Recharts LineChart) |
| ルート `/adm/engagement` | Task 8: page.tsx |
| loading.tsx / error.tsx 配置（CLAUDE.md 必須） | Task 8: loading, error |
| 既存データを消さない | 新テーブル作成なし、全て SELECT のみ |
| APP_ROUTES 定数 | Task 1: ADMIN_ENGAGEMENT 追加 |
| admin-card-and-table.md スタイル準拠 | Task 7: パスバー・グレーヘッダー・zebra |
| 改善アクション記録（仕様書記載） | **意図的にスコープ外**：DB新設が必要なため Phase 3 へ延期 |

### Placeholder scan
プレースホルダーなし。全タスクに完全なコードブロックを記載済み。

### Type consistency
- `EngagementDashboardData` を types.ts で定義 → queries.ts の返り値・EngagementDashboard の Props で一貫して使用
- `DepartmentEngagementRow.status` は `'good' | 'caution' | 'alert'` で全コンポーネント統一
- `PulseTrendPoint`, `StressTrendPoint`, `QuestionnaireTrendPoint` を MonthlyTrendChart の Props で正確に参照
