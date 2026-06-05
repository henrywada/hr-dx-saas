# P3-C 退職理由の構造的蓄積・傾向分析 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 退職面談記録を構造化フォームで蓄積し、退職理由の分類集計・時系列トレンド・属性別傾向分析をグラフで可視化する管理者向け機能を追加する。

**Architecture:** 新テーブル `exit_interviews` に退職理由（主因 enum + 副因 TEXT[]）・属性（在籍月数・年齢層・部署名）を保存。`src/features/exit-interview/` に queries/actions/types/components を集約し、管理者ページ `/adm/exit-interview` から参照する。既存テーブルへの変更は一切なし。分析集計はサーバー側クエリで完結させ、Recharts でグラフ描画する。

**Tech Stack:** Next.js 16 App Router, Server Components + Server Actions, Supabase PostgreSQL + RLS (`public.current_tenant_id()`), Tailwind CSS v4, TypeScript (strict: false), Recharts

---

## ファイル構成

### 新規作成
| ファイル | 役割 |
|---------|------|
| `supabase/migrations/20260605400000_add_exit_interviews_table.sql` | exit_interviews テーブル + RLS |
| `src/features/exit-interview/types.ts` | 型定義・ラベル・定数 |
| `src/features/exit-interview/queries.ts` | SELECT クエリ関数（一覧・集計） |
| `src/features/exit-interview/actions.ts` | Server Actions（作成・更新・削除） |
| `src/features/exit-interview/components/ExitInterviewForm.tsx` | 面談記録作成・編集モーダル |
| `src/features/exit-interview/components/ExitInterviewList.tsx` | 記録一覧テーブル |
| `src/features/exit-interview/components/ReasonDistributionChart.tsx` | 理由分類棒グラフ（Recharts） |
| `src/features/exit-interview/components/TrendChart.tsx` | 月次退職件数トレンド（Recharts） |
| `src/features/exit-interview/components/AttributeAnalysis.tsx` | 在籍年数・部署・年齢層別分析 |
| `src/features/exit-interview/components/ExitInterviewDashboard.tsx` | 管理者メインダッシュボード |
| `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/page.tsx` | 管理者ページ |
| `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/loading.tsx` | ローディング |
| `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/error.tsx` | エラー |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/config/routes.ts` | `TENANT` ブロックに `ADMIN_EXIT_INTERVIEW` 追加 |

---

## Task 1: DB マイグレーション

**Files:**
- Create: `supabase/migrations/20260605400000_add_exit_interviews_table.sql`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- =============================================================================
-- 退職理由の構造的蓄積 テーブル
-- =============================================================================
-- 既存テーブルは一切変更しない。新規追加のみ。
-- RLS: public.current_tenant_id() でテナント隔離

CREATE TABLE IF NOT EXISTS public.exit_interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- 退職者情報（退職後も参照できるよう非正規化で保持）
  employee_id     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name   TEXT NOT NULL,
  department_name TEXT,
  -- 退職情報
  exit_date       DATE NOT NULL,
  tenure_months   INT NOT NULL DEFAULT 0,
  age_group       TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (age_group IN ('under_25', '25_to_34', '35_to_44', '45_to_54', '55_plus', 'unknown')),
  -- 退職理由
  main_reason     TEXT NOT NULL
                  CHECK (main_reason IN (
                    'compensation', 'interpersonal', 'career',
                    'life_event', 'management', 'work_style',
                    'company_direction', 'other'
                  )),
  sub_reasons     TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  -- メタ
  recorded_by     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exit_interviews_tenant   ON public.exit_interviews(tenant_id, exit_date DESC);
CREATE INDEX idx_exit_interviews_employee ON public.exit_interviews(employee_id);
CREATE INDEX idx_exit_interviews_reason   ON public.exit_interviews(tenant_id, main_reason);

ALTER TABLE public.exit_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ei_select" ON public.exit_interviews
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_insert" ON public.exit_interviews
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_update" ON public.exit_interviews
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_delete" ON public.exit_interviews
  FOR DELETE USING (tenant_id = public.current_tenant_id());
```

- [ ] **Step 2: マイグレーションを適用する**

```bash
supabase migration up
```

期待出力: `Applying migration 20260605400000_add_exit_interviews_table.sql... done`

- [ ] **Step 3: コミットする**

```bash
git add supabase/migrations/20260605400000_add_exit_interviews_table.sql
git commit -m "feat: add exit_interviews table migration (P3-C)"
```

---

## Task 2: 型定義 + routes.ts

**Files:**
- Create: `src/features/exit-interview/types.ts`
- Modify: `src/config/routes.ts`

- [ ] **Step 1: 型ファイルを作成する**

```typescript
// 退職理由の構造的蓄積・傾向分析 専用型定義

export type MainReason =
  | 'compensation'
  | 'interpersonal'
  | 'career'
  | 'life_event'
  | 'management'
  | 'work_style'
  | 'company_direction'
  | 'other'

export type AgeGroup =
  | 'under_25'
  | '25_to_34'
  | '35_to_44'
  | '45_to_54'
  | '55_plus'
  | 'unknown'

export const MAIN_REASON_LABELS: Record<MainReason, string> = {
  compensation:       '待遇・給与',
  interpersonal:      '人間関係',
  career:             'キャリア・成長機会',
  life_event:         'ライフイベント',
  management:         '上司・マネジメント',
  work_style:         '働き方・環境',
  company_direction:  '会社の方向性',
  other:              'その他',
}

export const MAIN_REASON_COLORS: Record<MainReason, string> = {
  compensation:       '#3b82f6',
  interpersonal:      '#ef4444',
  career:             '#10b981',
  life_event:         '#f59e0b',
  management:         '#8b5cf6',
  work_style:         '#06b6d4',
  company_direction:  '#ec4899',
  other:              '#6b7280',
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  under_25:  '25歳未満',
  '25_to_34': '25〜34歳',
  '35_to_44': '35〜44歳',
  '45_to_54': '45〜54歳',
  '55_plus':  '55歳以上',
  unknown:   '不明',
}

export const SUB_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'salary_low',       label: '給与水準が低い' },
  { value: 'no_raise',         label: '昇給・昇格が見込めない' },
  { value: 'boss_conflict',    label: '上司との関係' },
  { value: 'colleague_issue',  label: '同僚・チームとの関係' },
  { value: 'no_growth',        label: 'スキルアップの機会がない' },
  { value: 'role_mismatch',    label: 'やりたい仕事ができない' },
  { value: 'marriage',         label: '結婚・パートナーの転勤' },
  { value: 'childcare',        label: '育児・介護' },
  { value: 'health',           label: '健康上の理由' },
  { value: 'long_hours',       label: '長時間労働・残業' },
  { value: 'remote_denied',    label: 'リモートワーク不可' },
  { value: 'vision_mismatch',  label: '会社の方向性と合わない' },
  { value: 'better_offer',     label: 'より良い条件の転職先' },
  { value: 'freelance',        label: '独立・起業' },
]

export const ALL_MAIN_REASONS: MainReason[] = [
  'compensation', 'interpersonal', 'career', 'life_event',
  'management', 'work_style', 'company_direction', 'other',
]

export const ALL_AGE_GROUPS: AgeGroup[] = [
  'under_25', '25_to_34', '35_to_44', '45_to_54', '55_plus', 'unknown',
]

// ---- DB 行型 ----

export interface ExitInterview {
  id: string
  tenant_id: string
  employee_id: string | null
  employee_name: string
  department_name: string | null
  exit_date: string
  tenure_months: number
  age_group: AgeGroup
  main_reason: MainReason
  sub_reasons: string[]
  notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

// ---- 集計型 ----

export interface ReasonCount {
  reason: MainReason
  count: number
}

export interface MonthlyCount {
  year_month: string
  count: number
}

export interface DepartmentCount {
  department_name: string
  count: number
  top_reason: MainReason
}

export interface TenureGroupCount {
  tenure_group: string
  count: number
}

export interface AgeGroupCount {
  age_group: AgeGroup
  count: number
}

export interface ExitInterviewAnalytics {
  total: number
  reason_distribution: ReasonCount[]
  monthly_trend: MonthlyCount[]
  department_breakdown: DepartmentCount[]
  tenure_breakdown: TenureGroupCount[]
  age_breakdown: AgeGroupCount[]
}

// ---- フォーム入力型 ----

export interface ExitInterviewInput {
  employee_id: string
  employee_name: string
  department_name: string
  exit_date: string
  age_group: AgeGroup
  main_reason: MainReason
  sub_reasons: string[]
  notes: string
}

export type ActionResult = { success: true } | { success: false; error: string }
```

- [ ] **Step 2: routes.ts に ADMIN_EXIT_INTERVIEW を追加する**

`src/config/routes.ts` の `TENANT` ブロック内、`ADMIN_SUCCESSION: '/adm/succession',` の後に追加:

```typescript
    /** 退職理由の構造的蓄積・傾向分析（P3-C） */
    ADMIN_EXIT_INTERVIEW: '/adm/exit-interview',
```

- [ ] **Step 3: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: `0 errors`（出力なしも OK）

- [ ] **Step 4: コミットする**

```bash
git add src/features/exit-interview/types.ts src/config/routes.ts
git commit -m "feat: add exit-interview types and route (P3-C)"
```

---

## Task 3: クエリ関数

**Files:**
- Create: `src/features/exit-interview/queries.ts`

- [ ] **Step 1: クエリファイルを作成する**

```typescript
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
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: `0 errors`

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/queries.ts
git commit -m "feat: add exit-interview query functions (P3-C)"
```

---

## Task 4: Server Actions

**Files:**
- Create: `src/features/exit-interview/actions.ts`

- [ ] **Step 1: アクションファイルを作成する**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type { ExitInterviewInput, ActionResult } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

async function authorizeHr() {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')
  return user
}

function calcTenureMonths(startDate: string, exitDate: string): number {
  const start = new Date(startDate)
  const exit = new Date(exitDate)
  return Math.max(
    0,
    (exit.getFullYear() - start.getFullYear()) * 12 +
      (exit.getMonth() - start.getMonth())
  )
}

/** 退職面談記録を新規作成する */
export async function createExitInterview(input: ExitInterviewInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { data: recorder } = await (supabase as any)
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    let tenureMonths = 0
    if (input.employee_id) {
      const { data: emp } = await (supabase as any)
        .from('employees')
        .select('start_date')
        .eq('id', input.employee_id)
        .maybeSingle()
      if (emp?.start_date) {
        tenureMonths = calcTenureMonths(emp.start_date, input.exit_date)
      }
    }

    const { error } = await (supabase as any).from('exit_interviews').insert({
      tenant_id: user.tenant_id,
      employee_id: input.employee_id || null,
      employee_name: input.employee_name,
      department_name: input.department_name || null,
      exit_date: input.exit_date,
      tenure_months: tenureMonths,
      age_group: input.age_group,
      main_reason: input.main_reason,
      sub_reasons: input.sub_reasons,
      notes: input.notes.trim() || null,
      recorded_by: recorder?.id ?? null,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/exit-interview')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 退職面談記録を更新する */
export async function updateExitInterview(
  id: string,
  input: ExitInterviewInput
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    let tenureMonths = 0
    if (input.employee_id) {
      const { data: emp } = await (supabase as any)
        .from('employees')
        .select('start_date')
        .eq('id', input.employee_id)
        .maybeSingle()
      if (emp?.start_date) {
        tenureMonths = calcTenureMonths(emp.start_date, input.exit_date)
      }
    }

    const { error } = await (supabase as any)
      .from('exit_interviews')
      .update({
        employee_id: input.employee_id || null,
        employee_name: input.employee_name,
        department_name: input.department_name || null,
        exit_date: input.exit_date,
        tenure_months: tenureMonths,
        age_group: input.age_group,
        main_reason: input.main_reason,
        sub_reasons: input.sub_reasons,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/exit-interview')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 退職面談記録を削除する */
export async function deleteExitInterview(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('exit_interviews')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/exit-interview')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: `0 errors`

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/actions.ts
git commit -m "feat: add exit-interview server actions (P3-C)"
```

---

## Task 5: ExitInterviewForm

**Files:**
- Create: `src/features/exit-interview/components/ExitInterviewForm.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { createExitInterview, updateExitInterview } from '@/features/exit-interview/actions'
import type { ExitInterview, ExitInterviewInput, MainReason, AgeGroup } from '@/features/exit-interview/types'
import {
  ALL_MAIN_REASONS,
  ALL_AGE_GROUPS,
  MAIN_REASON_LABELS,
  AGE_GROUP_LABELS,
  SUB_REASON_OPTIONS,
} from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  record?: ExitInterview
  employees: Employee[]
  onClose: () => void
}

const EMPTY: ExitInterviewInput = {
  employee_id: '',
  employee_name: '',
  department_name: '',
  exit_date: '',
  age_group: 'unknown',
  main_reason: 'other',
  sub_reasons: [],
  notes: '',
}

export function ExitInterviewForm({ record, employees, onClose }: Props) {
  const isEdit = !!record
  const [form, setForm] = useState<ExitInterviewInput>(
    isEdit
      ? {
          employee_id: record.employee_id ?? '',
          employee_name: record.employee_name,
          department_name: record.department_name ?? '',
          exit_date: record.exit_date,
          age_group: record.age_group,
          main_reason: record.main_reason,
          sub_reasons: record.sub_reasons,
          notes: record.notes ?? '',
        }
      : EMPTY
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const empMap = new Map(employees.map(e => [e.id, e]))

  function handleEmployeeChange(empId: string) {
    const emp = empMap.get(empId)
    setForm(prev => ({
      ...prev,
      employee_id: empId,
      employee_name: emp?.name ?? '',
      department_name: emp?.department_name ?? '',
    }))
  }

  function toggleSubReason(value: string) {
    setForm(prev => ({
      ...prev,
      sub_reasons: prev.sub_reasons.includes(value)
        ? prev.sub_reasons.filter(v => v !== value)
        : [...prev.sub_reasons, value],
    }))
  }

  function handleSubmit() {
    if (!form.employee_name.trim()) { setError('退職者名は必須です'); return }
    if (!form.exit_date) { setError('退職日は必須です'); return }
    setError('')
    startTransition(async () => {
      const result = isEdit
        ? await updateExitInterview(record.id, form)
        : await createExitInterview(form)
      if (result.success === false) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">
          {isEdit ? '退職面談記録を編集' : '退職面談記録を追加'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              退職者 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.employee_id}
              onChange={e => handleEmployeeChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">従業員を選択</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.department_name ? ` （${e.department_name}）` : ''}
                </option>
              ))}
            </select>
            {!form.employee_id && (
              <input
                type="text"
                value={form.employee_name}
                onChange={e => setForm(prev => ({ ...prev, employee_name: e.target.value }))}
                placeholder="一覧にない場合は名前を直接入力"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              退職日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.exit_date}
              onChange={e => setForm(prev => ({ ...prev, exit_date: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">年齢層</label>
            <select
              value={form.age_group}
              onChange={e => setForm(prev => ({ ...prev, age_group: e.target.value as AgeGroup }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ALL_AGE_GROUPS.map(g => (
                <option key={g} value={g}>{AGE_GROUP_LABELS[g]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              主な退職理由 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.main_reason}
              onChange={e => setForm(prev => ({ ...prev, main_reason: e.target.value as MainReason }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ALL_MAIN_REASONS.map(r => (
                <option key={r} value={r}>{MAIN_REASON_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">詳細理由（複数可）</label>
            <div className="grid grid-cols-2 gap-1">
              {SUB_REASON_OPTIONS.map(opt => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sub_reasons.includes(opt.value)}
                    onChange={() => toggleSubReason(opt.value)}
                    className="w-4 h-4 accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">面談メモ（任意）</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="面談で聞いた詳細や所感など"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '保存中…' : isEdit ? '更新する' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/ExitInterviewForm.tsx
git commit -m "feat: add ExitInterviewForm component (P3-C)"
```

---

## Task 6: ExitInterviewList

**Files:**
- Create: `src/features/exit-interview/components/ExitInterviewList.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { deleteExitInterview } from '@/features/exit-interview/actions'
import { ExitInterviewForm } from './ExitInterviewForm'
import type { ExitInterview } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS, MAIN_REASON_COLORS } from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  records: ExitInterview[]
  employees: Employee[]
}

export function ExitInterviewList({ records, employees }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExitInterview | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState('')

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」の退職面談記録を削除しますか？`)) return
    setDeleteError('')
    startTransition(async () => {
      const result = await deleteExitInterview(id)
      if (result.success === false) setDeleteError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">面談記録一覧</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          + 記録を追加
        </button>
      </div>

      {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}

      {records.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">記録がありません</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">退職日</th>
              <th className="py-2 pr-3 font-medium text-slate-600">退職者</th>
              <th className="py-2 pr-3 font-medium text-slate-600">部署</th>
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">在籍期間</th>
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">主な理由</th>
              <th className="py-2 font-medium text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const tenureYears = Math.floor(r.tenure_months / 12)
              const tenureRem = r.tenure_months % 12
              const tenureLabel = tenureYears > 0
                ? `${tenureYears}年${tenureRem > 0 ? `${tenureRem}ヶ月` : ''}`
                : `${r.tenure_months}ヶ月`
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.exit_date}</td>
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.employee_name}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.department_name ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{tenureLabel}</td>
                  <td className="py-2 pr-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: MAIN_REASON_COLORS[r.main_reason] }}
                    >
                      {MAIN_REASON_LABELS[r.main_reason]}
                    </span>
                  </td>
                  <td className="py-2 flex gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="text-xs text-slate-500 hover:text-primary"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.employee_name)}
                      disabled={isPending}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ExitInterviewForm employees={employees} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <ExitInterviewForm record={editing} employees={employees} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/ExitInterviewList.tsx
git commit -m "feat: add ExitInterviewList component (P3-C)"
```

---

## Task 7: ReasonDistributionChart

**Files:**
- Create: `src/features/exit-interview/components/ReasonDistributionChart.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ReasonCount } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS, MAIN_REASON_COLORS } from '@/features/exit-interview/types'

interface Props {
  data: ReasonCount[]
}

export function ReasonDistributionChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        データがありません
      </div>
    )
  }

  const chartData = data
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      name: MAIN_REASON_LABELS[d.reason],
      count: d.count,
      color: MAIN_REASON_COLORS[d.reason],
    }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => [`${value}件`, '件数']} />
          <Bar dataKey="count" radius={4}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/ReasonDistributionChart.tsx
git commit -m "feat: add ReasonDistributionChart component (P3-C)"
```

---

## Task 8: TrendChart

**Files:**
- Create: `src/features/exit-interview/components/TrendChart.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyCount } from '@/features/exit-interview/types'

interface Props {
  data: MonthlyCount[]
}

export function TrendChart({ data }: Props) {
  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        データがありません
      </div>
    )
  }

  const chartData = data.map((d, i) => ({
    month: d.year_month.slice(5),
    fullLabel: d.year_month,
    件数: d.count,
    index: i,
  }))

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={(v, i) => {
              const item = chartData[i]
              return item?.fullLabel?.slice(5) === '01'
                ? `${item.fullLabel.slice(0, 4)}/${v}`
                : v
            }}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            labelFormatter={(_label, payload) => {
              const item = payload?.[0]?.payload
              return item?.fullLabel ?? _label
            }}
            formatter={(value: number) => [`${value}件`, '退職件数']}
          />
          <Line
            type="monotone"
            dataKey="件数"
            stroke="#0055ff"
            strokeWidth={2}
            dot={{ r: 3, fill: '#0055ff' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/TrendChart.tsx
git commit -m "feat: add TrendChart component (P3-C)"
```

---

## Task 9: AttributeAnalysis

**Files:**
- Create: `src/features/exit-interview/components/AttributeAnalysis.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import type { ExitInterviewAnalytics } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS, MAIN_REASON_COLORS, AGE_GROUP_LABELS } from '@/features/exit-interview/types'

interface Props {
  analytics: ExitInterviewAnalytics
}

function SimpleBar({ count, max, color }: { count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{count}</span>
    </div>
  )
}

export function AttributeAnalysis({ analytics }: Props) {
  const { department_breakdown, tenure_breakdown, age_breakdown } = analytics
  const deptMax = Math.max(...department_breakdown.map(d => d.count), 1)
  const tenureMax = Math.max(...tenure_breakdown.map(t => t.count), 1)
  const ageMax = Math.max(...age_breakdown.map(a => a.count), 1)

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">部署別（上位10）</h4>
        {department_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {department_breakdown.map(d => (
            <div key={d.department_name}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-slate-700 truncate max-w-[120px]">
                  {d.department_name}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-white shrink-0"
                  style={{ backgroundColor: MAIN_REASON_COLORS[d.top_reason] }}
                >
                  {MAIN_REASON_LABELS[d.top_reason]}
                </span>
              </div>
              <SimpleBar count={d.count} max={deptMax} color="#0055ff" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">在籍年数別</h4>
        {tenure_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {tenure_breakdown.map(t => (
            <div key={t.tenure_group}>
              <p className="text-xs text-slate-700 mb-0.5">{t.tenure_group}</p>
              <SimpleBar count={t.count} max={tenureMax} color="#10b981" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700">年齢層別</h4>
        {age_breakdown.length === 0 && <p className="text-sm text-slate-400">データなし</p>}
        <div className="space-y-2">
          {age_breakdown.map(a => (
            <div key={a.age_group}>
              <p className="text-xs text-slate-700 mb-0.5">{AGE_GROUP_LABELS[a.age_group]}</p>
              <SimpleBar count={a.count} max={ageMax} color="#f59e0b" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/AttributeAnalysis.tsx
git commit -m "feat: add AttributeAnalysis component (P3-C)"
```

---

## Task 10: ExitInterviewDashboard

**Files:**
- Create: `src/features/exit-interview/components/ExitInterviewDashboard.tsx`

- [ ] **Step 1: コンポーネントを作成する**

```typescript
'use client'

import { useState } from 'react'
import { ExitInterviewList } from './ExitInterviewList'
import { ReasonDistributionChart } from './ReasonDistributionChart'
import { TrendChart } from './TrendChart'
import { AttributeAnalysis } from './AttributeAnalysis'
import type { ExitInterview, ExitInterviewAnalytics } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS } from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  records: ExitInterview[]
  analytics: ExitInterviewAnalytics
  employees: Employee[]
}

type DashboardTab = 'analytics' | 'records'

export function ExitInterviewDashboard({ records, analytics, employees }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('analytics')

  const topReason = [...analytics.reason_distribution].sort((a, b) => b.count - a.count)[0]
  const last12Count = analytics.monthly_trend.reduce((s, m) => s + m.count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">退職理由分析</h1>
        <p className="text-sm text-slate-500">退職面談記録の蓄積と傾向分析</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{analytics.total}</p>
          <p className="text-xs text-slate-500 mt-1">累計記録数</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-slate-700">{last12Count}</p>
          <p className="text-xs text-slate-500 mt-1">直近12ヶ月</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center col-span-2">
          {topReason ? (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {MAIN_REASON_LABELS[topReason.reason]}
              </p>
              <p className="text-xs text-slate-500 mt-1">最多退職理由（{topReason.count}件）</p>
            </>
          ) : (
            <p className="text-sm text-slate-400">データなし</p>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {([['analytics', '分析ダッシュボード'], ['records', '面談記録一覧']] as const).map(
            ([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">退職理由の分布</h3>
              <ReasonDistributionChart data={analytics.reason_distribution} />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">月次退職件数（直近12ヶ月）</h3>
              <TrendChart data={analytics.monthly_trend} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">属性別傾向分析</h3>
            <AttributeAnalysis analytics={analytics} />
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <ExitInterviewList records={records} employees={employees} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

- [ ] **Step 3: コミットする**

```bash
git add src/features/exit-interview/components/ExitInterviewDashboard.tsx
git commit -m "feat: add ExitInterviewDashboard component (P3-C)"
```

---

## Task 11: 管理者ページ

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(exit_interview)/exit-interview/error.tsx`

- [ ] **Step 1: page.tsx を作成する**

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { getExitInterviews, getExitInterviewAnalytics } from '@/features/exit-interview/queries'
import { ExitInterviewDashboard } from '@/features/exit-interview/components/ExitInterviewDashboard'

export const metadata = { title: '退職理由分析' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function ExitInterviewPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) redirect(APP_ROUTES.TENANT.ADMIN)

  const supabase = await createClient()

  const [records, analytics] = await Promise.all([
    getExitInterviews(supabase as any, user.tenant_id),
    getExitInterviewAnalytics(supabase as any, user.tenant_id),
  ])

  const { data: empRows } = await supabase
    .from('employees')
    .select('id, name, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  const employees = (empRows ?? []).map((e: any) => {
    const div = Array.isArray(e.divisions) ? e.divisions[0] : e.divisions
    return { id: e.id, name: e.name ?? '', department_name: div?.name ?? null }
  })

  return (
    <ExitInterviewDashboard
      records={records}
      analytics={analytics}
      employees={employees}
    />
  )
}
```

- [ ] **Step 2: loading.tsx を作成する**

```typescript
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-4 bg-slate-100 rounded w-56" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-80 bg-slate-100 rounded-xl" />
        <div className="h-80 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-48 bg-slate-100 rounded-xl" />
    </div>
  )
}
```

- [ ] **Step 3: error.tsx を作成する**

```typescript
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <p className="text-slate-600 text-sm">データの取得に失敗しました: {error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90"
      >
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 型チェックを走らせる**

```bash
npm run type-check 2>&1 | tail -5
```

期待出力: `0 errors`

- [ ] **Step 5: コミットする**

```bash
git add "src/app/(tenant)/(colored)/adm/(exit_interview)/"
git commit -m "feat: add admin exit-interview page (P3-C)"
```

---

## Task 12: 型再生成・最終確認

**Files:**
- Modify: `src/lib/supabase/types.ts`（自動生成）

- [ ] **Step 1: Supabase 型を再生成する**

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

先頭・末尾に CLI の警告行が混入していないか確認し、除去する:

```bash
head -3 src/lib/supabase/types.ts
tail -5 src/lib/supabase/types.ts
```

期待: 先頭が `export type Json =` で始まり、末尾が `} as const` で終わること。

混入行があれば削除:
```bash
sed -i '/^Connecting to db/d' src/lib/supabase/types.ts
sed -i '/^A new version of Supabase CLI/d' src/lib/supabase/types.ts
sed -i '/^We recommend/d' src/lib/supabase/types.ts
```

- [ ] **Step 2: 全体型チェック**

```bash
npm run type-check 2>&1 | grep -E "error TS|Found [0-9]+ error"
```

期待出力: 出力なし（エラー 0件）

- [ ] **Step 3: ビルド確認**

```bash
npm run build 2>&1 | tail -10
```

期待出力: `✓ Compiled successfully` を含む行

- [ ] **Step 4: コミットする**

```bash
git add src/lib/supabase/types.ts
git commit -m "chore: regenerate supabase types after exit_interviews table (P3-C)"
```

---

## 実装チェックリスト（自己レビュー）

- [ ] 既存テーブルへの変更・削除は一切なし（`exit_interviews` テーブルの新規追加のみ）
- [ ] `exit_interviews` に RLS ポリシー（SELECT/INSERT/UPDATE/DELETE）が設定されている
- [ ] `authorizeHr()` が全 actions で呼ばれている
- [ ] `employee_name` は非正規化で保存されており、従業員削除後も記録が残る
- [ ] `tenure_months` は `start_date` と `exit_date` の差として自動計算される
- [ ] Recharts コンポーネントは `'use client'` ディレクティブを持つ
- [ ] `require()` をコンポーネント内で使用していない（全て import に変換済み）
- [ ] `type-check` エラー 0件
- [ ] `npm run build` が成功する
