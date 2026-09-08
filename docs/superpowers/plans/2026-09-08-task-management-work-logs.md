# タスク管理 工数管理機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク管理機能（Phase 2）の残りである工数入力（自由入力：作業日・時間・メモ）と、工数分布グラフ（メンバー別・タスクグループ別）を実装する。

**Architecture:** 既存の `task-management` フィーチャーへの追加。新規テーブル `task_work_logs` を1つ作成し、既存の `TaskDetailModal`（工数記録の一覧・投稿・編集・削除）、タスクグループ詳細ページ（メンバー別グラフ）、目標詳細ページ（グループ別グラフ）に組み込む。RLS は `task_work_logs` 自身を参照しない設計（`tasks`/`task_groups` 側の既存ヘルパー関数を経由）とし、Phase 1・Phase 2 で2回発生した自己参照バグと同じクラスの問題を作らない。

**Tech Stack:** Next.js 16 App Router、TypeScript（strict: false）、Supabase（PostgreSQL + RLS）、Zod v4、Recharts（既存依存関係、追加インストール不要）

**Spec:** `docs/implementation-plan-task-management.md` セクション3（要求7・8）、セクション4（データモデル）、セクション14（Phase 2 詳細設計：工数管理機能）

## Global Constraints

- 新規テーブルは `tenant_id NOT NULL`、RLS 有効化必須、`employees`/`tasks` への参照は `ON DELETE CASCADE`（CLAUDE.md「絶対禁止」表）
- `CREATE TABLE IF NOT EXISTS` を使う。既存テーブルへの変更は無い
- RLS ポリシーは `task_work_logs` 自身を `USING`/`WITH CHECK` 句内で再帰的に参照しない（`tasks`/`task_groups` の既存ヘルパー関数 `is_task_group_participant` / `can_view_task` を経由する）。UPDATE ポリシーには必ず `WITH CHECK` を付ける（`task_comments_update` で発見された認可バイパスと同じ欠陥を作らない）
- 工数の編集・削除は投稿者本人のみ（責任者・マネージャーによる代理編集・削除は対象外。セクション14.1のルール）
- `.update()` / `.insert()` に渡すオブジェクトは必要なカラムのみに限定する（`updateTaskStatus` 等の既存パターン）。UPDATE/DELETE 実行後は `.select('id')` で0件チェックを行い、0件ならエラーを投げる（RLS がサイレント失敗するため）
- Server Component（`page.tsx`）の初期表示データ取得は `queries.ts` に置く。Client Component（`TaskDetailModal` 内の工数一覧）からの動的フェッチは、コメント機能と同じ意図的逸脱として `actions.ts` に読み取り専用 Server Action を新設する
- コードコメントは日本語で記述する。命名規則・ルーティング（`APP_ROUTES` 使用）は既存パターンに従う（本機能では新規ルートは不要）
- `supabase gen types typescript --local` の出力は必ずファイルへのリダイレクトのみで完結させ、標準エラー出力（CLI診断メッセージ）を巻き込まないこと。Phase 2 Task 1 で「`Connecting to db 5432` 等の診断行が生成された `types.ts` に混入し構文エラーになる」事故が実際に発生した。`supabase gen types typescript --local > src/lib/supabase/types.ts` を実行した後、必ず `head -5 src/lib/supabase/types.ts` で1行目が `export type Json` 等の正常なTypeScriptで始まることを確認すること。異常が疑われる場合は `supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts` で標準エラーを切り離して再実行する
- ローカル Supabase 接続先：Studio `http://127.0.0.1:55423` / API `http://127.0.0.1:55421` / PostgreSQL `postgresql://127.0.0.1:55422/postgres`（`supabase db reset` は絶対に使わない）

---

### Task 1: `task_work_logs` テーブル・RLS ポリシーのマイグレーション

**Files:**

- Create: `supabase/migrations/20260908_1_create_task_work_logs_table.sql`（実行時に `supabase migration new create_task_work_logs_table` で正しいタイムスタンプ付きファイル名を生成すること。以降このファイル名を仮称として扱う）
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で再生成）

**Interfaces:**

- Consumes: 既存マイグレーション `20260907032410_create_task_management_tables.sql` が定義する `current_tenant_id()` / `current_employee_id()` / `current_employee_app_role()` / `is_task_group_participant(uuid)`。既存マイグレーション `20260907135655_create_task_comments_table.sql` が定義する `can_view_task(uuid)`
- Produces: テーブル `public.task_work_logs`、関数 `public.can_log_work_on_task(uuid)`。以降のタスクはこのテーブル名・カラム名・関数名をそのまま使う

- [ ] **Step 1: マイグレーションファイルを作成する**

Run: `supabase migration new create_task_work_logs_table`

生成されたファイル（`supabase/migrations/<timestamp>_create_task_work_logs_table.sql`）に以下を書き込む。

```sql
-- タスク工数記録（task_work_logs）: タスク単位の自由入力形式の工数（作業日・時間・メモ）
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- current_tenant_id() / current_employee_id() / current_employee_app_role() / is_task_group_participant()
-- 依存: supabase/migrations/20260907135655_create_task_comments_table.sql の can_view_task()

CREATE TABLE IF NOT EXISTS public.task_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_work_logs IS 'タスク管理: タスク単位の自由入力形式の工数記録（作業日・時間・メモ）。要求7に対応';
COMMENT ON COLUMN public.task_work_logs.hours IS '1日あたりの作業時間。0より大きく24以下';

CREATE INDEX IF NOT EXISTS idx_task_work_logs_task_id ON public.task_work_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_logs_employee_id ON public.task_work_logs(employee_id);

-- 工数記録の登録権限: そのタスクが属するタスクグループの参加者（責任者/マネージャー/メンバー）、
-- または担当者本人であれば自分の工数を記録できる（担当者以外でも助け合い作業を許容するため、
-- can_comment_on_task のような担当者限定にはしない。セクション14.2）
CREATE OR REPLACE FUNCTION public.can_log_work_on_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        public.is_task_group_participant(t.task_group_id)
        OR t.assignee_employee_id = public.current_employee_id()
      )
  );
$$;

COMMENT ON FUNCTION public.can_log_work_on_task(UUID) IS 'ログインユーザーが指定したタスクに自分の工数を記録できるか（グループ参加者または担当者本人）';

ALTER TABLE public.task_work_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: そのタスクを閲覧できる人（グループ参加者・担当者本人）全員、またはテナント管理者
-- task_work_logs 自身は参照しない（tasks 経由の can_view_task のみを使う）
CREATE POLICY "task_work_logs_select" ON public.task_work_logs
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.can_view_task(task_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- INSERT: 投稿者は自分自身の工数のみ。対象タスクへの記録権限が必要
CREATE POLICY "task_work_logs_insert" ON public.task_work_logs
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND public.can_log_work_on_task(task_id)
  );

-- UPDATE: 投稿者本人のみ（役割に関わらず代理編集は不可）。
-- USING と WITH CHECK の両方に同じ条件を付ける
-- （task_comments_update で WITH CHECK 漏れによる認可バイパスが発見された教訓）
CREATE POLICY "task_work_logs_update" ON public.task_work_logs
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND public.can_log_work_on_task(task_id)
  );

-- DELETE: 投稿者本人のみ（責任者・マネージャーによる代理削除は対象外）
CREATE POLICY "task_work_logs_delete" ON public.task_work_logs
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );
```

- [ ] **Step 2: ローカルDBにマイグレーションを適用する**

対象DBの宣言: これはローカル（`127.0.0.1:55422`）に対する操作である。

Run: `supabase migration up`
Expected: エラーなく適用完了。

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "\d task_work_logs"`
Expected: カラム一覧・CHECK制約・インデックスが表示される。

- [ ] **Step 3: RLSの自己参照バグと同じクラスの問題が無いことを確認する**

`task_work_logs_select` / `task_work_logs_insert` / `task_work_logs_update` / `task_work_logs_delete` の各ポリシー定義を読み、`task_work_logs` テーブル自身を一切参照していないこと（`tasks` テーブル・`can_view_task`/`can_log_work_on_task` 関数経由のみであること）を確認する。

`INSERT INTO task_work_logs (...) RETURNING id` が担当者ロールで成功することを、ロールバック付きトランザクションで検証する。

Run（例。実際の値は既存テストデータ、または Studio `http://127.0.0.1:55423` で確認した実在の `tenant_id`/`task_id`/`employee_id`/対応する `auth.users.id` に置き換える）:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<担当者のauth user_id>"}';

INSERT INTO task_work_logs (tenant_id, task_id, employee_id, work_date, hours, note)
VALUES ('<tenant_id>', '<task_id>', '<employee_id>', CURRENT_DATE, 2.5, '動作確認用')
RETURNING id;
-- Expected: 1行返る（エラーにならない）

ROLLBACK;
```

- [ ] **Step 4: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`

Run: `head -5 src/lib/supabase/types.ts`
Expected: 1行目が `export type Json =` 等の正常なTypeScriptで始まる（`Connecting to db` 等のCLI診断行が混入していないこと）。もし混入していたら `supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts` で再実行する。

Run: `grep -n "task_work_logs" src/lib/supabase/types.ts`
Expected: `task_work_logs` の型定義（Row/Insert/Update）が出力される。

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/*_create_task_work_logs_table.sql src/lib/supabase/types.ts
git commit -m "feat: task_work_logs テーブルとRLSポリシーを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: 型・Zodスキーマ・純粋関数（集計ロジック）

**Files:**

- Modify: `src/features/task-management/types.ts`
- Create: `src/features/task-management/work-log-summary.ts`
- Create: `src/features/task-management/work-log-summary.test.ts`

**Interfaces:**

- Consumes: なし（このタスクは型定義と純粋関数のみで、DBアクセスを含まない）
- Produces: `TaskWorkLog` 型、`createWorkLogSchema`/`updateWorkLogSchema`/`deleteWorkLogSchema`/`getTaskWorkLogsTargetSchema`（Task 3・4 が使う）、`aggregateHoursByEmployee`/`aggregateHoursByGroup`（Task 3 の `queries.ts` が使う）、`EmployeeHoursSummary`/`GroupHoursSummary` 型

- [ ] **Step 1: `types.ts` に工数記録のZodスキーマと型を追加する**

`src/features/task-management/types.ts` の末尾（`TaskComment` インターフェースの後）に以下を追加する。

```typescript
export const createWorkLogSchema = z.object({
  taskId: z.string().uuid(),
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>

export const updateWorkLogSchema = z.object({
  workLogId: z.string().uuid(),
  workDate: dateStringSchema,
  hours: z.number().positive().max(24),
  note: z.string().max(1000).optional(),
})
export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>

export const deleteWorkLogSchema = z.object({
  workLogId: z.string().uuid(),
})
export type DeleteWorkLogInput = z.infer<typeof deleteWorkLogSchema>

export const getTaskWorkLogsTargetSchema = z.object({
  taskId: z.string().uuid(),
})
export type GetTaskWorkLogsTarget = z.infer<typeof getTaskWorkLogsTargetSchema>

export interface TaskWorkLog {
  id: string
  tenantId: string
  taskId: string
  employeeId: string
  /** 記録者の氏名（employees.name が null の場合のフォールバック済み） */
  employeeName: string
  workDate: string
  hours: number
  note: string | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 集計用の純粋関数を書く（失敗するテストを先に書く）**

`src/features/task-management/work-log-summary.test.ts` を作成する。

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateHoursByEmployee, aggregateHoursByGroup } from './work-log-summary'

test('メンバー別に工数を合計する', () => {
  const rows = [
    { employeeId: 'e1', employeeName: '山田太郎', hours: 2 },
    { employeeId: 'e2', employeeName: '佐藤花子', hours: 1.5 },
    { employeeId: 'e1', employeeName: '山田太郎', hours: 3 },
  ]
  assert.deepEqual(aggregateHoursByEmployee(rows), [
    { employeeId: 'e1', employeeName: '山田太郎', totalHours: 5 },
    { employeeId: 'e2', employeeName: '佐藤花子', totalHours: 1.5 },
  ])
})

test('メンバー別集計は合計時間の降順に並ぶ', () => {
  const rows = [
    { employeeId: 'e1', employeeName: '山田太郎', hours: 1 },
    { employeeId: 'e2', employeeName: '佐藤花子', hours: 5 },
  ]
  assert.deepEqual(aggregateHoursByEmployee(rows), [
    { employeeId: 'e2', employeeName: '佐藤花子', totalHours: 5 },
    { employeeId: 'e1', employeeName: '山田太郎', totalHours: 1 },
  ])
})

test('工数記録が無い場合は空配列を返す', () => {
  assert.deepEqual(aggregateHoursByEmployee([]), [])
})

test('タスクグループ別に工数を合計する', () => {
  const rows = [
    { taskGroupId: 'g1', taskGroupName: 'グループA', hours: 4 },
    { taskGroupId: 'g2', taskGroupName: 'グループB', hours: 2 },
    { taskGroupId: 'g1', taskGroupName: 'グループA', hours: 1 },
  ]
  assert.deepEqual(aggregateHoursByGroup(rows), [
    { taskGroupId: 'g1', taskGroupName: 'グループA', totalHours: 5 },
    { taskGroupId: 'g2', taskGroupName: 'グループB', totalHours: 2 },
  ])
})
```

- [ ] **Step 3: テストを実行して失敗を確認する**

Run: `npm test -- --test-name-pattern="工数"`
Expected: FAIL（`work-log-summary` モジュールが存在しない）

- [ ] **Step 4: 実装する**

`src/features/task-management/work-log-summary.ts` を作成する。

```typescript
export interface EmployeeHoursSummary {
  employeeId: string
  employeeName: string
  totalHours: number
}

/** タスクグループ詳細ページ用：メンバー別の工数合計を降順で返す */
export function aggregateHoursByEmployee(
  rows: { employeeId: string; employeeName: string; hours: number }[]
): EmployeeHoursSummary[] {
  const totals = new Map<string, EmployeeHoursSummary>()

  for (const row of rows) {
    const existing = totals.get(row.employeeId)
    if (existing) {
      existing.totalHours += row.hours
    } else {
      totals.set(row.employeeId, {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        totalHours: row.hours,
      })
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours)
}

export interface GroupHoursSummary {
  taskGroupId: string
  taskGroupName: string
  totalHours: number
}

/** 目標詳細ページ用：タスクグループ別の工数合計を降順で返す */
export function aggregateHoursByGroup(
  rows: { taskGroupId: string; taskGroupName: string; hours: number }[]
): GroupHoursSummary[] {
  const totals = new Map<string, GroupHoursSummary>()

  for (const row of rows) {
    const existing = totals.get(row.taskGroupId)
    if (existing) {
      existing.totalHours += row.hours
    } else {
      totals.set(row.taskGroupId, {
        taskGroupId: row.taskGroupId,
        taskGroupName: row.taskGroupName,
        totalHours: row.hours,
      })
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.totalHours - a.totalHours)
}
```

- [ ] **Step 5: テストを実行して成功を確認する**

Run: `npm test -- --test-name-pattern="工数"`
Expected: PASS（4件）

- [ ] **Step 6: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/features/task-management/types.ts src/features/task-management/work-log-summary.ts src/features/task-management/work-log-summary.test.ts
git commit -m "feat: 工数記録の型・Zodスキーマ・集計用純粋関数を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: `queries.ts`/`actions.ts` への工数記録CRUD・集計取得の追加

**Files:**

- Modify: `src/features/task-management/queries.ts`
- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: Task 1 の `task_work_logs` テーブル。Task 2 の `TaskWorkLog`/`CreateWorkLogInput`/`UpdateWorkLogInput`/`DeleteWorkLogInput`/`GetTaskWorkLogsTarget` 型・スキーマ、`aggregateHoursByEmployee`/`aggregateHoursByGroup`
- Produces: `queries.ts` の `getTaskWorkLogs(supabase, taskId)` / `getWorkLogSummaryByGroup(supabase, taskGroupId)` / `getWorkLogSummaryByObjective(supabase, objectiveId)`。`actions.ts` の `createWorkLog` / `updateWorkLog` / `deleteWorkLog` / `getTaskWorkLogsAction`。Task 4（UIコンポーネント）・Task 5・6（ページ組み込み）はこれらの関数名・シグネチャをそのまま使う

- [ ] **Step 1: `queries.ts` に工数記録の取得関数を追加する**

`src/features/task-management/queries.ts` の先頭 import に `TaskWorkLog` を追加する。

```typescript
import type {
  TaskObjective,
  TaskMilestone,
  TaskGroup,
  Task,
  TaskComment,
  TaskWorkLog,
} from './types'
import {
  aggregateHoursByEmployee,
  aggregateHoursByGroup,
  type EmployeeHoursSummary,
  type GroupHoursSummary,
} from './work-log-summary'
```

ファイル末尾に以下を追加する。

```typescript
/** DB行（snake_case、employees とのJOIN込み）を TaskWorkLog（camelCase）に変換する */
function mapWorkLog(
  row: Database['public']['Tables']['task_work_logs']['Row'] & {
    employee: { name: string | null } | null
  }
): TaskWorkLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? '（名前未設定）',
    workDate: row.work_date,
    hours: Number(row.hours),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * タスク1件に紐づく工数記録一覧を作業日の降順で取得する（タスク詳細モーダル用）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getTaskWorkLogs(
  supabase: SupabaseClient<Database>,
  taskId: string
): Promise<TaskWorkLog[]> {
  const { data, error } = await supabase
    .from('task_work_logs')
    .select('*, employee:employee_id(name)')
    .eq('task_id', taskId)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapWorkLog)
}

/**
 * タスクグループ1件配下の全タスクの工数を、メンバー別に合計して取得する（工数分布グラフ用）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getWorkLogSummaryByGroup(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<EmployeeHoursSummary[]> {
  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('task_group_id', taskGroupId)

  if (taskError) throw taskError

  const taskIds = (taskRows ?? []).map(t => t.id)
  if (taskIds.length === 0) return []

  const { data, error } = await supabase
    .from('task_work_logs')
    .select('hours, employee_id, employee:employee_id(name)')
    .in('task_id', taskIds)

  if (error) throw error

  return aggregateHoursByEmployee(
    (data ?? []).map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee?.name ?? '（名前未設定）',
      hours: Number(row.hours),
    }))
  )
}

/**
 * 目標1件配下の全タスクグループの工数を、タスクグループ別に合計して取得する（工数分布グラフ用）。
 * RLS の SELECT ポリシーが可視範囲を絞り込むため、ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getWorkLogSummaryByObjective(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<GroupHoursSummary[]> {
  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)

  if (milestoneError) throw milestoneError

  const milestoneIds = (milestoneRows ?? []).map(m => m.id)
  if (milestoneIds.length === 0) return []

  const { data: groupRows, error: groupError } = await supabase
    .from('task_groups')
    .select('id, name')
    .in('milestone_id', milestoneIds)

  if (groupError) throw groupError
  if ((groupRows ?? []).length === 0) return []

  const groupIds = groupRows!.map(g => g.id)
  const groupNameById = new Map(groupRows!.map(g => [g.id, g.name]))

  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('id, task_group_id')
    .in('task_group_id', groupIds)

  if (taskError) throw taskError

  const taskIds = (taskRows ?? []).map(t => t.id)
  if (taskIds.length === 0) return []

  const groupIdByTaskId = new Map((taskRows ?? []).map(t => [t.id, t.task_group_id]))

  const { data: logRows, error: logError } = await supabase
    .from('task_work_logs')
    .select('hours, task_id')
    .in('task_id', taskIds)

  if (logError) throw logError

  return aggregateHoursByGroup(
    (logRows ?? []).map(row => {
      const groupId = groupIdByTaskId.get(row.task_id)!
      return {
        taskGroupId: groupId,
        taskGroupName: groupNameById.get(groupId) ?? '（不明なグループ）',
        hours: Number(row.hours),
      }
    })
  )
}
```

- [ ] **Step 2: `actions.ts` に工数記録のCRUDと読み取り専用Server Actionを追加する**

`src/features/task-management/actions.ts` の import 部分（`getTaskCommentsTargetSchema` の並び）に以下を追加する。

```typescript
  createWorkLogSchema,
  type CreateWorkLogInput,
  updateWorkLogSchema,
  type UpdateWorkLogInput,
  deleteWorkLogSchema,
  type DeleteWorkLogInput,
  getTaskWorkLogsTargetSchema,
  type TaskWorkLog,
```

`import { getTaskComments } from './queries'` を以下に変更する。

```typescript
import { getTaskComments, getTaskWorkLogs } from './queries'
```

ファイル末尾（`getTaskCommentsAction` の後）に以下を追加する。

```typescript
/**
 * 工数記録（task_work_logs）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional のため早期に弾く。
 * 記録可否（対象タスクへの記録権限）は RLS の INSERT ポリシーが強制する
 * （`can_log_work_on_task`）。revalidatePath 用に対象タスクの task_group_id を先に引く。
 */
export async function createWorkLog(input: CreateWorkLogInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .insert({
      tenant_id: user.tenant_id,
      task_id: parsed.taskId,
      employee_id: user.employee_id,
      work_date: parsed.workDate,
      hours: parsed.hours,
      note: parsed.note ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))

  return { id: data.id }
}

/**
 * 工数記録（task_work_logs）を更新する（作業日・時間・メモのみ）。
 *
 * カラム制限: `.update()` には `work_date`/`hours`/`note`/`updated_at` のみを渡す
 * （`task_id`/`employee_id` は変更させない）。
 * 更新可否（投稿者本人のみ）は RLS の UPDATE ポリシーが強制する。
 * 0件更新時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function updateWorkLog(input: UpdateWorkLogInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: log, error: fetchError } = await supabase
    .from('task_work_logs')
    .select('task_id')
    .eq('id', parsed.workLogId)
    .single()

  if (fetchError) throw fetchError

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', log.task_id)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .update({
      work_date: parsed.workDate,
      hours: parsed.hours,
      note: parsed.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.workLogId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この工数記録を編集する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * 工数記録（task_work_logs）を削除する。
 * 削除可否（投稿者本人のみ）は RLS の DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる。
 */
export async function deleteWorkLog(input: DeleteWorkLogInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteWorkLogSchema.parse(input)
  const supabase = await createClient()

  const { data: log, error: fetchError } = await supabase
    .from('task_work_logs')
    .select('task_id')
    .eq('id', parsed.workLogId)
    .single()

  if (fetchError) throw fetchError

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', log.task_id)
    .single()

  if (taskError) throw taskError

  const { data, error } = await supabase
    .from('task_work_logs')
    .delete()
    .eq('id', parsed.workLogId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('この工数記録を削除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク1件の工数記録一覧を取得する読み取り専用 Server Action。
 * タスク詳細モーダルが開いたタイミングで動的に取得する必要があり、
 * Client Component が呼べるのは Server Action のみのため、薄いラッパーとして置く
 * （`docs/implementation-plan-task-management.md` セクション14.4。コメントの
 * `getTaskCommentsAction` と同じ意図的逸脱）。
 */
export async function getTaskWorkLogsAction(target: { taskId: string }): Promise<TaskWorkLog[]> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = getTaskWorkLogsTargetSchema.parse(target)
  const supabase = await createClient()
  return getTaskWorkLogs(supabase, parsed.taskId)
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし。`task_work_logs` の型（Task 1 で再生成済み）と一致しない場合はエラーになるため、`hours` カラムの型（`numeric` は Supabase生成型では `string` になることがある）を確認し、必要なら `mapWorkLog`/集計クエリ内で `Number(...)` 変換が正しく効いているか見直す

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/queries.ts src/features/task-management/actions.ts
git commit -m "feat: 工数記録のCRUDと集計取得をqueries/actionsに追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: `WorkLogSection`（工数記録UI）・`WorkDistributionChart`（分布グラフ）・色定数

**Files:**

- Create: `src/features/task-management/chart-colors.ts`
- Create: `src/features/task-management/components/WorkDistributionChart.tsx`
- Create: `src/features/task-management/components/WorkLogSection.tsx`
- Modify: `src/features/task-management/components/TaskDetailModal.tsx`

**Interfaces:**

- Consumes: Task 3 の `createWorkLog`/`updateWorkLog`/`deleteWorkLog`/`getTaskWorkLogsAction`（`actions.ts`）、Task 2 の `TaskWorkLog` 型
- Produces: `WorkLogSection`（`taskId: string`, `canLogWork: boolean`, `currentEmployeeId: string | null` を受け取るコンポーネント）、`WorkDistributionChart`（`data: { label: string; hours: number }[]`, `emptyMessage: string` を受け取る汎用コンポーネント。Task 5・6 で再利用する）、`getChartColor(index: number): string`

- [ ] **Step 1: 色定数ファイルを作成する**

`src/features/task-management/chart-colors.ts` を作成する。

```typescript
/**
 * 工数分布グラフ用の色定数。ブランドカラー（#FD7601）を先頭に、
 * 既存のRecharts利用箇所（DeptStackedBarChart等）と同様、CSS変数ではなく
 * feature専用のTypeScript定数として定義する。
 */
export const WORK_LOG_CHART_COLORS = [
  '#FD7601',
  '#0EA5E9',
  '#22C55E',
  '#A855F7',
  '#F43F5E',
  '#EAB308',
  '#14B8A6',
  '#6366F1',
]

export function getChartColor(index: number): string {
  return WORK_LOG_CHART_COLORS[index % WORK_LOG_CHART_COLORS.length]
}
```

- [ ] **Step 2: 工数分布グラフコンポーネントを作成する**

`src/features/task-management/components/WorkDistributionChart.tsx` を作成する。

```tsx
'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getChartColor } from '../chart-colors'

interface WorkDistributionChartProps {
  data: { label: string; hours: number }[]
  emptyMessage: string
}

/** 工数分布（メンバー別・タスクグループ別で共用）の横棒グラフ */
export function WorkDistributionChart({ data, emptyMessage }: WorkDistributionChartProps) {
  if (data.length === 0) {
    return <p className="text-xs text-slate-400">{emptyMessage}</p>
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip formatter={(value: number) => [`${value}時間`, '工数']} />
          <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.label} fill={getChartColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: 工数記録セクション（一覧＋フォーム）を作成する**

`src/features/task-management/components/WorkLogSection.tsx` を作成する。`CommentThread.tsx` と同じ取得・楽観的でない再取得パターン（`useEffect` でマウント時に1回取得、更新後は `reload()`）を踏襲する。

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { createWorkLog, deleteWorkLog, getTaskWorkLogsAction, updateWorkLog } from '../actions'
import type { TaskWorkLog } from '../types'

interface WorkLogSectionProps {
  taskId: string
  /** このユーザーが自分の工数を記録できるか（グループ参加者または担当者本人。RLSが最終防衛） */
  canLogWork: boolean
  /** 閲覧者本人の従業員ID（編集・削除可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
}

export function WorkLogSection({ taskId, canLogWork, currentEmployeeId }: WorkLogSectionProps) {
  const [logs, setLogs] = useState<TaskWorkLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function reload() {
    setIsLoading(true)
    startTransition(async () => {
      try {
        const data = await getTaskWorkLogsAction({ taskId })
        setLogs(data)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '工数記録の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    })
  }

  useEffect(() => {
    reload()
    // taskId は呼び出し元から固定値として渡される想定のため、マウント時のみ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0)

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!isLoading && logs.length === 0 && (
        <p className="text-xs text-slate-400">工数記録はまだありません。</p>
      )}
      {logs.length > 0 && <p className="text-xs text-slate-500">合計: {totalHours}時間</p>}
      <ul className="space-y-1">
        {logs.map(log => (
          <WorkLogItem
            key={log.id}
            log={log}
            onChanged={reload}
            currentEmployeeId={currentEmployeeId}
          />
        ))}
      </ul>
      {canLogWork && <WorkLogForm taskId={taskId} onPosted={reload} />}
    </div>
  )
}

interface WorkLogItemProps {
  log: TaskWorkLog
  onChanged: () => void
  currentEmployeeId: string | null
}

function WorkLogItem({ log, onChanged, currentEmployeeId }: WorkLogItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [workDate, setWorkDate] = useState(log.workDate)
  const [hours, setHours] = useState(String(log.hours))
  const [note, setNote] = useState(log.note ?? '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwnLog = currentEmployeeId !== null && log.employeeId === currentEmployeeId

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setActionError(null)
    startTransition(async () => {
      try {
        await updateWorkLog({
          workLogId: log.id,
          workDate,
          hours: Number(hours),
          note: note || undefined,
        })
        setIsEditing(false)
        onChanged()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '工数記録の編集に失敗しました')
      }
    })
  }

  function handleDelete() {
    if (!window.confirm('この工数記録を削除しますか？')) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteWorkLog({ workLogId: log.id })
        onChanged()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '工数記録の削除に失敗しました')
      }
    })
  }

  if (isEditing) {
    return (
      <li className="rounded-lg border border-slate-200 p-2">
        <form onSubmit={handleSaveEdit} className="space-y-1">
          <div className="flex gap-2">
            <input
              type="date"
              value={workDate}
              onChange={e => setWorkDate(e.target.value)}
              required
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hours}
              onChange={e => setHours(e.target.value)}
              required
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ"
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
          {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !hours}
              className="rounded-lg bg-[#FD7601] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[10px] text-slate-500"
            >
              キャンセル
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-xs">
      <div>
        <span className="font-medium text-slate-900">{log.workDate}</span>
        <span className="ml-2 text-slate-600">{log.hours}時間</span>
        <span className="ml-2 text-slate-400">{log.employeeName}</span>
        {log.note && <p className="mt-0.5 text-slate-500">{log.note}</p>}
        {actionError && <p className="mt-0.5 text-red-600">{actionError}</p>}
      </div>
      {isOwnLog && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[10px] text-slate-500"
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-[10px] text-red-500 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      )}
    </li>
  )
}

interface WorkLogFormProps {
  taskId: string
  onPosted: () => void
}

function WorkLogForm({ taskId, onPosted }: WorkLogFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [workDate, setWorkDate] = useState(today)
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createWorkLog({
          taskId,
          workDate,
          hours: Number(hours),
          note: note || undefined,
        })
        setHours('')
        setNote('')
        onPosted()
      } catch (err) {
        setError(err instanceof Error ? err.message : '工数記録の登録に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="date"
          value={workDate}
          onChange={e => setWorkDate(e.target.value)}
          required
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
        <input
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          value={hours}
          onChange={e => setHours(e.target.value)}
          required
          placeholder="時間"
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
      </div>
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="メモ（任意）"
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !hours}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        工数を記録する
      </button>
    </form>
  )
}
```

- [ ] **Step 4: `TaskDetailModal` に工数記録セクションを組み込む**

`src/features/task-management/components/TaskDetailModal.tsx` の import に以下を追加する。

```typescript
import { WorkLogSection } from './WorkLogSection'
```

`TaskDetailModalProps` に以下のフィールドを追加する。

```typescript
/** 閲覧者が自分の工数を記録できるか（グループ参加者または担当者本人。RLSが最終防衛） */
canLogWork: boolean
```

関数の引数分割代入に `canLogWork` を追加する。コメントセクション（`<div className="mt-4 border-t border-slate-200 pt-3">...コメント...</div>`）の直後、モーダルを閉じる `</div>` の直前に以下を追加する。

```tsx
<div className="mt-4 border-t border-slate-200 pt-3">
  <h3 className="mb-2 text-xs font-semibold text-slate-900">工数記録</h3>
  <WorkLogSection taskId={task.id} canLogWork={canLogWork} currentEmployeeId={currentEmployeeId} />
</div>
```

- [ ] **Step 5: 型チェック**

Run: `npm run type-check`
Expected: `TaskDetailModal` の呼び出し元（`KanbanBoard.tsx`）が新しい必須propを渡していないため型エラーになる。これは Task 5 で解消する（このタスクの時点ではエラーが出て正常）。エラー内容が `canLogWork` の欠落によるものであることを確認する

- [ ] **Step 6: Commit**

```bash
git add src/features/task-management/chart-colors.ts src/features/task-management/components/WorkDistributionChart.tsx src/features/task-management/components/WorkLogSection.tsx src/features/task-management/components/TaskDetailModal.tsx
git commit -m "feat: 工数記録UI（WorkLogSection）と分布グラフ（WorkDistributionChart）を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: タスクグループ詳細ページへの組み込み（`canLogWork` 配線・メンバー別グラフ）

**Files:**

- Modify: `src/features/task-management/permissions.ts`
- Modify: `src/features/task-management/permissions.test.ts`（無ければ作成）
- Modify: `src/features/task-management/components/KanbanBoard.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 3 の `getWorkLogSummaryByGroup`（`queries.ts`）、Task 4 の `TaskDetailModal`（`canLogWork` prop）・`WorkDistributionChart`
- Produces: `permissions.ts` の `canLogWork(isOwner, isManager, isMember)`。`KanbanBoard` の新しい必須prop `canLogWork: boolean`（Task 4 の型エラーを解消する）

- [ ] **Step 1: 権限判定ヘルパーを追加する（失敗するテストを先に書く）**

`src/features/task-management/permissions.ts` に既存のテストファイルがあるか確認する。

Run: `ls src/features/task-management/permissions.test.ts 2>/dev/null || echo "not found"`

無ければ `src/features/task-management/permissions.test.ts` を新規作成し、以下を書く（既にあれば以下のテストケースを追記する）。

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { canLogWork } from './permissions'

test('責任者は工数を記録できる', () => {
  assert.equal(canLogWork(true, false, false), true)
})

test('マネージャーは工数を記録できる', () => {
  assert.equal(canLogWork(false, true, false), true)
})

test('メンバーは工数を記録できる', () => {
  assert.equal(canLogWork(false, false, true), true)
})

test('参加者でなければ工数を記録できない', () => {
  assert.equal(canLogWork(false, false, false), false)
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test -- --test-name-pattern="工数を記録"`
Expected: FAIL（`canLogWork` が存在しない）

- [ ] **Step 3: `permissions.ts` に実装する**

`src/features/task-management/permissions.ts` の末尾に追加する。

```typescript
/** 責任者・マネージャー・メンバーのいずれかであれば、自分の工数を記録できる（セクション14.2） */
export function canLogWork(isOwner: boolean, isManager: boolean, isMember: boolean): boolean {
  return isOwner || isManager || isMember
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test -- --test-name-pattern="工数を記録"`
Expected: PASS（4件）

- [ ] **Step 5: `KanbanBoard` に `canLogWork` propを追加し `TaskDetailModal` に渡す**

`src/features/task-management/components/KanbanBoard.tsx` の `KanbanBoardProps` に以下を追加する。

```typescript
/** 閲覧者が自分の工数を記録できるか（責任者/マネージャー/メンバーのいずれか） */
canLogWork: boolean
```

関数の引数分割代入に `canLogWork` を追加し、`<TaskDetailModal>` の呼び出しに `canLogWork={canLogWork}` を追加する。

- [ ] **Step 6: `groups/[id]/page.tsx` で権限を計算し、グラフを表示する**

`src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx` の import に以下を追加する。

```typescript
import { getWorkLogSummaryByGroup } from '@/features/task-management/queries'
import { WorkDistributionChart } from '@/features/task-management/components/WorkDistributionChart'
import {
  isObjectiveOwner,
  isTaskGroupManager,
  isTaskGroupMember,
  canAssignManager,
  canAssignMember,
  canLogWork,
} from '@/features/task-management/permissions'
```

（`isTaskGroupManager` は既存の import に既にある場合、重複させず1つの import 文にまとめる。`canLogWork` は同名の新規関数なので、後述の変数名 `canMemberLogWork` と衝突しないよう変数側の命名に注意する）

`isOwner`/`isManager` の計算の後に以下を追加する。

```typescript
const isMember = user?.employee_id
  ? isTaskGroupMember(board.memberEmployeeIds, user.employee_id)
  : false
const canMemberLogWork = canLogWork(isOwner, isManager, isMember)
```

`<KanbanBoard>` の呼び出しに `canLogWork={canMemberLogWork}` を追加する。

```tsx
<KanbanBoard
  tasks={board.tasks}
  myEmployeeId={user?.employee_id ?? null}
  canOperateAllTasks={canOperateAllTasks}
  canLogWork={canMemberLogWork}
/>
```

`getTaskGroupBoard` の呼び出し直後に、メンバー別工数分布の取得を追加する。

```typescript
const workLogSummary = await getWorkLogSummaryByGroup(supabase, id)
```

「タスクグループへのコメント」セクションの直前に、工数分布グラフのセクションを追加する。

```tsx
<section className="rounded-lg border border-slate-200 p-3">
  <h2 className="text-xs font-semibold text-slate-900 mb-2">メンバー別工数分布</h2>
  <WorkDistributionChart
    data={workLogSummary.map(s => ({ label: s.employeeName, hours: s.totalHours }))}
    emptyMessage="工数記録はまだありません。"
  />
</section>
```

- [ ] **Step 7: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 8: Commit**

```bash
git add src/features/task-management/permissions.ts src/features/task-management/permissions.test.ts src/features/task-management/components/KanbanBoard.tsx "src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx"
git commit -m "feat: タスクグループ詳細ページにメンバー別工数分布グラフと工数記録権限を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: 目標詳細ページへの組み込み（タスクグループ別グラフ）

**Files:**

- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 3 の `getWorkLogSummaryByObjective`（`queries.ts`）、Task 4 の `WorkDistributionChart`
- Produces: なし（末端の画面組み込みタスク）

- [ ] **Step 1: `objectives/[id]/page.tsx` にグラフを追加する**

`src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx` の import に以下を追加する。

```typescript
import { getWorkLogSummaryByObjective } from '@/features/task-management/queries'
import { WorkDistributionChart } from '@/features/task-management/components/WorkDistributionChart'
```

`getObjectiveDetail` の呼び出し直後に以下を追加する。

```typescript
const workLogSummary = await getWorkLogSummaryByObjective(supabase, id)
```

マイルストーンの `<section>` の後、閉じる `</div>` の直前に以下を追加する。

```tsx
<section className="rounded-lg border border-slate-200 p-3">
  <h2 className="text-xs font-semibold text-slate-900 mb-2">タスクグループ別工数分布</h2>
  <WorkDistributionChart
    data={workLogSummary.map(s => ({ label: s.taskGroupName, hours: s.totalHours }))}
    emptyMessage="工数記録はまだありません。"
  />
</section>
```

- [ ] **Step 2: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"
git commit -m "feat: 目標詳細ページにタスクグループ別工数分布グラフを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: 全体テスト実行・手動E2E確認・PRDステータス更新

**Files:**

- Modify: `docs/implementation-plan-task-management.md`

**Interfaces:**

- Consumes: Task 1〜6 で実装した全機能
- Produces: なし（検証・ドキュメント更新タスク）

- [ ] **Step 1: 単体テストを全件実行する**

Run: `npm test`
Expected: 全件PASS（既存テスト含む）

- [ ] **Step 2: 型チェック・Lint**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 3: 開発サーバーを起動し、手動E2Eで一連の流れを確認する**

対象DBの宣言: これはローカル（`127.0.0.1:55422` / `http://127.0.0.1:55421`）に対する操作である。

Run: `npm run dev`（既に起動している場合は流用する）

以下のフローをブラウザで確認する。

1. 責任者または担当メンバーとしてログインし、`/tasks` から自分が参加するタスクグループの詳細ページを開く
2. カンバンボードの下に「メンバー別工数分布」セクションが表示され、工数記録が無ければ「工数記録はまだありません。」と表示されることを確認する
3. カンバンボードのタスクカードをクリックしてタスク詳細モーダルを開き、「工数記録」セクションが表示されることを確認する
4. 工数記録フォームに作業日・時間・メモを入力して「工数を記録する」を押し、一覧に反映されることを確認する
5. モーダルを閉じて再度開き、「メンバー別工数分布」グラフに今記録した時間が反映されていることを確認する（ページ全体の再取得が必要な場合はブラウザをリロードする）
6. 自分が記録した工数記録に「編集」「削除」ボタンが表示され、他人が記録した工数記録には表示されないことを確認する（複数の従業員でログインして確認できない場合は、コード上の `isOwnLog` 判定を読んで確認する）
7. 目標詳細ページ（`/tasks/objectives/[id]`）を開き、「タスクグループ別工数分布」グラフが表示されることを確認する
8. メンバー（責任者でもマネージャーでもなく、そのタスクグループの `task_group_members` にも含まれない従業員）でログインし、そのタスクグループの詳細ページにアクセスできない、またはRLSにより工数記録の投稿ができないことを確認する（`is_task_group_participant` が false になるケース）

- [ ] **Step 4: PRDのステータスを更新する**

`docs/implementation-plan-task-management.md` のセクション14.5「実装ステータス（サブタスク単位）」の全行を「完了」に更新する。セクション12「実装ステータス」のPhase 2行を以下に更新する。

```markdown
| Phase 2 | 工数入力・工数分布・コメントスレッド | 完了（公開済み） |
```

- [ ] **Step 5: Commit**

```bash
git add docs/implementation-plan-task-management.md
git commit -m "docs: 工数管理機能のPRDステータスを完了に更新

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```
