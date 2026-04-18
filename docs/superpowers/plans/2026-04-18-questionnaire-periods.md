# アンケート実施期間機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 同じアンケートを「実施期間」別に繰り返し実施でき、期間内の重複回答を防止し、過去期間との時系列比較ができる設計に拡張する

**Architecture:** `questionnaire_periods` テーブルを新設してアンケートと「実施インスタンス」を分離する。既存の `questionnaire_assignments` と `questionnaire_responses` に `period_id` を追加することで、期間単位の回答管理を実現する。時系列分析は period を軸に集計クエリで対応する。

**Tech Stack:** Next.js 16 App Router / Server Actions, Supabase PostgreSQL + RLS, TypeScript, Zod v4, Recharts（既存）

---

## 現状の構造（変更前）

```
questionnaires (アンケートマスタ: draft/active/closed)
  └── questionnaire_assignments (従業員アサイン: questionnaire_id + employee_id)
        └── questionnaire_responses (回答セッション: assignment_id)
              └── questionnaire_answers (個別回答)
```

現状の問題:
- アンケートを「有効化」すると全員が同一セッションで回答する
- 同じアンケートを期別に再実施する概念がない
- 時系列で回答変化を追う仕組みがない

## 変更後の構造

```
questionnaires (アンケートマスタ: draft のまま保持)
  └── questionnaire_periods (実施期間: period_type + 日付範囲 + status)
        └── questionnaire_assignments (期間別アサイン: period_id + employee_id)
              └── questionnaire_responses (期間別回答: period_id で一意制約)
                    └── questionnaire_answers (個別回答)
```

## ファイル構成（変更・新規）

### DB
- 新規: `supabase/migrations/YYYYMMDDHHMMSS_add_questionnaire_periods.sql`

### Types
- 修正: `src/features/questionnaire/types.ts` — Period 型を追加、既存型に `period_id` を追加

### Queries
- 修正: `src/features/questionnaire/queries.ts` — Period 一覧・詳細・時系列集計クエリを追加

### Actions
- 修正: `src/features/questionnaire/actions.ts` — Period CRUD・アサイン（period 対応）・回答提出（重複チェック）を修正

### Components (管理画面)
- 新規: `src/features/questionnaire/components/PeriodFormModal.tsx` — 実施期間作成モーダル
- 新規: `src/features/questionnaire/components/PeriodListPanel.tsx` — 期間一覧パネル
- 新規: `src/features/questionnaire/components/PeriodTrendChart.tsx` — 時系列グラフ（Recharts）
- 修正: `src/features/questionnaire/components/QuestionnaireListClient.tsx` — 期間管理へのナビゲーション追加
- 修正: `src/features/questionnaire/components/AssignmentModal.tsx` — period_id を必須引数に変更

### Page
- 新規: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/page.tsx` — 期間管理ページ
- 新規: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/loading.tsx`
- 新規: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/error.tsx`

### Routes
- 修正: `src/config/routes.ts` — `SURVEY_PERIODS` ルート定数追加

---

## Task 1: DB マイグレーション

**Files:**
- Create: `supabase/migrations/20260418000001_add_questionnaire_periods.sql`

- [ ] **Step 1: マイグレーション SQL を作成する**

```sql
-- questionnaire_periods テーブル
CREATE TABLE public.questionnaire_periods (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id       UUID        NOT NULL REFERENCES public.questionnaires(id) ON DELETE CASCADE,
  tenant_id              UUID        NOT NULL,
  period_type            TEXT        NOT NULL DEFAULT 'none'
                         CHECK (period_type IN ('weekly', 'monthly', 'date_range', 'none')),
  label                  TEXT,           -- 表示名: "2024年4月" など
  start_date             DATE,           -- 開始日（none の場合は NULL 可）
  end_date               DATE,           -- 終了日（none の場合は NULL 可）
  status                 TEXT        NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'closed')),
  created_by_employee_id UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS 有効化（必須）
ALTER TABLE public.questionnaire_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.questionnaire_periods
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );

-- questionnaire_assignments に period_id を追加
ALTER TABLE public.questionnaire_assignments
  ADD COLUMN period_id UUID REFERENCES public.questionnaire_periods(id) ON DELETE CASCADE;

-- 期間内で同一従業員の重複アサインを防ぐ（NULL period_id は除外）
CREATE UNIQUE INDEX uniq_assignment_period_employee
  ON public.questionnaire_assignments (period_id, employee_id)
  WHERE period_id IS NOT NULL;

-- questionnaire_responses に period_id を追加
ALTER TABLE public.questionnaire_responses
  ADD COLUMN period_id UUID REFERENCES public.questionnaire_periods(id);

-- 期間内で同一従業員が重複回答しないよう一意制約
CREATE UNIQUE INDEX uniq_response_period_employee
  ON public.questionnaire_responses (period_id, employee_id)
  WHERE period_id IS NOT NULL;

-- インデックス（時系列クエリ用）
CREATE INDEX idx_periods_questionnaire_id ON public.questionnaire_periods (questionnaire_id);
CREATE INDEX idx_periods_start_date        ON public.questionnaire_periods (start_date);
```

- [ ] **Step 2: マイグレーションを適用する**

```bash
supabase migration up
```

Expected: `Migration applied successfully`

- [ ] **Step 3: Studio で確認する**

Supabase Studio (http://127.0.0.1:55423) → Table Editor → `questionnaire_periods` テーブルが存在することを確認

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260418000001_add_questionnaire_periods.sql
git commit -m "feat: add questionnaire_periods table for recurring survey periods"
```

---

## Task 2: TypeScript 型定義の追加

**Files:**
- Modify: `src/features/questionnaire/types.ts`

- [ ] **Step 1: 型定義を追加する**

`src/features/questionnaire/types.ts` の末尾に以下を追記する:

```typescript
// 実施期間
export type PeriodType = 'weekly' | 'monthly' | 'date_range' | 'none';
export type PeriodStatus = 'active' | 'closed';

export interface QuestionnairePeriod {
  id: string;
  questionnaire_id: string;
  tenant_id: string;
  period_type: PeriodType;
  label: string | null;
  start_date: string | null;  // ISO date string
  end_date: string | null;
  status: PeriodStatus;
  created_by_employee_id: string | null;
  created_at: string;
}

// 期間一覧表示用（回答統計を含む）
export interface PeriodListItem extends QuestionnairePeriod {
  assignment_count: number;
  submitted_count: number;
}

// 期間別時系列集計（設問ごと）
export interface PeriodTrendPoint {
  period_id: string;
  label: string;
  start_date: string | null;
  avg_score: number | null;       // rating_table 設問の平均スコア
  response_count: number;
}

// 実施期間作成入力
export interface CreatePeriodInput {
  questionnaire_id: string;
  period_type: PeriodType;
  label: string;
  start_date?: string | null;
  end_date?: string | null;
}
```

また、`QuestionnaireAssignment` インターフェースに `period_id` を追加する:

```typescript
export interface QuestionnaireAssignment {
  id: string;
  questionnaire_id: string;
  tenant_id: string;
  employee_id: string;
  period_id: string | null;       // ← 追加
  deadline_date: string | null;
  assigned_at: string;
}
```

`AssignedQuestionnaire` インターフェースに `period_id` と `period_label` を追加する:

```typescript
export interface AssignedQuestionnaire {
  assignment_id: string;
  questionnaire_id: string;
  title: string;
  description: string | null;
  deadline_date: string | null;
  assigned_at: string;
  submitted_at: string | null;
  creator_type: CreatorType;
  questionnaire_status: QuestionnaireStatus;
  period_id: string | null;       // ← 追加
  period_label: string | null;    // ← 追加
}
```

- [ ] **Step 2: TypeScript エラーがないか確認する**

```bash
npm run type-check 2>&1 | head -50
```

Expected: エラーなし（または期間追加前の既存エラーのみ）

- [ ] **Step 3: コミット**

```bash
git add src/features/questionnaire/types.ts
git commit -m "feat: add QuestionnairePeriod types"
```

---

## Task 3: Period クエリの追加

**Files:**
- Modify: `src/features/questionnaire/queries.ts`

- [ ] **Step 1: 期間一覧クエリを追加する**

`src/features/questionnaire/queries.ts` の末尾に以下を追加する:

```typescript
import type {
  // 既存の import に追加
  PeriodListItem,
  PeriodTrendPoint,
} from './types'

/**
 * アンケートの実施期間一覧（管理画面用）
 * 作成日の降順で返す
 */
export async function getQuestionnairePeriods(
  questionnaireId: string
): Promise<PeriodListItem[]> {
  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('questionnaire_periods')
    .select(`
      id, questionnaire_id, tenant_id, period_type, label,
      start_date, end_date, status,
      created_by_employee_id, created_at,
      assignments:questionnaire_assignments(count),
      submitted:questionnaire_responses(count)
    `)
    .eq('questionnaire_id', questionnaireId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    questionnaire_id: row.questionnaire_id,
    tenant_id: row.tenant_id,
    period_type: row.period_type,
    label: row.label,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_by_employee_id: row.created_by_employee_id,
    created_at: row.created_at,
    assignment_count: row.assignments?.[0]?.count ?? 0,
    submitted_count: row.submitted?.[0]?.count ?? 0,
  }))
}

/**
 * 時系列集計（設問単位の平均スコア推移）
 * rating_table 型設問を対象に、期間ごとの平均スコアを返す
 */
export async function getPeriodTrend(
  questionnaireId: string,
  questionId: string
): Promise<PeriodTrendPoint[]> {
  const supabase = await createClient()
  const db = supabase as any

  // 期間一覧（start_date 昇順）
  const { data: periods, error: pErr } = await db
    .from('questionnaire_periods')
    .select('id, label, start_date')
    .eq('questionnaire_id', questionnaireId)
    .order('start_date', { ascending: true, nullsFirst: false })

  if (pErr) throw pErr

  const result: PeriodTrendPoint[] = []

  for (const period of periods ?? []) {
    // 当該期間の当該設問の回答を取得
    const { data: answers, error: aErr } = await db
      .from('questionnaire_answers')
      .select('score, response:questionnaire_responses!inner(period_id)')
      .eq('questionnaire_responses.period_id', period.id)
      .eq('question_id', questionId)
      .not('score', 'is', null)

    if (aErr) throw aErr

    const scores = (answers ?? []).map((a: any) => a.score as number)
    const avg_score = scores.length > 0
      ? scores.reduce((s: number, v: number) => s + v, 0) / scores.length
      : null

    // 回答者数
    const { count: response_count } = await db
      .from('questionnaire_responses')
      .select('id', { count: 'exact', head: true })
      .eq('period_id', period.id)
      .not('submitted_at', 'is', null)

    result.push({
      period_id: period.id,
      label: period.label ?? period.start_date ?? period.id,
      start_date: period.start_date,
      avg_score,
      response_count: response_count ?? 0,
    })
  }

  return result
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | head -30
```

- [ ] **Step 3: コミット**

```bash
git add src/features/questionnaire/queries.ts
git commit -m "feat: add period list and trend queries"
```

---

## Task 4: Period アクションの追加・既存アクションの修正

**Files:**
- Modify: `src/features/questionnaire/actions.ts`

- [ ] **Step 1: 期間作成アクションを追加する**

`src/features/questionnaire/actions.ts` の末尾（`updateQuestion` より前）に以下を追加する:

```typescript
import type { CreatePeriodInput } from './types'

/**
 * 実施期間を作成（アンケートのリリース相当）
 * questionnaire は draft のまま維持し、period で実施管理する
 */
export async function createQuestionnairePeriod(
  input: CreatePeriodInput
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  const db = supabase as any

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!employee) return { success: false, error: '従業員情報が見つかりません。' }

  const { data, error } = await db
    .from('questionnaire_periods')
    .insert({
      questionnaire_id: input.questionnaire_id,
      tenant_id: user.tenant_id,
      period_type: input.period_type,
      label: input.label,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      status: 'active',
      created_by_employee_id: employee.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? '実施期間の作成に失敗しました。' }
  }

  revalidatePath('/adm/Survey')
  return { success: true, id: data.id }
}

/**
 * 実施期間を終了（status: closed に変更）
 */
export async function closeQuestionnairePeriod(periodId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('questionnaire_periods')
    .update({ status: 'closed' })
    .eq('id', periodId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}
```

- [ ] **Step 2: `assignEmployees` アクションを period 対応に修正する**

既存の `assignEmployees` 関数のシグネチャと rows 生成部分を以下のように変更する（ファイルの該当箇所を編集）:

変更前:
```typescript
export async function assignEmployees(
  questionnaireId: string,
  employeeIds: string[],
  deadlineDate?: string | null
): Promise<ActionResult> {
```

変更後:
```typescript
export async function assignEmployees(
  questionnaireId: string,
  employeeIds: string[],
  deadlineDate?: string | null,
  periodId?: string | null
): Promise<ActionResult> {
```

rows 生成部分を変更する:

変更前:
```typescript
  const rows = employeeIds.map(eid => ({
    questionnaire_id: questionnaireId,
    tenant_id: user.tenant_id,
    employee_id: eid,
    deadline_date: deadlineDate ?? null,
  }))
```

変更後:
```typescript
  const rows = employeeIds.map(eid => ({
    questionnaire_id: questionnaireId,
    tenant_id: user.tenant_id,
    employee_id: eid,
    period_id: periodId ?? null,
    deadline_date: deadlineDate ?? null,
  }))
```

upsert の onConflict を変更する:

変更前:
```typescript
    .upsert(rows, { onConflict: 'questionnaire_id,employee_id', ignoreDuplicates: true })
```

変更後:
```typescript
    .upsert(rows, { onConflict: 'period_id,employee_id', ignoreDuplicates: true })
```

- [ ] **Step 3: `submitAnswers` アクションに期間重複チェックを追加する**

既存の `submitAnswers` 関数の「アサイン確認」直後に period_id 取得と重複チェックを追加する。
ファイルの `if (!assignment || assignment.employee_id !== user.employee_id)` の直後に挿入:

```typescript
  // assignment から period_id を取得
  const { data: assignmentWithPeriod } = await db
    .from('questionnaire_assignments')
    .select('questionnaire_id, employee_id, period_id')
    .eq('id', assignmentId)
    .single()

  const periodId = assignmentWithPeriod?.period_id ?? null

  // 期間内の重複回答チェック
  if (periodId) {
    const { data: existingPeriodResponse } = await db
      .from('questionnaire_responses')
      .select('id, submitted_at')
      .eq('period_id', periodId)
      .eq('employee_id', user.employee_id)
      .not('submitted_at', 'is', null)
      .maybeSingle()

    if (existingPeriodResponse) {
      return { success: false, error: 'この実施期間ではすでに回答済みです。' }
    }
  }
```

また、response 作成時に period_id を含めるよう修正する:

変更前:
```typescript
      const { data: newResponse, error: rErr } = await db
        .from('questionnaire_responses')
        .insert({
          questionnaire_id: assignment.questionnaire_id,
          assignment_id: assignmentId,
          employee_id: user.employee_id,
          tenant_id: user.tenant_id,
        })
```

変更後:
```typescript
      const { data: newResponse, error: rErr } = await db
        .from('questionnaire_responses')
        .insert({
          questionnaire_id: assignment.questionnaire_id,
          assignment_id: assignmentId,
          employee_id: user.employee_id,
          tenant_id: user.tenant_id,
          period_id: periodId,
        })
```

- [ ] **Step 4: 型チェック**

```bash
npm run type-check 2>&1 | head -50
```

- [ ] **Step 5: コミット**

```bash
git add src/features/questionnaire/actions.ts
git commit -m "feat: add period CRUD actions and period-aware answer submission"
```

---

## Task 5: routes.ts にルート定数を追加

**Files:**
- Modify: `src/config/routes.ts`

- [ ] **Step 1: routes.ts を読んで既存の SURVEY ルートを確認する**

```bash
grep -n "Survey\|SURVEY" src/config/routes.ts
```

- [ ] **Step 2: SURVEY_PERIODS ルートを追加する**

既存の Survey ルート定数の近くに以下を追加する（実際のキー名は既存の命名規則に合わせる）:

```typescript
SURVEY_PERIODS: (id: string) => `/adm/Survey/${id}/periods`,
```

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat: add SURVEY_PERIODS route constant"
```

---

## Task 6: 期間管理ページの作成

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/error.tsx`

- [ ] **Step 1: page.tsx を作成する**

```typescript
// src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/page.tsx
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getQuestionnaireDetail } from '@/features/questionnaire/queries'
import { getQuestionnairePeriods } from '@/features/questionnaire/queries'
import PeriodListPanel from '@/features/questionnaire/components/PeriodListPanel'

export const dynamic = 'force-dynamic'

export default async function SurveyPeriodsPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [questionnaire, periods] = await Promise.all([
    getQuestionnaireDetail(params.id),
    getQuestionnairePeriods(params.id),
  ])

  if (!questionnaire) redirect(APP_ROUTES.ADM.SURVEY ?? '/adm/Survey')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PeriodListPanel
        questionnaire={questionnaire}
        initialPeriods={periods}
        tenantId={user.tenant_id}
      />
    </div>
  )
}
```

- [ ] **Step 2: loading.tsx を作成する**

```typescript
// src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/loading.tsx
export default function Loading() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: error.tsx を作成する**

```typescript
// src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/periods/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded">
        再試行
      </button>
    </div>
  )
}
```

- [ ] **Step 4: コミット**

```bash
git add src/app/(tenant)/(colored)/adm/(questionnaire)/Survey/[id]/
git commit -m "feat: add survey periods page scaffold"
```

---

## Task 7: PeriodFormModal コンポーネントの作成

**Files:**
- Create: `src/features/questionnaire/components/PeriodFormModal.tsx`

- [ ] **Step 1: PeriodFormModal を作成する**

```typescript
// src/features/questionnaire/components/PeriodFormModal.tsx
'use client'

import { useState } from 'react'
import { createQuestionnairePeriod } from '@/features/questionnaire/actions'
import type { PeriodType, CreatePeriodInput } from '@/features/questionnaire/types'

interface Props {
  questionnaireId: string
  onSuccess: () => void
  onClose: () => void
}

const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  weekly:     '週1回',
  monthly:    '月1回',
  date_range: '日付指定',
  none:       '指定なし',
}

export default function PeriodFormModal({ questionnaireId, onSuccess, onClose }: Props) {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [label, setLabel]           = useState('')
  const [startDate, setStartDate]   = useState('')
  const [endDate, setEndDate]       = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      setError('期間名を入力してください。')
      return
    }

    const input: CreatePeriodInput = {
      questionnaire_id: questionnaireId,
      period_type: periodType,
      label: label.trim(),
      start_date: startDate || null,
      end_date: endDate || null,
    }

    setIsSubmitting(true)
    setError(null)
    const result = await createQuestionnairePeriod(input)
    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error ?? '作成に失敗しました。')
      return
    }
    onSuccess()
  }

  const needsDates = periodType === 'date_range' || periodType === 'weekly' || periodType === 'monthly'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">実施期間を作成</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">実施タイプ</label>
            <select
              value={periodType}
              onChange={e => setPeriodType(e.target.value as PeriodType)}
              className="w-full border rounded-lg px-3 py-2"
            >
              {(Object.keys(PERIOD_TYPE_LABELS) as PeriodType[]).map(type => (
                <option key={type} value={type}>{PERIOD_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              期間名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例: 2024年4月、2024年第1週"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {needsDates && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | grep "PeriodFormModal\|questionnaire/types" | head -20
```

- [ ] **Step 3: コミット**

```bash
git add src/features/questionnaire/components/PeriodFormModal.tsx
git commit -m "feat: add PeriodFormModal component"
```

---

## Task 8: PeriodListPanel コンポーネントの作成

**Files:**
- Create: `src/features/questionnaire/components/PeriodListPanel.tsx`

- [ ] **Step 1: PeriodListPanel を作成する**

```typescript
// src/features/questionnaire/components/PeriodListPanel.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { closeQuestionnairePeriod } from '@/features/questionnaire/actions'
import type { QuestionnaireDetail, PeriodListItem } from '@/features/questionnaire/types'
import PeriodFormModal from './PeriodFormModal'
import AssignmentModal from './AssignmentModal'

interface Props {
  questionnaire: QuestionnaireDetail
  initialPeriods: PeriodListItem[]
  tenantId: string
}

export default function PeriodListPanel({ questionnaire, initialPeriods, tenantId }: Props) {
  const router = useRouter()
  const [periods, setPeriods]               = useState<PeriodListItem[]>(initialPeriods)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assigningPeriodId, setAssigningPeriodId] = useState<string | null>(null)

  function handlePeriodCreated() {
    setShowCreateModal(false)
    router.refresh()
  }

  async function handleClose(periodId: string) {
    if (!confirm('この実施期間を終了しますか？')) return
    await closeQuestionnairePeriod(periodId)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
          <p className="text-gray-500 text-sm mt-1">実施期間管理</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          ＋ 実施期間を作成
        </button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          実施期間がありません。「実施期間を作成」から開始してください。
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map(period => (
            <div
              key={period.id}
              className="border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{period.label ?? '期間名未設定'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    period.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {period.status === 'active' ? '実施中' : '終了'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {period.start_date && period.end_date
                    ? `${period.start_date} 〜 ${period.end_date}`
                    : period.start_date ?? '期間指定なし'}
                  　回答: {period.submitted_count} / {period.assignment_count}件
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssigningPeriodId(period.id)}
                  className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                >
                  対象者設定
                </button>
                {period.status === 'active' && (
                  <button
                    onClick={() => handleClose(period.id)}
                    className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    終了
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <PeriodFormModal
          questionnaireId={questionnaire.id}
          onSuccess={handlePeriodCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {assigningPeriodId && (
        <AssignmentModal
          questionnaireId={questionnaire.id}
          periodId={assigningPeriodId}
          tenantId={tenantId}
          onClose={() => setAssigningPeriodId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: AssignmentModal に periodId prop を追加する**

`src/features/questionnaire/components/AssignmentModal.tsx` を読んで既存の props インターフェースを確認し、`periodId?: string | null` を追加する。また `assignEmployees` の呼び出しに `deadlineDate, periodId` を渡すよう修正する。

```bash
head -60 src/features/questionnaire/components/AssignmentModal.tsx
```

AssignmentModal の Props に追加:
```typescript
periodId?: string | null;
```

`assignEmployees` の呼び出し箇所を:
```typescript
await assignEmployees(questionnaireId, selectedIds, deadline, periodId)
```

に変更する。

- [ ] **Step 3: 型チェック**

```bash
npm run type-check 2>&1 | head -30
```

- [ ] **Step 4: コミット**

```bash
git add src/features/questionnaire/components/PeriodListPanel.tsx \
        src/features/questionnaire/components/AssignmentModal.tsx
git commit -m "feat: add PeriodListPanel and update AssignmentModal for period support"
```

---

## Task 9: PeriodTrendChart コンポーネントの作成（時系列分析）

**Files:**
- Create: `src/features/questionnaire/components/PeriodTrendChart.tsx`

- [ ] **Step 1: PeriodTrendChart を作成する**

```typescript
// src/features/questionnaire/components/PeriodTrendChart.tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import type { PeriodTrendPoint } from '@/features/questionnaire/types'

interface Props {
  data: PeriodTrendPoint[]
  questionText: string
}

export default function PeriodTrendChart({ data, questionText }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        集計データがありません
      </div>
    )
  }

  const chartData = data.map(point => ({
    name: point.label,
    平均スコア: point.avg_score !== null ? Math.round(point.avg_score * 10) / 10 : null,
    回答者数: point.response_count,
  }))

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 font-medium">{questionText}</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="score" domain={[0, 5]} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="平均スコア"
            stroke="#0055ff"
            strokeWidth={2}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="回答者数"
            stroke="#00c2b8"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | grep "PeriodTrendChart" | head -10
```

- [ ] **Step 3: コミット**

```bash
git add src/features/questionnaire/components/PeriodTrendChart.tsx
git commit -m "feat: add PeriodTrendChart time-series visualization"
```

---

## Task 10: QuestionnaireListClient に期間管理リンクを追加

**Files:**
- Modify: `src/features/questionnaire/components/QuestionnaireListClient.tsx`

- [ ] **Step 1: 既存コンポーネントのアクションボタン部分を確認する**

```bash
grep -n "router\|push\|href\|onClick\|button" src/features/questionnaire/components/QuestionnaireListClient.tsx | head -30
```

- [ ] **Step 2: 「期間管理」ボタンを追加する**

各アンケート行のアクションボタン群に以下を追加する（APP_ROUTES の定数を使う）:

```typescript
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

// 各アンケート行のアクションボタン
<button
  onClick={() => router.push(APP_ROUTES.SURVEY_PERIODS(questionnaire.id))}
  className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
>
  実施期間
</button>
```

- [ ] **Step 3: 型チェック**

```bash
npm run type-check 2>&1 | head -30
```

- [ ] **Step 4: コミット**

```bash
git add src/features/questionnaire/components/QuestionnaireListClient.tsx
git commit -m "feat: add period management link in questionnaire list"
```

---

## Task 11: 動作確認

- [ ] **Step 1: ローカルサーバーを起動する**

```bash
npm run dev
```

- [ ] **Step 2: 管理画面で確認する**

1. `http://localhost:3000/adm/Survey` にアクセス
2. 既存アンケートの「実施期間」ボタンをクリック → 期間管理ページが表示される
3. 「実施期間を作成」→ period_type・label・日付を入力して作成 → 一覧に表示される
4. 「対象者設定」→ 従業員を選択 → アサインが作成される（period_id が設定される）
5. 従業員側で回答 → 提出完了
6. 同一期間で再回答を試みる → 「すでに回答済みです」エラーが表示される
7. 別の期間を作成し同じ従業員を割り当て → 別期間として回答可能

- [ ] **Step 3: ビルドを確認する**

```bash
npm run build 2>&1 | tail -30
```

Expected: ビルドエラーなし

---

## 設計上の補足

### 期間タイプの運用フロー

| period_type | 運用方法 | start_date / end_date |
|-------------|---------|----------------------|
| `weekly`    | 毎週月曜に新 period を作成 | その週の月〜日曜 |
| `monthly`   | 毎月初に新 period を作成   | 月初〜月末       |
| `date_range`| 任意の期間を指定            | 任意             |
| `none`      | 単発実施（期間制限なし）    | NULL / NULL      |

### 一意制約の動作

- `period_id` が NULL でない場合: 同一 period での重複回答を DB レベルで防止
- `period_id` が NULL の場合: 旧来の `questionnaire_id` 単位のフロー（後方互換）

### 時系列分析の拡張方法

- `getPeriodTrend()` を設問ごとに呼び出して複数の `PeriodTrendChart` を並べて表示
- 部門別のフィルタは `questionnaire_assignments.employee_id` → `employees.division_id` で結合可能

---

*Plan generated: 2026-04-18*
