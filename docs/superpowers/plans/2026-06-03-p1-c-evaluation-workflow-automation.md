# P1-C 評価ワークフロー自動化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 既存の評価機能（evaluation_sheets / evaluation_periods）を拡張し、リマインダー自動送信・フェーズ進捗バー・未提出者一括催促・差し戻し通知を備えた評価ワークフロー管理画面を実装する。

**Architecture:** 既存の `evaluation_sheets`・`evaluation_periods`・`evaluation_flow_logs` テーブルに通知履歴テーブル（`evaluation_reminders`）を1本追加するのみ。新しいルート `/adm/evaluation/workflow` を `(evaluation)` ルートグループに追加し、Server Component → Client Component のデータフローを厳守する。リマインダー送信はメール通知なしの「通知ログ記録 + アプリ内バナー」として実装し、外部SMTP依存を排除してスコープを抑える。

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase PostgreSQL + RLS, Tailwind CSS v4, Zod v4, date-fns

---

## ⚠️ 絶対禁止事項（実装前に必読）

- `supabase db reset` を絶対に実行しない（ローカルデータ消滅）
- エンドユーザー向け `actions.ts` で `createAdminClient()` を絶対に使わない
- `supabase migration up` のみ使用、`db reset` は使わない
- 既存テーブル（evaluation_sheets / evaluation_periods / evaluation_flow_logs）へのデータ変更は行わない
- `app/api/` に新規 Route Handler を追加しない（Server Actions を使う）

---

## ファイル構成

### 新規作成

| ファイル | 役割 |
|---|---|
| `supabase/migrations/20260603100000_add_evaluation_reminders.sql` | `evaluation_reminders` テーブル作成 + RLS |
| `src/features/evaluation/workflow-queries.ts` | ワークフロー専用 SELECT 関数 |
| `src/features/evaluation/workflow-actions.ts` | リマインダー送信・差し戻し通知の Server Actions |
| `src/features/evaluation/workflow-types.ts` | ワークフロー専用の型定義 |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/page.tsx` | ワークフロー画面 Server Component |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/loading.tsx` | ローディング UI |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/error.tsx` | エラー UI |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/WorkflowDashboard.tsx` | メインコンテナ Client Component |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PhaseSummaryBar.tsx` | フェーズ別進捗バー Client Component |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PendingList.tsx` | 未提出者一覧 + 一括催促 Client Component |
| `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/ReminderHistory.tsx` | 催促履歴一覧 Client Component |

### 修正

| ファイル | 変更内容 |
|---|---|
| `src/config/routes.ts` | `EVALUATION.WORKFLOW` ルート定数を追加 |

---

## Task 1: DBマイグレーション — evaluation_reminders テーブル

**Files:**
- Create: `supabase/migrations/20260603100000_add_evaluation_reminders.sql`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 評価リマインダー履歴テーブル
-- リマインダーは「アプリ内通知ログ」として記録する（外部メール送信は行わない）
CREATE TABLE public.evaluation_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  period_id   UUID NOT NULL REFERENCES public.evaluation_periods(id) ON DELETE CASCADE,
  sheet_id    UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  sent_by     UUID NOT NULL REFERENCES public.employees(id),
  -- リマインダーの種別
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN (
      'deadline_approaching', -- 期限N日前
      'overdue',              -- 期限超過
      'bulk_nudge',           -- 人事による一括催促
      'rollback_notify'       -- 差し戻し通知
    )),
  -- 催促時のメッセージ（任意）
  message     TEXT,
  -- 催促対象のフロー状態（どのフェーズへの催促か）
  target_status TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_reminders
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_reminders_period_id ON public.evaluation_reminders(period_id);
CREATE INDEX idx_eval_reminders_sheet_id  ON public.evaluation_reminders(sheet_id);
```

- [ ] **Step 2: マイグレーションを適用する**

```bash
supabase migration up
```

期待出力: `Applying migration 20260603100000_add_evaluation_reminders.sql...`

エラーが出た場合: `supabase migration list` でステータスを確認し、`supabase migration repair --status reverted 20260603100000` で修復する。

- [ ] **Step 3: テーブルが作成されたか確認する**

```bash
supabase db execute --local --command "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evaluation_reminders';"
```

期待出力: `evaluation_reminders` が1行返ること。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260603100000_add_evaluation_reminders.sql
git commit -m "feat: add evaluation_reminders table for workflow automation"
```

---

## Task 2: ルート定数を追加

**Files:**
- Modify: `src/config/routes.ts:114-117`

- [ ] **Step 1: EVALUATION オブジェクトに WORKFLOW を追加する**

`src/config/routes.ts` の `EVALUATION` ブロック末尾の `MY_EVALUATION_SHEET` の後に追加する:

```typescript
// 変更前:
    /** 従業員：評価シート詳細入力 */
    MY_EVALUATION_SHEET: (sheetId: string) => `/my-evaluation/${sheetId}`,
  },

// 変更後:
    /** 従業員：評価シート詳細入力 */
    MY_EVALUATION_SHEET: (sheetId: string) => `/my-evaluation/${sheetId}`,
    /** ワークフロー進捗管理（テナント管理者） */
    WORKFLOW: '/adm/evaluation/workflow',
  },
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | head -30
```

期待出力: エラーなし（または評価関連以外の既存エラーのみ）

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts
git commit -m "feat: add EVALUATION.WORKFLOW route constant"
```

---

## Task 3: ワークフロー専用の型定義

**Files:**
- Create: `src/features/evaluation/workflow-types.ts`

- [ ] **Step 1: 型ファイルを作成する**

```typescript
import type { FlowStatus, EvaluationPeriod } from './types'

/** フェーズ別の集計サマリー */
export type PhaseCount = {
  status: FlowStatus
  count: number
  label: string
  color: string
}

/** 未提出者情報（催促対象） */
export type PendingEmployee = {
  sheet_id: string
  employee_id: string
  employee_name: string
  employee_code: string | null
  division_path: string | null
  flow_status: FlowStatus
  /** 現在のフェーズの期限日（evaluation_periods から算出） */
  phase_deadline: string | null
  /** 期限超過日数（負 = 超過、0以上 = 残日数） */
  days_remaining: number | null
  /** 最後に催促を送った日時 */
  last_reminder_at: string | null
}

/** リマインダー履歴 */
export type ReminderRecord = {
  id: string
  sheet_id: string
  employee_name: string
  reminder_type: 'deadline_approaching' | 'overdue' | 'bulk_nudge' | 'rollback_notify'
  message: string | null
  target_status: string | null
  sent_by_name: string
  sent_at: string
}

/** ワークフローダッシュボードの初期データ */
export type WorkflowDashboardData = {
  period: EvaluationPeriod
  phaseCounts: PhaseCount[]
  pendingEmployees: PendingEmployee[]
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | grep "workflow-types" | head -10
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/evaluation/workflow-types.ts
git commit -m "feat: add workflow-types for evaluation workflow dashboard"
```

---

## Task 4: ワークフロー専用 Query 関数

**Files:**
- Create: `src/features/evaluation/workflow-queries.ts`

- [ ] **Step 1: クエリファイルを作成する**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { EvaluationPeriod, FlowStatus } from './types'
import type { PhaseCount, PendingEmployee, ReminderRecord } from './workflow-types'

/** フロー状態ごとのカラー設定 */
const PHASE_COLORS: Record<string, string> = {
  draft:               '#9ca3af',
  goal_set:            '#60a5fa',
  self_eval:           '#a78bfa',
  self_submitted:      '#7c3aed',
  primary_eval:        '#fbbf24',
  primary_submitted:   '#d97706',
  secondary_eval:      '#fb923c',
  secondary_submitted: '#ea580c',
  confirming:          '#818cf8',
  confirmed:           '#34d399',
}

const FLOW_STATUS_LABELS: Record<string, string> = {
  draft:               '下書き',
  goal_set:            '目標設定完了',
  self_eval:           '自己評価中',
  self_submitted:      '自己評価済',
  primary_eval:        '一次評価中',
  primary_submitted:   '一次評価済',
  secondary_eval:      '二次評価中',
  secondary_submitted: '二次評価済',
  confirming:          '確定者確認中',
  confirmed:           '確定',
}

/** フロー状態からフェーズ期限日を取得する */
function getPhaseDeadline(status: FlowStatus, period: EvaluationPeriod): string | null {
  switch (status) {
    case 'draft':
    case 'goal_set':
      return period.goal_deadline
    case 'self_eval':
    case 'self_submitted':
      return period.self_eval_end
    case 'primary_eval':
    case 'primary_submitted':
      return period.primary_eval_end
    case 'secondary_eval':
    case 'secondary_submitted':
      return period.secondary_eval_end
    default:
      return null
  }
}

/** 指定期間のフェーズ別件数を集計する */
export async function getWorkflowPhaseCounts(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string
): Promise<PhaseCount[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select('flow_status')
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)

  if (error) {
    console.warn('[getWorkflowPhaseCounts] failed:', error.message)
    return []
  }

  const countMap: Record<string, number> = {}
  for (const row of (data ?? []) as { flow_status: string }[]) {
    countMap[row.flow_status] = (countMap[row.flow_status] ?? 0) + 1
  }

  const order: FlowStatus[] = [
    'draft', 'goal_set', 'self_eval', 'self_submitted',
    'primary_eval', 'primary_submitted', 'secondary_eval',
    'secondary_submitted', 'confirming', 'confirmed',
  ]

  return order
    .filter(s => (countMap[s] ?? 0) > 0)
    .map(s => ({
      status: s,
      count: countMap[s] ?? 0,
      label: FLOW_STATUS_LABELS[s] ?? s,
      color: PHASE_COLORS[s] ?? '#9ca3af',
    }))
}

/** 未提出者（confirmed 以外）の一覧を取得する */
export async function getPendingEmployees(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string,
  period: EvaluationPeriod
): Promise<PendingEmployee[]> {
  const { data: sheets, error } = await (supabase as any)
    .from('evaluation_sheets')
    .select(`
      id,
      employee_id,
      flow_status,
      employees!employee_id (
        name,
        employee_no,
        division:division_id (
          name,
          parent:parent_id ( name )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)
    .neq('flow_status', 'confirmed')
    .order('flow_status')

  if (error) {
    console.warn('[getPendingEmployees] failed:', error.message)
    return []
  }

  // 最後のリマインダー日時を sheet_id ごとに取得
  const sheetIds = (sheets ?? []).map((s: any) => s.id)
  const reminderMap: Record<string, string> = {}

  if (sheetIds.length > 0) {
    const { data: reminders } = await (supabase as any)
      .from('evaluation_reminders')
      .select('sheet_id, sent_at')
      .eq('tenant_id', tenantId)
      .in('sheet_id', sheetIds)
      .order('sent_at', { ascending: false })

    for (const r of (reminders ?? []) as { sheet_id: string; sent_at: string }[]) {
      if (!reminderMap[r.sheet_id]) {
        reminderMap[r.sheet_id] = r.sent_at
      }
    }
  }

  const today = new Date()

  return (sheets ?? []).map((s: any) => {
    const emp = s.employees
    const divName = emp?.division?.name ?? null
    const parentName = emp?.division?.parent?.name ?? null
    const division_path =
      parentName && divName ? `${parentName} / ${divName}` : (divName ?? null)

    const phaseDeadline = getPhaseDeadline(s.flow_status as FlowStatus, period)
    const days_remaining = phaseDeadline
      ? differenceInCalendarDays(parseISO(phaseDeadline), today)
      : null

    return {
      sheet_id: s.id,
      employee_id: s.employee_id,
      employee_name: emp?.name ?? s.employee_id,
      employee_code: emp?.employee_no ?? null,
      division_path,
      flow_status: s.flow_status as FlowStatus,
      phase_deadline: phaseDeadline,
      days_remaining,
      last_reminder_at: reminderMap[s.id] ?? null,
    } satisfies PendingEmployee
  })
}

/** リマインダー履歴を取得する（最新50件） */
export async function getReminderHistory(
  supabase: SupabaseClient,
  tenantId: string,
  periodId: string
): Promise<ReminderRecord[]> {
  const { data, error } = await (supabase as any)
    .from('evaluation_reminders')
    .select(`
      id,
      sheet_id,
      reminder_type,
      message,
      target_status,
      sent_at,
      sent_by_employee:sent_by ( name )
    `)
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[getReminderHistory] failed:', error.message)
    return []
  }

  // 対象シートの従業員名を取得
  const sheetIds = [...new Set((data ?? []).map((r: any) => r.sheet_id))]
  const empMap: Record<string, string> = {}

  if (sheetIds.length > 0) {
    const { data: sheets } = await (supabase as any)
      .from('evaluation_sheets')
      .select('id, employees!employee_id ( name )')
      .in('id', sheetIds)

    for (const s of (sheets ?? []) as any[]) {
      empMap[s.id] = s.employees?.name ?? s.id
    }
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    sheet_id: r.sheet_id,
    employee_name: empMap[r.sheet_id] ?? r.sheet_id,
    reminder_type: r.reminder_type,
    message: r.message ?? null,
    target_status: r.target_status ?? null,
    sent_by_name: r.sent_by_employee?.name ?? '不明',
    sent_at: r.sent_at,
  } satisfies ReminderRecord))
}
```

- [ ] **Step 2: date-fns がインストールされているか確認する**

```bash
grep "date-fns" /home/hr-dx/ai-projects/hr-dx-saas/package.json
```

期待出力: `"date-fns":` が1行含まれること。含まれない場合: `npm install date-fns`

- [ ] **Step 3: 型チェック**

```bash
npm run type-check 2>&1 | grep "workflow-queries" | head -10
```

期待出力: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/evaluation/workflow-queries.ts
git commit -m "feat: add workflow-queries for evaluation workflow dashboard"
```

---

## Task 5: ワークフロー Server Actions

**Files:**
- Create: `src/features/evaluation/workflow-actions.ts`

- [ ] **Step 1: Server Actions ファイルを作成する**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { EvalActionResult } from './types'

/** 単一シートへリマインダーを送信する（アプリ内通知ログとして記録） */
export async function sendReminder(input: {
  period_id: string
  sheet_id: string
  reminder_type: 'deadline_approaching' | 'overdue' | 'bulk_nudge' | 'rollback_notify'
  message?: string
  target_status?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()

  const { data: sheet } = await (supabase as any)
    .from('evaluation_sheets')
    .select('id')
    .eq('id', input.sheet_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!sheet) return { success: false, error: '評価シートが見つかりません' }

  const { error } = await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: input.reminder_type,
    message: input.message?.trim() || null,
    target_status: input.target_status ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true }
}

/** 複数シートへ一括リマインダーを送信する */
export async function sendBulkReminder(input: {
  period_id: string
  sheet_ids: string[]
  message?: string
}): Promise<{ success: boolean; sent_count: number; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, sent_count: 0, error: '権限がありません' }
  }
  if (input.sheet_ids.length === 0) {
    return { success: false, sent_count: 0, error: '対象シートがありません' }
  }
  if (input.sheet_ids.length > 200) {
    return { success: false, sent_count: 0, error: '一括催促は200件以内にしてください' }
  }

  const supabase = await createClient()

  const { data: sheets } = await (supabase as any)
    .from('evaluation_sheets')
    .select('id, flow_status')
    .eq('tenant_id', user.tenant_id)
    .eq('period_id', input.period_id)
    .in('id', input.sheet_ids)

  const validSheets = (sheets ?? []) as { id: string; flow_status: string }[]
  if (validSheets.length === 0) return { success: false, sent_count: 0, error: '有効なシートがありません' }

  const records = validSheets.map(s => ({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: s.id,
    sent_by: user.employee_id,
    reminder_type: 'bulk_nudge' as const,
    message: input.message?.trim() || null,
    target_status: s.flow_status,
  }))

  const { error } = await (supabase as any).from('evaluation_reminders').insert(records)
  if (error) return { success: false, sent_count: 0, error: error.message }

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  return { success: true, sent_count: validSheets.length }
}

/** フロー状態を差し戻す（評価者 → 被評価者へ戻す） */
export async function rollbackEvaluationFlow(input: {
  sheet_id: string
  period_id: string
  to_status: string
  comment?: string
}): Promise<EvalActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: '権限がありません' }

  const supabase = await createClient()

  const { data: sheet } = await (supabase as any)
    .from('evaluation_sheets')
    .select('flow_status, is_locked')
    .eq('id', input.sheet_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!sheet) return { success: false, error: '評価シートが見つかりません' }
  if (sheet.is_locked) return { success: false, error: '確定済みのシートは変更できません' }

  const fromStatus = sheet.flow_status

  const { error: updateErr } = await (supabase as any)
    .from('evaluation_sheets')
    .update({
      flow_status: input.to_status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.sheet_id)

  if (updateErr) return { success: false, error: updateErr.message }

  await (supabase as any).from('evaluation_flow_logs').insert({
    tenant_id: user.tenant_id,
    sheet_id: input.sheet_id,
    from_status: fromStatus,
    to_status: input.to_status,
    changed_by: user.employee_id,
    comment: input.comment ?? null,
  })

  await (supabase as any).from('evaluation_reminders').insert({
    tenant_id: user.tenant_id,
    period_id: input.period_id,
    sheet_id: input.sheet_id,
    sent_by: user.employee_id,
    reminder_type: 'rollback_notify',
    message: input.comment?.trim() || '差し戻しが行われました',
    target_status: input.to_status,
  })

  revalidatePath(APP_ROUTES.EVALUATION.WORKFLOW)
  revalidatePath(APP_ROUTES.EVALUATION.ADMIN_LIST)
  return { success: true }
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | grep "workflow-actions" | head -10
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/features/evaluation/workflow-actions.ts
git commit -m "feat: add workflow server actions (sendReminder, sendBulkReminder, rollbackEvaluationFlow)"
```

---

## Task 6: ページファイル（Server Component）+ loading/error

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/error.tsx`

- [ ] **Step 1: loading.tsx を作成する**

```tsx
export default function WorkflowLoading() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="h-7 w-48 rounded bg-gray-300" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-300" />
          </div>
          <div className="space-y-4 p-6">
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-64 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: error.tsx を作成する**

```tsx
'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function WorkflowError({ error, reset }: Props) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-200 bg-red-50 px-6 py-5">
            <h1 className="text-lg font-bold text-red-700">エラーが発生しました</h1>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600">{error.message}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: page.tsx を作成する**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getEvaluationPeriods } from '@/features/evaluation/queries'
import {
  getWorkflowPhaseCounts,
  getPendingEmployees,
  getReminderHistory,
} from '@/features/evaluation/workflow-queries'
import { WorkflowDashboard } from './components/WorkflowDashboard'

export const dynamic = 'force-dynamic'

export default async function EvaluationWorkflowPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const periods = await getEvaluationPeriods(supabase, user.tenant_id!)

  // アクティブな期間（closed / confirmed 以外で最新のもの）を自動選択
  const activePeriod = periods.find(
    p => p.status !== 'confirmed' && p.status !== 'closed'
  ) ?? periods[0] ?? null

  if (!activePeriod) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="px-6 pb-6 pt-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-300 bg-gray-200 px-6 py-5">
              <h1 className="text-[1.35rem] font-bold text-gray-800 sm:text-[1.65rem]">
                評価ワークフロー管理
              </h1>
            </header>
            <div className="p-6">
              <p className="text-sm text-gray-500">
                有効な評価期間がありません。先に評価期間を作成してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [phaseCounts, pendingEmployees, reminderHistory] = await Promise.all([
    getWorkflowPhaseCounts(supabase, user.tenant_id!, activePeriod.id),
    getPendingEmployees(supabase, user.tenant_id!, activePeriod.id, activePeriod),
    getReminderHistory(supabase, user.tenant_id!, activePeriod.id),
  ])

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="relative border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  評価ワークフロー管理
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                <p className="mt-2 max-w-3xl text-sm leading-snug text-gray-700">
                  フェーズ進捗・未提出者の確認と一括催促を行います。
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <WorkflowDashboard
              periods={periods}
              activePeriod={activePeriod}
              phaseCounts={phaseCounts}
              pendingEmployees={pendingEmployees}
              reminderHistory={reminderHistory}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 型チェック**

```bash
npm run type-check 2>&1 | head -20
```

期待出力: エラーなし

- [ ] **Step 5: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/page.tsx"
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/loading.tsx"
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/error.tsx"
git commit -m "feat: add evaluation workflow page (Server Component)"
```

---

## Task 7: PhaseSummaryBar コンポーネント

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PhaseSummaryBar.tsx`

- [ ] **Step 1: PhaseSummaryBar を作成する**

```tsx
'use client'

import type { PhaseCount } from '@/features/evaluation/workflow-types'

interface Props {
  phaseCounts: PhaseCount[]
  totalCount: number
}

export function PhaseSummaryBar({ phaseCounts, totalCount }: Props) {
  if (totalCount === 0) {
    return (
      <p className="text-sm text-gray-500">この期間の評価シートがありません</p>
    )
  }

  return (
    <div className="space-y-4">
      {/* 積み上げプログレスバー */}
      <div className="overflow-hidden rounded-full bg-gray-100" style={{ height: '14px' }}>
        <div className="flex h-full">
          {phaseCounts.map(phase => (
            <div
              key={phase.status}
              title={`${phase.label}: ${phase.count}名`}
              style={{
                width: `${(phase.count / totalCount) * 100}%`,
                backgroundColor: phase.color,
              }}
            />
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {phaseCounts.map(phase => (
          <div key={phase.status} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: phase.color }}
            />
            <span className="text-xs text-gray-600">
              {phase.label}
              <span className="ml-1 font-semibold text-gray-800">{phase.count}名</span>
              <span className="ml-0.5 text-gray-400">
                ({Math.round((phase.count / totalCount) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* 確定率サマリー */}
      {(() => {
        const confirmedCount = phaseCounts.find(p => p.status === 'confirmed')?.count ?? 0
        const confirmedPct = Math.round((confirmedCount / totalCount) * 100)
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">確定率:</span>
            <span className={`font-semibold ${confirmedPct === 100 ? 'text-green-600' : confirmedPct >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
              {confirmedPct}%
            </span>
            <span className="text-gray-400">（{confirmedCount} / {totalCount} 名）</span>
          </div>
        )
      })()}
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PhaseSummaryBar.tsx"
git commit -m "feat: add PhaseSummaryBar component for evaluation workflow"
```

---

## Task 8: PendingList コンポーネント（未提出者一覧 + 一括催促）

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PendingList.tsx`

- [ ] **Step 1: PendingList を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { PendingEmployee } from '@/features/evaluation/workflow-types'
import { FLOW_STATUS_LABELS } from '@/features/evaluation/types'
import {
  sendReminder,
  sendBulkReminder,
  rollbackEvaluationFlow,
} from '@/features/evaluation/workflow-actions'

interface Props {
  periodId: string
  pendingEmployees: PendingEmployee[]
}

const ROLLBACK_OPTIONS: { label: string; to_status: string }[] = [
  { label: '目標設定へ戻す', to_status: 'goal_set' },
  { label: '自己評価へ戻す', to_status: 'self_eval' },
  { label: '一次評価へ戻す', to_status: 'primary_eval' },
  { label: '二次評価へ戻す', to_status: 'secondary_eval' },
]

export function PendingList({ periodId, pendingEmployees }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMessage, setBulkMessage] = useState('')
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<PendingEmployee | null>(null)
  const [rollbackComment, setRollbackComment] = useState('')
  const [rollbackStatus, setRollbackStatus] = useState('')

  function toggleSelect(sheetId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(sheetId)) next.delete(sheetId)
      else next.add(sheetId)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === pendingEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingEmployees.map(e => e.sheet_id)))
    }
  }

  function handleSingleReminder(emp: PendingEmployee) {
    setMessage(null)
    startTransition(async () => {
      const result = await sendReminder({
        period_id: periodId,
        sheet_id: emp.sheet_id,
        reminder_type:
          emp.days_remaining !== null && emp.days_remaining < 0 ? 'overdue' : 'deadline_approaching',
        target_status: emp.flow_status,
      })
      setMessage(
        result.success
          ? { type: 'success', text: `${emp.employee_name} へ催促を送信しました` }
          : { type: 'error', text: 'error' in result ? result.error : '送信失敗' }
      )
    })
  }

  function handleBulkReminder() {
    if (selectedIds.size === 0) return
    setMessage(null)
    startTransition(async () => {
      const result = await sendBulkReminder({
        period_id: periodId,
        sheet_ids: Array.from(selectedIds),
        message: bulkMessage.trim() || undefined,
      })
      if (result.success) {
        setMessage({ type: 'success', text: `${result.sent_count}名へ一括催促を送信しました` })
        setSelectedIds(new Set())
        setShowBulkForm(false)
        setBulkMessage('')
      } else {
        setMessage({ type: 'error', text: result.error ?? '送信失敗' })
      }
    })
  }

  function handleRollback() {
    if (!rollbackTarget || !rollbackStatus) return
    setMessage(null)
    startTransition(async () => {
      const result = await rollbackEvaluationFlow({
        sheet_id: rollbackTarget.sheet_id,
        period_id: periodId,
        to_status: rollbackStatus,
        comment: rollbackComment.trim() || undefined,
      })
      if (result.success) {
        setMessage({
          type: 'success',
          text: `${rollbackTarget.employee_name} のフローを差し戻しました`,
        })
        setRollbackTarget(null)
        setRollbackComment('')
        setRollbackStatus('')
      } else {
        setMessage({ type: 'error', text: 'error' in result ? result.error : '差し戻し失敗' })
      }
    })
  }

  if (pendingEmployees.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-green-700">全員の評価が確定しています！</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 一括操作バー */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleAll} className="text-xs text-primary hover:underline">
          {selectedIds.size === pendingEmployees.length ? '全解除' : '全選択'}
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkForm(v => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-100"
          >
            {selectedIds.size}名を一括催促
          </button>
        )}
      </div>

      {/* 一括催促フォーム */}
      {showBulkForm && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-2 text-sm font-medium text-yellow-800">
            選択した {selectedIds.size} 名に催促メッセージを送ります
          </p>
          <textarea
            value={bulkMessage}
            onChange={e => setBulkMessage(e.target.value)}
            placeholder="メッセージを入力（省略可）"
            rows={2}
            className="w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setShowBulkForm(false)
                setBulkMessage('')
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleBulkReminder}
              disabled={isPending}
              className="rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {isPending ? '送信中...' : '送信'}
            </button>
          </div>
        </div>
      )}

      {/* 差し戻しモーダル */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-800">フローを差し戻す</h3>
            <p className="mb-4 text-sm text-gray-500">
              対象:{' '}
              <span className="font-medium text-gray-700">{rollbackTarget.employee_name}</span>
            </p>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-700">差し戻し先</label>
              <select
                value={rollbackStatus}
                onChange={e => setRollbackStatus(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="">— 選択 —</option>
                {ROLLBACK_OPTIONS.map(o => (
                  <option key={o.to_status} value={o.to_status}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                コメント（任意）
              </label>
              <textarea
                value={rollbackComment}
                onChange={e => setRollbackComment(e.target.value)}
                placeholder="差し戻しの理由を入力"
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setRollbackTarget(null)
                  setRollbackComment('')
                  setRollbackStatus('')
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                キャンセル
              </button>
              <button
                onClick={handleRollback}
                disabled={isPending || !rollbackStatus}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? '処理中...' : '差し戻す'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未提出者テーブル */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === pendingEmployees.length && pendingEmployees.length > 0
                  }
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                従業員
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                フロー状態
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                期限
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pendingEmployees.map(emp => {
              const isOverdue = emp.days_remaining !== null && emp.days_remaining < 0
              const isUrgent =
                emp.days_remaining !== null &&
                emp.days_remaining >= 0 &&
                emp.days_remaining <= 3
              return (
                <tr key={emp.sheet_id} className="hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.sheet_id)}
                      onChange={() => toggleSelect(emp.sheet_id)}
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {emp.employee_name}
                      {emp.employee_code && (
                        <span className="ml-1 text-xs text-gray-400">({emp.employee_code})</span>
                      )}
                    </div>
                    {emp.division_path && (
                      <div className="text-xs text-gray-400">{emp.division_path}</div>
                    )}
                    {emp.last_reminder_at && (
                      <div className="text-xs text-blue-400">
                        最終催促:{' '}
                        {format(parseISO(emp.last_reminder_at), 'M/d HH:mm', { locale: ja })}
                      </div>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {FLOW_STATUS_LABELS[emp.flow_status]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {emp.phase_deadline ? (
                      <span
                        className={`text-xs font-medium ${
                          isOverdue
                            ? 'text-red-600'
                            : isUrgent
                              ? 'text-yellow-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {emp.phase_deadline}
                        {emp.days_remaining !== null && (
                          <span className="ml-1">
                            {isOverdue
                              ? `(${Math.abs(emp.days_remaining)}日超過)`
                              : `(残${emp.days_remaining}日)`}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSingleReminder(emp)}
                        disabled={isPending}
                        className="rounded border border-yellow-300 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                      >
                        催促
                      </button>
                      <button
                        onClick={() => setRollbackTarget(emp)}
                        disabled={isPending}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        差し戻し
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 型チェック**

```bash
npm run type-check 2>&1 | grep "PendingList" | head -10
```

期待出力: エラーなし

- [ ] **Step 3: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/PendingList.tsx"
git commit -m "feat: add PendingList component with bulk reminder and rollback"
```

---

## Task 9: ReminderHistory コンポーネント

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/ReminderHistory.tsx`

- [ ] **Step 1: ReminderHistory を作成する**

```tsx
'use client'

import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { ReminderRecord } from '@/features/evaluation/workflow-types'

interface Props {
  records: ReminderRecord[]
}

const REMINDER_TYPE_LABELS: Record<string, string> = {
  deadline_approaching: '期限前',
  overdue:              '期限超過',
  bulk_nudge:           '一括催促',
  rollback_notify:      '差し戻し',
}

const REMINDER_TYPE_COLORS: Record<string, string> = {
  deadline_approaching: 'bg-blue-50 text-blue-700',
  overdue:              'bg-red-50 text-red-700',
  bulk_nudge:           'bg-yellow-50 text-yellow-700',
  rollback_notify:      'bg-purple-50 text-purple-700',
}

export function ReminderHistory({ records }: Props) {
  if (records.length === 0) {
    return <p className="text-sm text-gray-400">まだ催促履歴はありません</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              日時
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              対象者
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
              種別
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
              送信者
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {records.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-xs text-gray-600">
                {format(parseISO(r.sent_at), 'M/d HH:mm', { locale: ja })}
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-800">{r.employee_name}</span>
                {r.message && (
                  <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{r.message}</p>
                )}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REMINDER_TYPE_COLORS[r.reminder_type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {REMINDER_TYPE_LABELS[r.reminder_type] ?? r.reminder_type}
                </span>
              </td>
              <td className="hidden px-4 py-3 text-xs text-gray-500 md:table-cell">
                {r.sent_by_name}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/ReminderHistory.tsx"
git commit -m "feat: add ReminderHistory component"
```

---

## Task 10: WorkflowDashboard メインコンポーネント

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/WorkflowDashboard.tsx`

- [ ] **Step 1: WorkflowDashboard を作成する**

```tsx
'use client'

import { useState } from 'react'
import type { EvaluationPeriod } from '@/features/evaluation/types'
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS } from '@/features/evaluation/types'
import type {
  PhaseCount,
  PendingEmployee,
  ReminderRecord,
} from '@/features/evaluation/workflow-types'
import { PhaseSummaryBar } from './PhaseSummaryBar'
import { PendingList } from './PendingList'
import { ReminderHistory } from './ReminderHistory'

interface Props {
  periods: EvaluationPeriod[]
  activePeriod: EvaluationPeriod
  phaseCounts: PhaseCount[]
  pendingEmployees: PendingEmployee[]
  reminderHistory: ReminderRecord[]
}

type Tab = 'pending' | 'history'

export function WorkflowDashboard({
  activePeriod,
  phaseCounts,
  pendingEmployees,
  reminderHistory,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const totalCount = phaseCounts.reduce((sum, p) => sum + p.count, 0)
  const overdueCount = pendingEmployees.filter(
    e => e.days_remaining !== null && e.days_remaining < 0
  ).length
  const urgentCount = pendingEmployees.filter(
    e => e.days_remaining !== null && e.days_remaining >= 0 && e.days_remaining <= 3
  ).length

  return (
    <div className="space-y-5">
      {/* 期間情報バナー */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="text-sm font-semibold text-gray-800">{activePeriod.name}</span>
            <span className="ml-2 text-xs text-gray-500">
              {PERIOD_TYPE_LABELS[activePeriod.period_type]} / {activePeriod.fiscal_year}年度
            </span>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/30">
            {PERIOD_STATUS_LABELS[activePeriod.status]}
          </span>
          <span className="text-xs text-gray-400">
            {activePeriod.start_date} 〜 {activePeriod.end_date}
          </span>
        </div>
      </div>

      {/* アラートバナー */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-red-500">⚠</span>
          <p className="text-sm font-medium text-red-700">
            期限超過:{' '}
            <span className="font-bold">{overdueCount}名</span>
            {urgentCount > 0 && (
              <span className="ml-3 text-yellow-700">
                期限3日以内: <span className="font-bold">{urgentCount}名</span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* フェーズ進捗バー */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          フェーズ別進捗（全 {totalCount} 名）
        </h2>
        <PhaseSummaryBar phaseCounts={phaseCounts} totalCount={totalCount} />
      </section>

      <div className="border-t border-gray-200" />

      {/* タブ切り替え */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          未提出者一覧
          {pendingEmployees.length > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {pendingEmployees.length}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          催促履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'pending' ? (
        <PendingList periodId={activePeriod.id} pendingEmployees={pendingEmployees} />
      ) : (
        <ReminderHistory records={reminderHistory} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 型チェック（全ファイル）**

```bash
npm run type-check 2>&1 | head -30
```

期待出力: ゼロエラー（または評価関連以外の既存エラーのみ）

- [ ] **Step 3: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(evaluation)/evaluation/workflow/components/WorkflowDashboard.tsx"
git commit -m "feat: add WorkflowDashboard main component"
```

---

## Task 11: 動作確認とビルド

- [ ] **Step 1: 開発サーバーを起動する**

```bash
npm run dev
```

ブラウザで `http://localhost:3000/adm/evaluation/workflow` を開く。

確認ポイント:
1. ページが表示されること（ヘッダー「評価ワークフロー管理」が見える）
2. 評価期間バナーが表示されること
3. フェーズ進捗バーが表示されること
4. 未提出者一覧タブに切り替えられること
5. 催促ボタンをクリックすると成功メッセージが出ること
6. 差し戻しボタンをクリックするとモーダルが開くこと
7. 催促履歴タブに切り替えられること

- [ ] **Step 2: プロダクションビルドを確認する**

```bash
npm run build 2>&1 | tail -20
```

期待出力: `✓ Compiled successfully` / ビルドエラーなし

エラーが出た場合: エラーメッセージに従い修正してから再ビルド。

- [ ] **Step 3: 最終コミット**

```bash
git status
git commit -m "feat: P1-C evaluation workflow automation complete" --allow-empty
```

---

## 実装後のセルフチェック

| 確認項目 | 期待値 |
|---|---|
| `evaluation_reminders` テーブルに RLS が設定されている | ✅ |
| `actions.ts` で `createAdminClient()` を使っていない | ✅ |
| `app/api/` に新規ルートを追加していない | ✅ |
| `loading.tsx` と `error.tsx` が配置されている | ✅ |
| URL のハードコードがない（APP_ROUTES を使っている） | ✅ |
| 既存テーブルへのデータ破壊操作がない | ✅ |
| `supabase db reset` を実行していない | ✅ |
