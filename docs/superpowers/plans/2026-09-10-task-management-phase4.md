# タスク管理 Phase 4（運用概念図整合）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タスク管理機能を、ユーザー提示の運用概念図（責任者→複数タスク→複数担当者、タスク単位の目標、責任者/タスク責任者→個人への「アドバイス」、および「プロジェクトの開始・運営」フロー）に整合させる。要求14〜18（複数担当者化・個人宛てアドバイス・タスク目標フィールド・組織ツリーのタスクノード化・タスクグループ目標のマネージャー編集）を実装する。

**Architecture:** 既存の `task_objectives→task_milestones→task_groups→tasks` 5階層データモデルは変更せず、(1) `tasks` の担当者を単一列から `task_assignees` 多対多テーブルへ移行、(2) `task_comments` に宛先列とロールベースの送信権限を追加、(3) `tasks`/`task_groups` に `goal_summary` 列を追加、(4) 組織ツリー可視化（`org-tree.ts`）に `task`/`task_assignee` ノードを並列追加する。既存の「責任者→タスクグループ→{マネージャー,メンバー}」構造は変更しない。

**Tech Stack:** Next.js（App Router）+ React 19、TypeScript、Supabase（PostgreSQL + RLS）、Zod v4、`node:test`（既存規約）

**Spec:** `docs/implementation-plan-task-management.md` セクション19（Phase 4 詳細設計）

## Global Constraints

- テストは `node:test` + `node:assert/strict` を使う（新規テストライブラリは導入しない、既存規約）
- 各タスク完了後に `npm run type-check` と `npm run lint` を実行しエラー・警告ゼロを確認する
- マイグレーションは `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` を使う。`DROP COLUMN` は本計画の最終タスク（Task 13）のみで使用し、実行前に必ずユーザー承認を得る
- ローカルDBへの適用は `supabase migration up` を使う（`supabase db reset` は絶対に使わない）
- マイグレーション適用後は毎回 `supabase gen types typescript --local > src/lib/supabase/types.ts` で型を再生成する
- コードコメントは日本語で記述する（プロジェクト規約）
- ブランドカラーは `#FD7601`、既存コンポーネントのTailwindクラス規約（`text-xs`・`rounded-lg`・`border-slate-200`等）に合わせる
- 全タスクをfeatureブランチ上で実施し、mainには直接コミットしない（過去にBoundedタスクでmainへ直接コミットしてしまった事故があるため。ブランチ名は例: `feature/task-management-phase4`）
- 各タスクの最後に、そのタスクの変更のみをコミットする（frequent commits）

---

### Task 1: `task_assignees` テーブル・バックフィル・関連RLS更新（マイグレーション）

**Files:**

- Create: `supabase/migrations/20260910100000_create_task_assignees_table.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で自動生成、手書き禁止）

**Interfaces:**

- Produces: テーブル `public.task_assignees(id, tenant_id, task_id, employee_id, assigned_at)`、UNIQUE制約 `(task_id, employee_id)`。RLSポリシー `task_assignees_select`/`task_assignees_insert`/`task_assignees_delete`。関数 `can_comment_on_task`/`can_view_task`/`can_log_work_on_task` を `task_assignees` ベースに再定義（シグネチャは変更なし、`CREATE OR REPLACE FUNCTION` のみ）。ポリシー `tasks_select`/`tasks_update` を `task_assignees` ベースに再定義。

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- タスク担当者（task_assignees）: 1タスクに複数人を割り当てられるようにする多対多テーブル
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- current_tenant_id() / current_employee_id() / current_employee_app_role() /
-- is_task_group_owner() / is_task_group_manager() / is_task_group_participant()
-- 依存: supabase/migrations/20260907135655_create_task_comments_table.sql の
-- can_comment_on_task() / can_view_task()（本マイグレーション後半で再定義する）
-- 依存: supabase/migrations/20260908013207_create_task_work_logs_table.sql の
-- can_log_work_on_task()（本マイグレーション後半で再定義する）
-- 背景: docs/implementation-plan-task-management.md セクション19.1（Phase 4・要求14）

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, employee_id)
);

COMMENT ON TABLE public.task_assignees IS 'タスク管理: タスク1件に対する複数担当者の割当（多対多）。tasks.assignee_employee_id（単一）を置き換える';

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_employee_id ON public.task_assignees(employee_id);

-- 既存の tasks.assignee_employee_id を task_assignees へ複製する（読み取り専用バックフィル。
-- tasks.assignee_employee_id 列自体はここでは削除しない。削除は本Phase最終タスクで
-- ユーザー承認を得てから別マイグレーションで行う）
INSERT INTO public.task_assignees (tenant_id, task_id, employee_id, assigned_at)
SELECT tenant_id, id, assignee_employee_id, created_at
FROM public.tasks
WHERE assignee_employee_id IS NOT NULL
ON CONFLICT (task_id, employee_id) DO NOTHING;

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_assignees_select" ON public.task_assignees
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (
          public.is_task_group_participant(t.task_group_id)
          OR public.current_employee_app_role() <> 'employee'
        )
    )
  );

CREATE POLICY "task_assignees_insert" ON public.task_assignees
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (
          public.is_task_group_owner(t.task_group_id)
          OR public.is_task_group_manager(t.task_group_id)
          OR public.current_employee_app_role() <> 'employee'
        )
    )
  );

CREATE POLICY "task_assignees_delete" ON public.task_assignees
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND (
          public.is_task_group_owner(t.task_group_id)
          OR public.is_task_group_manager(t.task_group_id)
          OR public.current_employee_app_role() <> 'employee'
        )
    )
  );

COMMENT ON POLICY "task_assignees_select" ON public.task_assignees IS 'タスクを閲覧できる人（グループ参加者）全員、またはテナント管理者が担当者一覧を閲覧できる';
COMMENT ON POLICY "task_assignees_insert" ON public.task_assignees IS '責任者・マネージャーのみが担当者を追加できる（tasks_insert/tasks_updateと同じ権限方針）';
COMMENT ON POLICY "task_assignees_delete" ON public.task_assignees IS '責任者・マネージャーのみが担当者を解除できる';

-- ここから: assignee_employee_id を参照していた既存のRLSポリシー・関数を task_assignees ベースに更新する。
-- バックフィルが完了しているため、以降は task_assignees を正として扱う。

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_participant(task_group_id)
      OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = tasks.id AND a.employee_id = public.current_employee_id())
      OR public.current_employee_app_role() <> 'employee'
    )
  );

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = tasks.id AND a.employee_id = public.current_employee_id())
      OR public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE OR REPLACE FUNCTION public.can_comment_on_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        public.is_task_group_owner(t.task_group_id)
        OR public.is_task_group_manager(t.task_group_id)
        OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = t.id AND a.employee_id = public.current_employee_id())
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_task(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = p_task_id
      AND (
        public.is_task_group_participant(t.task_group_id)
        OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = t.id AND a.employee_id = public.current_employee_id())
      )
  );
$$;

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
        OR EXISTS (SELECT 1 FROM public.task_assignees a WHERE a.task_id = t.id AND a.employee_id = public.current_employee_id())
      )
  );
$$;

COMMENT ON FUNCTION public.can_comment_on_task(UUID) IS 'ログインユーザーが指定したタスクにコメント投稿できるか（責任者/マネージャー/task_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
COMMENT ON FUNCTION public.can_view_task(UUID) IS 'ログインユーザーが指定したタスクのコメントスレッドを閲覧できるか（グループ参加者またはtask_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
COMMENT ON FUNCTION public.can_log_work_on_task(UUID) IS 'ログインユーザーが指定したタスクに自分の工数を記録できるか（グループ参加者またはtask_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
```

- [ ] **Step 2: マイグレーションを適用する**

Run: `supabase migration up`
Expected: エラーなく適用される。

- [ ] **Step 3: バックフィル件数を検証する**

Run（`supabase db psql` またはStudioのSQL Editorで実行）:

```sql
SELECT
  (SELECT COUNT(*) FROM tasks WHERE assignee_employee_id IS NOT NULL) AS old_count,
  (SELECT COUNT(*) FROM task_assignees) AS new_count;
```

Expected: `old_count` と `new_count` が一致する。

- [ ] **Step 4: 型を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: `src/lib/supabase/types.ts` に `task_assignees` テーブルの型が追加される。

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/20260910100000_create_task_assignees_table.sql src/lib/supabase/types.ts
git commit -m "feat: task_assigneesテーブルを追加し複数担当者化の基盤を作る（要求14）"
```

---

### Task 2: 型・`queries.ts`・`actions.ts` を複数担当者対応に更新

**Files:**

- Modify: `src/features/task-management/types.ts`
- Modify: `src/features/task-management/queries.ts`
- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: Task 1の `task_assignees` テーブル
- Produces: `Task.assigneeEmployeeIds: string[]`（`assigneeEmployeeId: string | null` を置き換え）、`CreateTaskInput.assigneeEmployeeIds: string[]`、`AddTaskAssigneeInput`/`RemoveTaskAssigneeInput` 型、`addTaskAssignee`/`removeTaskAssignee` Server Action

- [ ] **Step 1: `types.ts` を更新する**

`src/features/task-management/types.ts` の `createTaskSchema` を次のように変更する:

```typescript
export const createTaskSchema = z.object({
  taskGroupId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  // 上限20は運用上想定される担当者数を大きく超えない範囲での安全弁（暴走防止）
  assigneeEmployeeIds: z.array(z.string().uuid()).max(20).optional().default([]),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  dueDate: dateStringSchema.optional(),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>
```

`Task` インターフェースを次のように変更する:

```typescript
export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  assigneeEmployeeIds: string[]
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}
```

`updateTaskProgressSchema` の直後に、以下を追加する:

```typescript
export const addTaskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AddTaskAssigneeInput = z.infer<typeof addTaskAssigneeSchema>

export const removeTaskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type RemoveTaskAssigneeInput = z.infer<typeof removeTaskAssigneeSchema>
```

- [ ] **Step 2: `queries.ts` の `mapTask`・`getTaskGroupBoard` を更新する**

`mapTask` 関数を次のように変更する:

```typescript
/** DB行（snake_case、task_assigneesとのJOIN込み）を Task（camelCase）に変換する */
function mapTask(
  row: Database['public']['Tables']['tasks']['Row'] & {
    task_assignees: { employee_id: string }[] | null
  }
): Task {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskGroupId: row.task_group_id,
    title: row.title,
    description: row.description,
    assigneeEmployeeIds: (row.task_assignees ?? []).map(a => a.employee_id),
    status: row.status as Task['status'],
    progressPercent: row.progress_percent,
    priority: row.priority as Task['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
  }
}
```

`getTaskGroupBoard` 内のタスク取得クエリを次のように変更する（`select('*')` を `select('*, task_assignees(employee_id)')` に変更するのみ）:

```typescript
const { data: taskRows, error: taskError } = await supabase
  .from('tasks')
  .select('*, task_assignees(employee_id)')
  .eq('task_group_id', taskGroupId)
  .order('sort_order', { ascending: true })
  .order('created_at', { ascending: true })

if (taskError) throw taskError

const tasks = (taskRows ?? []).map(mapTask)
```

- [ ] **Step 3: `actions.ts` の `createTask` を更新し、`addTaskAssignee`/`removeTaskAssignee` を追加する**

`createTask` を次のように変更する（`assignee_employee_id` のinsertを削除し、作成後に `task_assignees` へ挿入する）:

```typescript
export async function createTask(input: CreateTaskInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createTaskSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      title: parsed.title,
      description: parsed.description ?? null,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? null,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (error) throw error

  if (parsed.assigneeEmployeeIds.length > 0) {
    const { error: assigneeError } = await supabase.from('task_assignees').insert(
      parsed.assigneeEmployeeIds.map(employeeId => ({
        tenant_id: user.tenant_id!,
        task_id: data.id,
        employee_id: employeeId,
      }))
    )
    if (assigneeError) throw assigneeError
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))

  return { id: data.id }
}
```

`updateTaskProgress` の直後（`createComment` の直前）に、以下を追加する:

```typescript
/**
 * タスク（tasks）に担当者を1名追加する。
 * 追加可否（責任者・マネージャー）は RLS の task_assignees INSERT ポリシーが強制する。
 */
export async function addTaskAssignee(input: AddTaskAssigneeInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = addTaskAssigneeSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { error } = await supabase.from('task_assignees').insert({
    tenant_id: user.tenant_id,
    task_id: parsed.taskId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

/**
 * タスク（tasks）から担当者を1名解除する。
 * 解除可否（責任者・マネージャー）は RLS の task_assignees DELETE ポリシーが強制する。
 */
export async function removeTaskAssignee(input: RemoveTaskAssigneeInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = removeTaskAssigneeSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (taskError) throw taskError

  const { error } = await supabase
    .from('task_assignees')
    .delete()
    .eq('task_id', parsed.taskId)
    .eq('employee_id', parsed.employeeId)

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}
```

`actions.ts` 冒頭のimportに `addTaskAssigneeSchema, type AddTaskAssigneeInput, removeTaskAssigneeSchema, type RemoveTaskAssigneeInput` を追加する。

- [ ] **Step 4: 型チェック・Lintを実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし（この時点で `TaskForm.tsx`/`KanbanBoard.tsx`/`org-tree.ts`/`feed-provider.ts` が古い `assigneeEmployeeId` を参照しているため型エラーが出る。それらはTask 3〜7で解消するので、ここでは `task-management` ディレクトリ以外に新規エラーが増えていないことのみ確認すればよい）。

- [ ] **Step 5: コミット**

```bash
git add src/features/task-management/types.ts src/features/task-management/queries.ts src/features/task-management/actions.ts
git commit -m "feat: 型・queries・actionsをtask_assignees経由の複数担当者に対応（要求14）"
```

---

### Task 3: `MultiEmployeePicker` 新設・`TaskForm.tsx` を複数担当者選択に対応

**Files:**

- Create: `src/features/task-management/components/MultiEmployeePicker.tsx`
- Modify: `src/features/task-management/components/TaskForm.tsx`

**Interfaces:**

- Consumes: `EmployeePicker`（既存）、`EmployeeOption`（`employee-filter.ts`）
- Produces: `MultiEmployeePicker({ employees, value, onChange })`

- [ ] **Step 1: `MultiEmployeePicker.tsx` を作成する**

```tsx
'use client'

import { useState } from 'react'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface MultiEmployeePickerProps {
  employees: EmployeeOption[]
  value: string[]
  onChange: (employeeIds: string[]) => void
}

/**
 * 複数の従業員を選択するUI。EmployeePicker（単一選択コンボボックス）で1名ずつ追加し、
 * 追加済みの従業員はチップ表示で個別に解除できる（MemberAssignForm.tsxのチップ+追加フォーム
 * パターンをクライアント側完結（サーバーアクション呼び出し無し）に単純化したもの）。
 */
export function MultiEmployeePicker({ employees, value, onChange }: MultiEmployeePickerProps) {
  const [pendingId, setPendingId] = useState('')

  const selectable = employees.filter(e => !value.includes(e.id))

  function employeeName(id: string): string {
    return employees.find(e => e.id === id)?.name ?? id
  }

  function handleAdd() {
    if (!pendingId) return
    onChange([...value, pendingId])
    setPendingId('')
  }

  function handleRemove(id: string) {
    onChange(value.filter(existingId => existingId !== id))
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map(id => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
            >
              {employeeName(id)}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <div className="w-56">
          <EmployeePicker
            employees={selectable}
            value={pendingId}
            onChange={setPendingId}
            placeholder="担当者を検索して追加"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!pendingId}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
        >
          追加
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `TaskForm.tsx` を複数選択に変更する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '../actions'
import { TASK_PRIORITIES, type TaskPriority } from '../types'
import { MultiEmployeePicker } from './MultiEmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface TaskFormProps {
  taskGroupId: string
  /** 担当者として選択できる従業員（そのタスクグループのマネージャー・メンバーのみ） */
  assignableEmployees: EmployeeOption[]
}

export function TaskForm({ taskGroupId, assignableEmployees }: TaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [assigneeEmployeeIds, setAssigneeEmployeeIds] = useState<string[]>([])
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createTask({
          taskGroupId,
          title,
          assigneeEmployeeIds,
          priority,
        })
        setTitle('')
        setAssigneeEmployeeIds([])
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        タスク名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        担当者
        <div className="mt-1 w-56">
          <MultiEmployeePicker
            employees={assignableEmployees}
            value={assigneeEmployeeIds}
            onChange={setAssigneeEmployeeIds}
          />
        </div>
      </label>
      <label className="text-xs font-medium text-slate-700">
        優先度
        <select
          value={priority}
          onChange={e => setPriority(e.target.value as TaskPriority)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        >
          {TASK_PRIORITIES.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        タスクを追加
      </button>
    </form>
  )
}
```

- [ ] **Step 3: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/components/MultiEmployeePicker.tsx src/features/task-management/components/TaskForm.tsx
git commit -m "feat: タスク作成フォームを複数担当者選択に対応（要求14）"
```

---

### Task 4: `TaskCard.tsx`・`KanbanBoard.tsx`・`TaskDetailModal.tsx`・タスクグループ詳細ページを複数担当者の表示・操作に対応

**Files:**

- Modify: `src/features/task-management/components/TaskCard.tsx`
- Modify: `src/features/task-management/components/KanbanBoard.tsx`
- Modify: `src/features/task-management/components/TaskDetailModal.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 2の `Task.assigneeEmployeeIds`、Task 2の `addTaskAssignee`/`removeTaskAssignee`
- Produces: `TaskCard({ task, employeeNameById, onOpen })`、`KanbanBoard({ ..., employeeNameById, assignableEmployees })`、`TaskDetailModal({ ..., canManageAssignees, assignableEmployees })`

このタスクは既知の残課題「`TaskDetailModal`にタスク担当者名が未表示」も同時に解消する。

- [ ] **Step 1: `TaskCard.tsx` を更新する**

```tsx
'use client'

import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
  /** 従業員ID→氏名のマップ（担当者名の表示に使う） */
  employeeNameById: Record<string, string>
  onOpen: () => void
}

export function TaskCard({ task, employeeNameById, onOpen }: TaskCardProps) {
  const assigneeNames = task.assigneeEmployeeIds.map(id => employeeNameById[id] ?? id)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xs hover:bg-[#f6f8fa]"
    >
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <p className="mt-1 truncate text-[10px] text-slate-500">
        担当: {assigneeNames.length > 0 ? assigneeNames.join('、') : '未割当'}
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-[#FD7601] transition-[width] duration-(--duration-normal) ease-(--ease-out-quart)"
          style={{ width: `${task.progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
    </button>
  )
}
```

- [ ] **Step 2: `KanbanBoard.tsx` を更新する**

```tsx
'use client'

import { useState } from 'react'
import { TASK_STATUSES, type Task } from '../types'
import { TaskCard } from './TaskCard'
import { TaskDetailModal } from './TaskDetailModal'
import type { EmployeeOption } from '../employee-filter'

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface KanbanBoardProps {
  tasks: Task[]
  myEmployeeId: string | null
  canOperateAllTasks: boolean
  canLogWork: boolean
  /** 従業員ID→氏名のマップ（TaskCard/TaskDetailModalの担当者名表示に使う） */
  employeeNameById: Record<string, string>
  /** 担当者候補（そのタスクグループのマネージャー・メンバー。TaskDetailModalの担当者追加に使う） */
  assignableEmployees: EmployeeOption[]
}

export function KanbanBoard({
  tasks,
  myEmployeeId,
  canOperateAllTasks,
  canLogWork,
  employeeNameById,
  assignableEmployees,
}: KanbanBoardProps) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const openTask = openTaskId ? (tasks.find(t => t.id === openTaskId) ?? null) : null
  const canOperateOpenTask = openTask
    ? canOperateAllTasks ||
      (myEmployeeId !== null && openTask.assigneeEmployeeIds.includes(myEmployeeId))
    : false

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {TASK_STATUSES.map(status => (
        <div key={status} className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700">{STATUS_LABEL[status]}</h3>
          <div className="space-y-2">
            {tasks
              .filter(task => task.status === status)
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  employeeNameById={employeeNameById}
                  onOpen={() => setOpenTaskId(task.id)}
                />
              ))}
          </div>
        </div>
      ))}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          isOpen={true}
          onClose={() => setOpenTaskId(null)}
          canOperate={canOperateOpenTask}
          currentEmployeeId={myEmployeeId}
          canModerateComments={canOperateAllTasks}
          canLogWork={canLogWork}
          canManageAssignees={canOperateAllTasks}
          assignableEmployees={assignableEmployees}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: `TaskDetailModal.tsx` に担当者管理セクションを追加する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateTaskStatus,
  updateTaskProgress,
  addTaskAssignee,
  removeTaskAssignee,
} from '../actions'
import { TASK_STATUSES, type Task } from '../types'
import { CommentThread } from './CommentThread'
import { WorkLogSection } from './WorkLogSection'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface TaskDetailModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  canOperate: boolean
  currentEmployeeId: string | null
  canModerateComments: boolean
  canLogWork: boolean
  /** 担当者の追加・解除を行えるか（責任者/マネージャー。task_assigneesのRLSが最終防衛） */
  canManageAssignees: boolean
  /** 担当者候補（そのタスクグループのマネージャー・メンバー） */
  assignableEmployees: EmployeeOption[]
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  canOperate,
  currentEmployeeId,
  canModerateComments,
  canLogWork,
  canManageAssignees,
  assignableEmployees,
}: TaskDetailModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingAssigneeId, setPendingAssigneeId] = useState('')

  if (!isOpen) return null

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Task['status']
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
      }
    })
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progressPercent = Number(e.target.value)
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskProgress({ taskId: task.id, progressPercent })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '進捗率の更新に失敗しました')
      }
    })
  }

  function handleAddAssignee() {
    if (!pendingAssigneeId) return
    setError(null)
    startTransition(async () => {
      try {
        await addTaskAssignee({ taskId: task.id, employeeId: pendingAssigneeId })
        setPendingAssigneeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '担当者の追加に失敗しました')
      }
    })
  }

  function handleRemoveAssignee(employeeId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeTaskAssignee({ taskId: task.id, employeeId })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '担当者の解除に失敗しました')
      }
    })
  }

  function assigneeName(id: string): string {
    return assignableEmployees.find(e => e.id === id)?.name ?? id
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{task.title}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>

        {task.description && <p className="mt-2 text-xs text-slate-600">{task.description}</p>}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
          <div>
            <dt className="text-[10px] text-slate-400">優先度</dt>
            <dd>{PRIORITY_LABEL[task.priority]}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-slate-400">期限</dt>
            <dd>{task.dueDate ?? '未設定'}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <p className="text-xs font-medium text-slate-700">担当者</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {task.assigneeEmployeeIds.length === 0 && (
              <li className="text-[10px] text-slate-400">未割当</li>
            )}
            {task.assigneeEmployeeIds.map(id => (
              <li
                key={id}
                className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
              >
                {assigneeName(id)}
                {canManageAssignees && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignee(id)}
                    disabled={isPending}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canManageAssignees && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="w-48">
                <EmployeePicker
                  employees={assignableEmployees.filter(
                    e => !task.assigneeEmployeeIds.includes(e.id)
                  )}
                  value={pendingAssigneeId}
                  onChange={setPendingAssigneeId}
                  placeholder="担当者を追加"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAssignee}
                disabled={isPending || !pendingAssigneeId}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
              >
                追加
              </button>
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-slate-700">
            ステータス
            <select
              value={task.status}
              onChange={handleStatusChange}
              disabled={isPending || !canOperate}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            >
              {TASK_STATUSES.map(status => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-medium text-slate-700">
            進捗率: {task.progressPercent}%
            <input
              type="range"
              min={0}
              max={100}
              value={task.progressPercent}
              onChange={handleProgressChange}
              disabled={isPending || !canOperate}
              className="mt-1 w-full"
            />
          </label>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-900">コメント</h3>
          <CommentThread
            target={{ taskId: task.id }}
            canPost={canOperate}
            currentEmployeeId={currentEmployeeId}
            canModerate={canModerateComments}
          />
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="mb-2 text-xs font-semibold text-slate-900">工数記録</h3>
          <WorkLogSection
            taskId={task.id}
            canLogWork={canLogWork}
            currentEmployeeId={currentEmployeeId}
          />
        </div>
      </div>
    </div>
  )
}
```

（`CommentThread` への `adviceTargets` propはTask 9で追加する。ここでは既存propsのまま変更しない。）

- [ ] **Step 4: タスクグループ詳細ページを更新する**

`src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx` の従業員取得部分を次のように変更する（`needsEmployees` による条件分岐を廃止し、担当者名の解決に全閲覧者が使えるようにする）:

```tsx
const employees = await getTenantEmployees(supabase)
const assignableEmployees = employees.filter(
  e => board.managerEmployeeIds.includes(e.id) || board.memberEmployeeIds.includes(e.id)
)
const employeeNameById = Object.fromEntries(employees.map(e => [e.id, e.name]))
```

（`needsEmployees` 変数の定義と、それを使った条件分岐は削除する）

`<KanbanBoard>` の呼び出しを次のように変更する:

```tsx
<KanbanBoard
  tasks={board.tasks}
  myEmployeeId={user?.employee_id ?? null}
  canOperateAllTasks={canOperateAllTasks}
  canLogWork={canMemberLogWork}
  employeeNameById={employeeNameById}
  assignableEmployees={assignableEmployees}
/>
```

- [ ] **Step 5: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/components/TaskCard.tsx src/features/task-management/components/KanbanBoard.tsx src/features/task-management/components/TaskDetailModal.tsx "src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx"
git commit -m "feat: カンバン・タスク詳細を複数担当者の表示・追加・解除に対応（要求14、担当者名未表示の既知課題も解消）"
```

---

### Task 5: `org-tree.ts` を複数担当者集計に対応（純粋関数・ユニットテスト更新）＋ `queries.ts`（`getObjectiveOrgTree`）を複数担当者対応に更新

**Files:**

- Modify: `src/features/task-management/org-tree.ts`
- Modify: `src/features/task-management/org-tree.test.ts`
- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: Task 1の `task_assignees` テーブル
- Produces: `OrgTreeTaskRow.assigneeEmployeeIds: string[]`（`assigneeEmployeeId: string | null` を置き換え）

- [ ] **Step 1: 既存テストを新しい型に合わせて更新する（先に失敗させる）**

`src/features/task-management/org-tree.test.ts` 内の3箇所のタスクフィクスチャを次のように書き換える。

50行目付近のテストを:

```typescript
test('buildOrgTreeGraph: タスクグループ・メンバーごとにタスク数と平均進捗率を集計する', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: '設計チーム',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 20 },
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 60 },
    ],
  })

  const ownerNode = nodes.find(n => n.id === 'owner')
  const groupNode = nodes.find(n => n.id === 'group:g1')
  const memberNode = nodes.find(n => n.id === 'member:g1:e1')

  assert.deepEqual(ownerNode, {
    id: 'owner',
    label: '田中',
    role: 'owner',
    taskCount: 2,
    progressPercent: 40,
  })
  assert.equal(groupNode?.taskCount, 2)
  assert.equal(groupNode?.progressPercent, 40)
  assert.equal(memberNode?.taskCount, 2)
  assert.equal(memberNode?.progressPercent, 40)
})
```

85行目付近のテストを:

```typescript
test('buildOrgTreeGraph: 同一人物が複数グループに所属する場合、グループごとに別ノードとして独立集計する', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
      {
        taskGroupId: 'g2',
        taskGroupName: 'B',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 100 },
      { taskGroupId: 'g2', assigneeEmployeeIds: ['e1'], progressPercent: 0 },
    ],
  })

  const memberInG1 = nodes.find(n => n.id === 'member:g1:e1')
  const memberInG2 = nodes.find(n => n.id === 'member:g2:e1')

  assert.equal(memberInG1?.progressPercent, 100)
  assert.equal(memberInG2?.progressPercent, 0)
  assert.notEqual(memberInG1?.id, memberInG2?.id)
})
```

117行目付近のテストを:

```typescript
test('buildOrgTreeGraph: 未割当タスクはグループ集計に含むが人物集計には含めない', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      { taskGroupId: 'g1', assigneeEmployeeIds: ['e1'], progressPercent: 100 },
      { taskGroupId: 'g1', assigneeEmployeeIds: [], progressPercent: 0 },
    ],
  })

  const groupNode = nodes.find(n => n.id === 'group:g1')
  const memberNode = nodes.find(n => n.id === 'member:g1:e1')

  assert.equal(groupNode?.taskCount, 2)
  assert.equal(groupNode?.progressPercent, 50)
  assert.equal(memberNode?.taskCount, 1)
  assert.equal(memberNode?.progressPercent, 100)
})
```

続けて、複数担当者を検証する新規テストをファイル末尾（`layoutOrgTree`のテスト群の前、117行目のテストの直後）に追加する:

```typescript
test('buildOrgTreeGraph: 1タスクに複数担当者がいる場合、進捗が両方の担当者に計上される', () => {
  const { nodes } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: 'A',
        managers: [],
        members: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'e2', employeeName: '高橋' },
        ],
      },
    ],
    tasks: [{ taskGroupId: 'g1', assigneeEmployeeIds: ['e1', 'e2'], progressPercent: 80 }],
  })

  const groupNode = nodes.find(n => n.id === 'group:g1')
  const member1 = nodes.find(n => n.id === 'member:g1:e1')
  const member2 = nodes.find(n => n.id === 'member:g1:e2')

  assert.equal(groupNode?.taskCount, 1)
  assert.equal(groupNode?.progressPercent, 80)
  assert.equal(member1?.taskCount, 1)
  assert.equal(member1?.progressPercent, 80)
  assert.equal(member2?.taskCount, 1)
  assert.equal(member2?.progressPercent, 80)
})
```

- [ ] **Step 2: テストを実行し、型不一致で失敗することを確認する**

Run: `node --test src/features/task-management/org-tree.test.ts`
Expected: `assigneeEmployeeIds` が `OrgTreeTaskRow` に存在しない旨の型エラー、または実行時失敗。

- [ ] **Step 3: `org-tree.ts` を実装する**

`OrgTreeTaskRow` インターフェースを次のように変更する:

```typescript
export interface OrgTreeTaskRow {
  taskGroupId: string
  assigneeEmployeeIds: string[]
  progressPercent: number
}
```

`buildOrgTreeGraph` 内の `personProgressByKey`・`personTaskCountByKey` の計算部分を次のように変更する（`filter`/`if (!task.assigneeEmployeeId) continue` を、複数担当者へのfan-outに置き換える）:

```typescript
const personProgressByKey = groupProgressByParent(
  input.tasks.flatMap(t =>
    t.assigneeEmployeeIds.map(employeeId => ({
      value: t.progressPercent,
      parentId: `${t.taskGroupId}:${employeeId}`,
    }))
  ),
  personKeys
)

const personTaskCountByKey = new Map<string, number>()
for (const task of input.tasks) {
  for (const employeeId of task.assigneeEmployeeIds) {
    const key = `${task.taskGroupId}:${employeeId}`
    personTaskCountByKey.set(key, (personTaskCountByKey.get(key) ?? 0) + 1)
  }
}
```

- [ ] **Step 4: テストを実行し、成功を確認する**

Run: `node --test src/features/task-management/org-tree.test.ts`
Expected: 全件PASS。

- [ ] **Step 5: `queries.ts` の `getObjectiveOrgTree` を複数担当者対応に更新する**

`OrgTreeGroupPersonRow` の下に、タスク行の型を変更する（`getObjectiveOrgTree` 内のタスク取得クエリと変換部分）:

```typescript
let taskRows: {
  task_group_id: string
  progress_percent: number
  task_assignees: { employee_id: string }[] | null
}[] = []
```

同関数内のタスク取得クエリを次のように変更する:

```typescript
taskRows = await fetchAllRows(async (from, to) => {
  const result = await supabase
    .from('tasks')
    .select('task_group_id, progress_percent, task_assignees(employee_id)')
    .in('task_group_id', groupIds)
    .order('id', { ascending: true })
    .range(from, to)
  return { data: result.data, error: result.error }
})
```

`tasks: OrgTreeTaskRow[]` への変換部分を次のように変更する:

```typescript
const tasks: OrgTreeTaskRow[] = taskRows.map(row => ({
  taskGroupId: row.task_group_id,
  assigneeEmployeeIds: (row.task_assignees ?? []).map(a => a.employee_id),
  progressPercent: row.progress_percent,
}))
```

- [ ] **Step 6: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/org-tree.ts src/features/task-management/org-tree.test.ts src/features/task-management/queries.ts
git commit -m "feat: 組織ツリーの進捗集計を複数担当者のfan-outに対応（要求14）"
```

---

### Task 6: `feed-provider.ts` の割当通知クエリを `task_assignees` 経由に変更

**Files:**

- Modify: `src/features/task-management/feed-provider.ts`

**Interfaces:**

- Consumes: Task 1の `task_assignees` テーブル
- 変更対象は `fetch()` メソッド内のクエリ1箇所のみ。`toTaskAssignmentFeedItems`（純粋関数）は `AssignedTaskRow`（`id`/`title`/`task_group_id`/`due_date`/`created_at`のみ）を受け取る設計のため変更不要。既存のユニットテスト（`feed-provider.test.ts`）も変更不要。

- [ ] **Step 1: 割当通知クエリを更新する**

`taskManagementFeedProvider.fetch` 内の `assignedResult` クエリを次のように変更する（埋め込みフィルタ `task_assignees!inner(employee_id)` を使う。`getWorkLogSummaryByGroup` 等、既存コードベースの埋め込みフィルタパターンと同じ手法）:

```typescript
const [assignedResult, commentResult] = await Promise.all([
  supabase
    .from('tasks')
    .select('id, title, task_group_id, due_date, created_at, task_assignees!inner(employee_id)')
    .eq('task_assignees.employee_id', ctx.employeeId)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(MAX_ASSIGNMENT_ITEMS),
  supabase
    .from('task_comments')
    .select(
      'id, body, created_at, employee:employee_id(name), task_id, task_group_id, task:task_id(title, task_group_id), taskGroup:task_group_id(name)'
    )
    .neq('employee_id', ctx.employeeId)
    .gte('created_at', lookbackIso)
    .order('created_at', { ascending: false })
    .limit(MAX_COMMENT_ITEMS),
])
```

`toTaskAssignmentFeedItems` の呼び出し部分は変更しない（`assignedResult.data` に余分な `task_assignees` フィールドが含まれるが、`AssignedTaskRow` として使われるのは既存4フィールドのみなので実害はない）。ただし戻り値の型に `task_assignees` が含まれるため、`assignedResult.data ?? []` をそのまま渡すと型エラーになりうる。その場合は以下のように明示キャストする:

```typescript
const assignmentItems = toTaskAssignmentFeedItems(
  (assignedResult.data ?? []) as unknown as AssignedTaskRow[]
)
```

- [ ] **Step 2: 既存のユニットテストを実行し、影響が無いことを確認する**

Run: `node --test src/features/task-management/feed-provider.test.ts`
Expected: 全件PASS（`toTaskAssignmentFeedItems`自体は変更していないため）。

- [ ] **Step 3: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/feed-provider.ts
git commit -m "feat: 担当タスク通知のクエリをtask_assignees経由に変更（要求14）"
```

---

### Task 7: `task_comments.target_employee_id`・RLSヘルパー関数・ポリシー変更（マイグレーション）

**Files:**

- Create: `supabase/migrations/20260910100100_add_task_comments_advice_target.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で自動生成）

**Interfaces:**

- Produces: 列 `task_comments.target_employee_id`、CHECK制約 `task_comments_advice_requires_target`、関数 `is_employee_task_group_manager(group_id, employee_id)`/`is_employee_task_group_member(group_id, employee_id)`/`can_send_advice(group_id, target_employee_id)`、`task_comments_insert` ポリシーの更新

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- 個人宛てアドバイス機能: task_comments に宛先列と、責任者→タスク責任者→メンバーの
-- 一方向送信権限を追加する。
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- is_task_group_owner() / is_task_group_manager()
-- 依存: supabase/migrations/20260907135655_create_task_comments_table.sql の
-- can_comment_on_task() / can_comment_on_task_group()
-- 背景: docs/implementation-plan-task-management.md セクション19.2（Phase 4・要求15）

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS target_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.task_comments.target_employee_id IS
  '宛先従業員（comment_type=adviceのときのみ必須）。運用概念図の「責任者/タスク責任者→個人」への一方向アドバイスを表す';

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_advice_requires_target
  CHECK (
    (comment_type = 'advice' AND target_employee_id IS NOT NULL)
    OR (comment_type <> 'advice' AND target_employee_id IS NULL)
  );

-- 任意の従業員が指定タスクグループのマネージャー/メンバーかどうかを判定する汎用版
-- （既存の is_task_group_manager/is_task_group_member は暗黙に current_employee_id() を
--  対象とするため、宛先=第三者を検査するにはこの汎用版が必要）
CREATE OR REPLACE FUNCTION public.is_employee_task_group_manager(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_managers m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = p_employee_id
  );
$$;

COMMENT ON FUNCTION public.is_employee_task_group_manager(UUID, UUID) IS '指定した従業員が指定したタスクグループのマネージャーかどうか（任意の従業員を検査できる汎用版）';

CREATE OR REPLACE FUNCTION public.is_employee_task_group_member(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_members m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = p_employee_id
  );
$$;

COMMENT ON FUNCTION public.is_employee_task_group_member(UUID, UUID) IS '指定した従業員が指定したタスクグループのメンバーかどうか（任意の従業員を検査できる汎用版）';

-- アドバイス送信権限: 責任者→タスク責任者(マネージャー)、タスク責任者(マネージャー)→メンバー の一方向のみ。
-- マネージャー不在のグループでは責任者からメンバーへの直接送信はできない（意図的な制約、PRDセクション19.2参照）
CREATE OR REPLACE FUNCTION public.can_send_advice(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      public.is_task_group_owner(p_task_group_id)
      AND public.is_employee_task_group_manager(p_task_group_id, p_target_employee_id)
    )
    OR
    (
      public.is_task_group_manager(p_task_group_id)
      AND public.is_employee_task_group_member(p_task_group_id, p_target_employee_id)
    );
$$;

COMMENT ON FUNCTION public.can_send_advice(UUID, UUID) IS 'ログインユーザーが指定した従業員にアドバイスを送信できるか（責任者→タスク責任者、タスク責任者→メンバーの一方向のみ）';

-- task_comments_insert ポリシーを、advice種別のときのみ can_send_advice を追加適用する形に置き換える
DROP POLICY IF EXISTS "task_comments_insert" ON public.task_comments;
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
    AND (
      comment_type <> 'advice'
      OR (
        target_employee_id IS NOT NULL
        AND public.can_send_advice(
          COALESCE(
            task_group_id,
            (SELECT t.task_group_id FROM public.tasks t WHERE t.id = task_id)
          ),
          target_employee_id
        )
      )
    )
  );

COMMENT ON POLICY "task_comments_insert" ON public.task_comments IS
  '投稿者は自分自身。対象（タスク/タスクグループ）への投稿権限に加え、comment_type=adviceの場合はcan_send_adviceによる宛先制限を追加適用する';
```

- [ ] **Step 2: マイグレーションを適用し、型を再生成する**

Run: `supabase migration up && supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: エラーなく適用され、`task_comments` の型に `target_employee_id` が追加される。

- [ ] **Step 3: コミット**

```bash
git add supabase/migrations/20260910100100_add_task_comments_advice_target.sql src/lib/supabase/types.ts
git commit -m "feat: task_commentsに個人宛てアドバイスの宛先・送信権限を追加（要求15）"
```

---

### Task 8: `types.ts`・`actions.ts`・`queries.ts` にadvice宛先対応を追加

**Files:**

- Modify: `src/features/task-management/types.ts`
- Modify: `src/features/task-management/actions.ts`
- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: Task 7の `task_comments.target_employee_id`
- Produces: `CreateCommentInput.targetEmployeeId?: string`、`TaskComment.targetEmployeeId`/`targetEmployeeName`

- [ ] **Step 1: `types.ts` を更新する**

`createCommentSchema` を次のように変更する:

```typescript
export const createCommentSchema = z
  .object({
    taskId: z.string().uuid().optional(),
    taskGroupId: z.string().uuid().optional(),
    parentCommentId: z.string().uuid().optional(),
    commentType: z.enum(COMMENT_TYPES),
    targetEmployeeId: z.string().uuid().optional(),
    body: z.string().min(1).max(2000),
  })
  .refine(data => (data.taskId ? 1 : 0) + (data.taskGroupId ? 1 : 0) === 1, {
    message: 'taskId と taskGroupId はどちらか一方のみ指定する',
  })
  .refine(data => (data.commentType === 'advice' ? Boolean(data.targetEmployeeId) : true), {
    message: 'adviceコメントには宛先（targetEmployeeId）が必須です',
  })
  .refine(data => (data.commentType !== 'advice' ? !data.targetEmployeeId : true), {
    message: 'advice以外のコメントにtargetEmployeeIdは指定できません',
  })
export type CreateCommentInput = z.infer<typeof createCommentSchema>
```

`TaskComment` インターフェースを次のように変更する:

```typescript
export interface TaskComment {
  id: string
  tenantId: string
  taskId: string | null
  taskGroupId: string | null
  employeeId: string
  /** 投稿者の氏名（employees.name が null の場合のフォールバック済み） */
  employeeName: string
  parentCommentId: string | null
  commentType: CommentType
  /** アドバイスの宛先従業員ID（comment_type='advice'のときのみ非null） */
  targetEmployeeId: string | null
  /** アドバイスの宛先氏名（employees.name が null の場合のフォールバック済み） */
  targetEmployeeName: string | null
  body: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: `queries.ts` の `mapComment`・`getTaskComments` を更新する**

```typescript
/** DB行（snake_case、employees とのJOIN込み）を TaskComment（camelCase）に変換する */
function mapComment(
  row: Database['public']['Tables']['task_comments']['Row'] & {
    employee: { name: string | null } | null
    target: { name: string | null } | null
  }
): TaskComment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    taskGroupId: row.task_group_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? '（名前未設定）',
    parentCommentId: row.parent_comment_id,
    commentType: row.comment_type as TaskComment['commentType'],
    targetEmployeeId: row.target_employee_id,
    targetEmployeeName: row.target?.name ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

`getTaskComments` 内のクエリを次のように変更する:

```typescript
export async function getTaskComments(
  supabase: SupabaseClient<Database>,
  target: { taskId: string } | { taskGroupId: string }
): Promise<TaskComment[]> {
  let query = supabase
    .from('task_comments')
    .select('*, employee:employee_id(name), target:target_employee_id(name)')
    .order('created_at', { ascending: true })

  query =
    'taskId' in target
      ? query.eq('task_id', target.taskId)
      : query.eq('task_group_id', target.taskGroupId)

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(mapComment)
}
```

- [ ] **Step 3: `actions.ts` の `createComment` を更新する**

`createComment` 内のinsert呼び出しに `target_employee_id` を追加する:

```typescript
const { data, error } = await supabase
  .from('task_comments')
  .insert({
    tenant_id: user.tenant_id,
    task_id: parsed.taskId ?? null,
    task_group_id: parsed.taskGroupId ?? null,
    employee_id: user.employee_id,
    parent_comment_id: parsed.parentCommentId ?? null,
    comment_type: parsed.commentType,
    target_employee_id: parsed.targetEmployeeId ?? null,
    body: parsed.body,
  })
  .select('id')
  .single()
```

- [ ] **Step 4: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/types.ts src/features/task-management/actions.ts src/features/task-management/queries.ts
git commit -m "feat: コメントのアドバイス宛先(target_employee_id)をデータ層に配線（要求15）"
```

---

### Task 9: `CommentThread.tsx` に宛先ピッカー・宛先バッジを追加し、呼び出し元で `adviceTargets` を算出・配線する

**Files:**

- Modify: `src/features/task-management/components/CommentThread.tsx`
- Modify: `src/features/task-management/components/TaskDetailModal.tsx`
- Modify: `src/features/task-management/components/KanbanBoard.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 8の `CreateCommentInput.targetEmployeeId`・`TaskComment.targetEmployeeId`/`targetEmployeeName`
- Produces: `CommentThread({ ..., adviceTargets })`

- [ ] **Step 1: `CommentThread.tsx` を更新する**

ファイル冒頭のimportに `EmployeePicker` と `EmployeeOption` を追加する:

```typescript
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'
```

`CommentThreadProps` に `adviceTargets` を追加する:

```typescript
interface CommentThreadProps {
  target: { taskId: string } | { taskGroupId: string }
  canPost: boolean
  currentEmployeeId: string | null
  canModerate: boolean
  /** 閲覧者が「助言」コメントを送信できる相手（責任者ならグループのマネージャー、
   * マネージャーならグループのメンバー）。空配列なら助言の選択肢自体を表示しない */
  adviceTargets: EmployeeOption[]
}
```

`CommentThread` 関数のシグネチャと、`CommentItem`・トップレベルの `CommentForm` 呼び出しに `adviceTargets` を渡すように変更する:

```typescript
export function CommentThread({
  target,
  canPost,
  currentEmployeeId,
  canModerate,
  adviceTargets,
}: CommentThreadProps) {
  // ...(state・reload・useEffectは変更なし)...

  return (
    <div className="space-y-3">
      {isLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!isLoading && tree.length === 0 && (
        <p className="text-xs text-slate-400">コメントはまだありません。</p>
      )}
      <ul className="space-y-2">
        {tree.map(node => (
          <CommentItem
            key={node.id}
            node={node}
            target={target}
            replyingToId={replyingToId}
            setReplyingToId={setReplyingToId}
            onPosted={reload}
            currentEmployeeId={currentEmployeeId}
            canModerate={canModerate}
            canPost={canPost}
            adviceTargets={adviceTargets}
          />
        ))}
      </ul>
      {canPost && (
        <CommentForm
          target={target}
          parentCommentId={null}
          onPosted={reload}
          submitLabel="投稿する"
          adviceTargets={adviceTargets}
        />
      )}
    </div>
  )
}
```

`CommentItemProps` に `adviceTargets` を追加し、`CommentItem` 関数のシグネチャ・内部の宛先バッジ表示・再帰呼び出し・返信用`CommentForm`呼び出しを次のように変更する:

```typescript
interface CommentItemProps {
  node: CommentNode
  target: { taskId: string } | { taskGroupId: string }
  replyingToId: string | null
  setReplyingToId: (id: string | null) => void
  onPosted: () => void
  currentEmployeeId: string | null
  canModerate: boolean
  canPost: boolean
  adviceTargets: EmployeeOption[]
}

function CommentItem({
  node,
  target,
  replyingToId,
  setReplyingToId,
  onPosted,
  currentEmployeeId,
  canModerate,
  canPost,
  adviceTargets,
}: CommentItemProps) {
  // ...(state・handleSaveEdit・handleDeleteは変更なし)...

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-900">{node.employeeName}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
          {COMMENT_TYPE_LABEL[node.commentType]}
        </span>
      </div>

      {node.commentType === 'advice' && node.targetEmployeeName && (
        <p className="mt-0.5 text-[10px] font-medium text-[#FD7601]">
          → {node.targetEmployeeName}さんへ
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="mt-1 space-y-1">
          {/* ...(変更なし)... */}
        </form>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{node.body}</p>
      )}

      {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}

      <div className="mt-1 flex gap-2">
        {/* ...(返信・編集・削除ボタンは変更なし)... */}
      </div>

      {canPost && replyingToId === node.id && (
        <div className="mt-2">
          <CommentForm
            target={target}
            parentCommentId={node.id}
            onPosted={() => {
              setReplyingToId(null)
              onPosted()
            }}
            submitLabel="返信する"
            adviceTargets={adviceTargets}
          />
        </div>
      )}
      {node.replies.length > 0 && (
        <ul className="mt-2 space-y-2 border-l border-slate-200 pl-3">
          {node.replies.map(reply => (
            <CommentItem
              key={reply.id}
              node={reply}
              target={target}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onPosted={onPosted}
              currentEmployeeId={currentEmployeeId}
              canModerate={canModerate}
              canPost={canPost}
              adviceTargets={adviceTargets}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
```

`CommentFormProps` に `adviceTargets` を追加し、`CommentForm` を次のように変更する:

```typescript
interface CommentFormProps {
  target: { taskId: string } | { taskGroupId: string }
  parentCommentId: string | null
  onPosted: () => void
  submitLabel: string
  adviceTargets: EmployeeOption[]
}

function CommentForm({
  target,
  parentCommentId,
  onPosted,
  submitLabel,
  adviceTargets,
}: CommentFormProps) {
  const [commentType, setCommentType] = useState<CommentType>('general')
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 宛先が1人もいない閲覧者には「助言」の選択肢自体を出さない
  const availableTypes =
    adviceTargets.length > 0 ? COMMENT_TYPES : COMMENT_TYPES.filter(t => t !== 'advice')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createComment({
          ...('taskId' in target ? { taskId: target.taskId } : { taskGroupId: target.taskGroupId }),
          parentCommentId: parentCommentId ?? undefined,
          commentType,
          targetEmployeeId: commentType === 'advice' ? targetEmployeeId : undefined,
          body,
        })
        setBody('')
        setTargetEmployeeId('')
        setCommentType('general')
        onPosted()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={commentType}
          onChange={e => {
            setCommentType(e.target.value as CommentType)
            setTargetEmployeeId('')
          }}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        >
          {availableTypes.map(type => (
            <option key={type} value={type}>
              {COMMENT_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        {commentType === 'advice' && (
          <div className="w-40">
            <EmployeePicker
              employees={adviceTargets}
              value={targetEmployeeId}
              onChange={setTargetEmployeeId}
              placeholder="宛先を選択"
            />
          </div>
        )}
      </div>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        required
        rows={2}
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !body || (commentType === 'advice' && !targetEmployeeId)}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: `TaskDetailModal.tsx`・`KanbanBoard.tsx` に `adviceTargets` を配線する**

`TaskDetailModal.tsx` の `TaskDetailModalProps` に `adviceTargets: EmployeeOption[]` を追加し、`<CommentThread>` 呼び出しに渡す:

```typescript
interface TaskDetailModalProps {
  // ...(既存props)...
  /** 閲覧者が助言を送信できる相手（KanbanBoard経由でページから配線） */
  adviceTargets: EmployeeOption[]
}
```

```tsx
<CommentThread
  target={{ taskId: task.id }}
  canPost={canOperate}
  currentEmployeeId={currentEmployeeId}
  canModerate={canModerateComments}
  adviceTargets={adviceTargets}
/>
```

`KanbanBoard.tsx` の `KanbanBoardProps` に `adviceTargets: EmployeeOption[]` を追加し、`<TaskDetailModal>` 呼び出しに渡す:

```typescript
interface KanbanBoardProps {
  // ...(既存props)...
  adviceTargets: EmployeeOption[]
}
```

```tsx
<TaskDetailModal
  // ...(既存props)...
  adviceTargets={adviceTargets}
/>
```

- [ ] **Step 3: タスクグループ詳細ページで `adviceTargets` を算出し配線する**

`src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx` に、`employeeNameById` の直後に以下を追加する:

```tsx
// アドバイス送信権限（責任者→タスク責任者、タスク責任者→メンバーの一方向。
// can_send_advice の判定条件と一致させる。セクション19.2参照）
const managerOptions = employees.filter(e => board.managerEmployeeIds.includes(e.id))
const memberOptions = employees.filter(e => board.memberEmployeeIds.includes(e.id))
const adviceTargets = isOwner ? managerOptions : isManager ? memberOptions : []
```

`<KanbanBoard>` 呼び出しに `adviceTargets={adviceTargets}` を追加し、ページ下部のタスクグループ単位の `<CommentThread>` 呼び出しにも同じく追加する:

```tsx
<KanbanBoard
  tasks={board.tasks}
  myEmployeeId={user?.employee_id ?? null}
  canOperateAllTasks={canOperateAllTasks}
  canLogWork={canMemberLogWork}
  employeeNameById={employeeNameById}
  assignableEmployees={assignableEmployees}
  adviceTargets={adviceTargets}
/>
```

```tsx
<CommentThread
  target={{ taskGroupId: board.group.id }}
  canPost={isOwner || isManager}
  currentEmployeeId={user?.employee_id ?? null}
  canModerate={isOwner || isManager}
  adviceTargets={adviceTargets}
/>
```

- [ ] **Step 4: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/components/CommentThread.tsx src/features/task-management/components/TaskDetailModal.tsx src/features/task-management/components/KanbanBoard.tsx "src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx"
git commit -m "feat: コメントUIに個人宛てアドバイスの宛先ピッカー・宛先バッジを追加（要求15）"
```

---

### Task 10: `goal_summary` 列追加・型/Zod拡張・フォーム/表示UIへの反映

**Files:**

- Create: `supabase/migrations/20260910100200_add_task_goal_summary.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で自動生成）
- Modify: `src/features/task-management/types.ts`
- Modify: `src/features/task-management/queries.ts`
- Modify: `src/features/task-management/actions.ts`
- Modify: `src/features/task-management/components/TaskForm.tsx`
- Modify: `src/features/task-management/components/TaskGroupForm.tsx`
- Modify: `src/features/task-management/components/TaskCard.tsx`
- Modify: `src/features/task-management/components/TaskDetailModal.tsx`

**Interfaces:**

- Produces: 列 `tasks.goal_summary`/`task_groups.goal_summary`、`Task.goalSummary`/`TaskGroup.goalSummary`、`CreateTaskInput.goalSummary`/`CreateTaskGroupInput.goalSummary`

- [ ] **Step 1: マイグレーションを作成・適用する**

```sql
-- タスク／タスクグループ単位の「目標（達成基準）」フィールド
-- 背景: docs/implementation-plan-task-management.md セクション19.3（Phase 4・要求16）

ALTER TABLE public.task_groups ADD COLUMN IF NOT EXISTS goal_summary TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS goal_summary TEXT;

COMMENT ON COLUMN public.task_groups.goal_summary IS 'このタスクグループの達成基準（短い一文。例:「改善案の3案を立案」）。descriptionとは別に、運用概念図の「タスクごとの目標」に対応する';
COMMENT ON COLUMN public.tasks.goal_summary IS 'このタスクの達成基準（短い一文）。task_groups.goal_summaryと同じ意図';
```

Run: `supabase migration up && supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] **Step 2: `types.ts` を更新する**

`createTaskSchema`・`createTaskGroupSchema` に `goalSummary` を追加する:

```typescript
export const createTaskGroupSchema = z.object({
  milestoneId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goalSummary: z.string().max(200).optional(),
})
export type CreateTaskGroupInput = z.infer<typeof createTaskGroupSchema>
```

```typescript
export const createTaskSchema = z.object({
  taskGroupId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeEmployeeIds: z.array(z.string().uuid()).max(20).optional().default([]),
  goalSummary: z.string().max(200).optional(),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  dueDate: dateStringSchema.optional(),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>
```

`TaskGroup`・`Task` インターフェースに `goalSummary: string | null` を追加する:

```typescript
export interface TaskGroup {
  id: string
  tenantId: string
  milestoneId: string
  name: string
  description: string | null
  goalSummary: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}
```

```typescript
export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  goalSummary: string | null
  assigneeEmployeeIds: string[]
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}
```

- [ ] **Step 3: `queries.ts` の `mapTaskGroup`・`mapTask` を更新する**

```typescript
function mapTaskGroup(row: Database['public']['Tables']['task_groups']['Row']): TaskGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    milestoneId: row.milestone_id,
    name: row.name,
    description: row.description,
    goalSummary: row.goal_summary,
    status: row.status as TaskGroup['status'],
    sortOrder: row.sort_order,
  }
}
```

`mapTask` の戻り値に `goalSummary: row.goal_summary,` を追加する（`description` の次の行に挿入）。

- [ ] **Step 4: `actions.ts` の `createTask`・`createTaskGroup` を更新する**

`createTaskGroup` のinsertに `goal_summary: parsed.goalSummary ?? null,` を追加する。
`createTask` のinsertに `goal_summary: parsed.goalSummary ?? null,` を追加する。

- [ ] **Step 5: `TaskGroupForm.tsx` に目標入力欄を追加する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTaskGroup } from '../actions'

interface TaskGroupFormProps {
  milestoneId: string
}

export function TaskGroupForm({ milestoneId }: TaskGroupFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [goalSummary, setGoalSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createTaskGroup({ milestoneId, name, goalSummary: goalSummary || undefined })
        setName('')
        setGoalSummary('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクグループの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 mt-2">
      <label className="text-xs font-medium text-slate-700">
        タスクグループ名
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        目標（達成基準）
        <input
          value={goalSummary}
          onChange={e => setGoalSummary(e.target.value)}
          maxLength={200}
          placeholder="例: 改善案の3案を立案"
          className="mt-1 block w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        追加
      </button>
    </form>
  )
}
```

- [ ] **Step 6: `TaskForm.tsx` に目標入力欄を追加する**

`TaskForm.tsx` に `goalSummary` の state・input・`createTask` への受け渡しを追加する（`title` の直後に追加する差分）:

```tsx
const [goalSummary, setGoalSummary] = useState('')
```

```tsx
await createTask({
  taskGroupId,
  title,
  assigneeEmployeeIds,
  goalSummary: goalSummary || undefined,
  priority,
})
setTitle('')
setGoalSummary('')
setAssigneeEmployeeIds([])
```

```tsx
<label className="text-xs font-medium text-slate-700">
  目標（達成基準）
  <input
    value={goalSummary}
    onChange={e => setGoalSummary(e.target.value)}
    maxLength={200}
    placeholder="例: 改善案の3案を立案"
    className="mt-1 block w-56 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
  />
</label>
```

（「タスク名」ラベルの直後、「担当者」ラベルの前に挿入する）

- [ ] **Step 7: `TaskCard.tsx`・`TaskDetailModal.tsx` に表示を追加する**

`TaskCard.tsx` の `<button>` 内、優先度表示の直後に以下を追加する:

```tsx
{
  task.goalSummary && (
    <p className="mt-1 truncate text-[10px] text-slate-500" title={task.goalSummary}>
      目標: {task.goalSummary}
    </p>
  )
}
```

`TaskDetailModal.tsx` の `<dl>`（優先度・期限の2カラムグリッド）の直後に以下を追加する:

```tsx
{
  task.goalSummary && (
    <p className="mt-2 text-xs text-slate-600">
      <span className="text-[10px] text-slate-400">目標: </span>
      {task.goalSummary}
    </p>
  )
}
```

- [ ] **Step 8: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add supabase/migrations/20260910100200_add_task_goal_summary.sql src/lib/supabase/types.ts src/features/task-management/types.ts src/features/task-management/queries.ts src/features/task-management/actions.ts src/features/task-management/components/TaskForm.tsx src/features/task-management/components/TaskGroupForm.tsx src/features/task-management/components/TaskCard.tsx src/features/task-management/components/TaskDetailModal.tsx
git commit -m "feat: タスク/タスクグループに目標(達成基準)フィールドを追加（要求16）"
```

---

### Task 11: `org-tree.ts` に `task`/`task_assignee` ノードを並列追加（純粋関数・ユニットテスト更新）＋ `queries.ts`（`getObjectiveOrgTree`）拡張

**Files:**

- Modify: `src/features/task-management/org-tree.ts`
- Modify: `src/features/task-management/org-tree.test.ts`
- Modify: `src/features/task-management/queries.ts`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 5の `OrgTreeTaskRow.assigneeEmployeeIds`、Task 10の `goal_summary`
- Produces: `OrgTreeNodeRole` に `'task'`/`'task_assignee'` を追加、`OrgTreeNodeData.goalSummary?`、`getObjectiveOrgTree` の戻り値に `task`/`task_assignee` ノードを含める

既存の「責任者→タスクグループ→{マネージャー,メンバー}」構造は変更しない。`task_group` の子として `task` ノードを並列追加し、その子に `task_assignee` ノードを配置する。

- [ ] **Step 1: 新規テストを先に書く（失敗させる）**

`src/features/task-management/org-tree.test.ts` のテストファイル冒頭（1件目のテストの前）に、エッジの `source`/`target` をタプルに変換する小さなヘルパーを追加する（`OrgTreeEdge` は `{id, source, target}` のオブジェクトのため、`.some()` で判定しやすくするための変換）:

```typescript
function edgePairs(edges: { source: string; target: string }[]): [string, string][] {
  return edges.map(e => [e.source, e.target])
}
```

そのうえで、`src/features/task-management/org-tree.test.ts` の末尾（Task 5で追加した複数担当者テストの直後、`layoutOrgTree`のテスト群の前）に、以下のテストを追加する:

```typescript
test('buildOrgTreeGraph: タスクグループの子にtaskノードを並列追加し、その子にtask_assigneeノードを配置する', () => {
  const { nodes, edges } = buildOrgTreeGraph({
    ownerEmployeeId: 'owner-1',
    ownerEmployeeName: '田中',
    groups: [
      {
        taskGroupId: 'g1',
        taskGroupName: '設計チーム',
        managers: [{ employeeId: 'm1', employeeName: '佐藤' }],
        members: [{ employeeId: 'e1', employeeName: '鈴木' }],
      },
    ],
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: '改善立案',
        goalSummary: '改善案の3案を立案',
        assignees: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'm1', employeeName: '佐藤' },
        ],
        progressPercent: 40,
      },
    ],
  })

  const pairs = edgePairs(edges)

  // 既存の group→manager/member エッジは維持されたまま（並列追加）
  assert.ok(pairs.some(([s, t]) => s === 'group:g1' && t === 'manager:g1:m1'))

  const taskNode = nodes.find(n => n.id === 'task:t1')
  assert.deepEqual(taskNode, {
    id: 'task:t1',
    label: '改善立案',
    role: 'task',
    taskCount: 1,
    progressPercent: 40,
    goalSummary: '改善案の3案を立案',
  })
  assert.ok(pairs.some(([s, t]) => s === 'group:g1' && t === 'task:t1'))

  const assignee1 = nodes.find(n => n.id === 'task-assignee:t1:e1')
  const assignee2 = nodes.find(n => n.id === 'task-assignee:t1:m1')
  assert.equal(assignee1?.label, '鈴木')
  assert.equal(assignee1?.role, 'task_assignee')
  assert.equal(assignee2?.label, '佐藤')
  assert.ok(pairs.some(([s, t]) => s === 'task:t1' && t === 'task-assignee:t1:e1'))
  assert.ok(pairs.some(([s, t]) => s === 'task:t1' && t === 'task-assignee:t1:m1'))
})
```

- [ ] **Step 2: 既存の3テスト（Task 5で更新済み）の `tasks` フィクスチャに `id`/`title`/`goalSummary` を追加し、`assigneeEmployeeIds` を `assignees` に置き換える**

Task 5で更新した3つのテスト（「タスクグループ・メンバーごとに...」「同一人物が複数グループに...」「未割当タスクは...」）のタスクフィクスチャを、新しい `OrgTreeTaskRow` 形状に合わせて次のように書き換える。

「タスクグループ・メンバーごとにタスク数と平均進捗率を集計する」テスト内:

```typescript
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 20,
      },
      {
        id: 't2',
        taskGroupId: 'g1',
        title: 'タスク2',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 60,
      },
    ],
```

「同一人物が複数グループに所属する場合、グループごとに別ノードとして独立集計する」テスト内:

```typescript
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 100,
      },
      {
        id: 't2',
        taskGroupId: 'g2',
        title: 'タスク2',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 0,
      },
    ],
```

「未割当タスクはグループ集計に含むが人物集計には含めない」テスト内:

```typescript
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [{ employeeId: 'e1', employeeName: '鈴木' }],
        progressPercent: 100,
      },
      {
        id: 't2',
        taskGroupId: 'g1',
        title: 'タスク2',
        goalSummary: null,
        assignees: [],
        progressPercent: 0,
      },
    ],
```

「1タスクに複数担当者がいる場合、進捗が両方の担当者に計上される」テスト内（Task 5で追加した最新のテスト）:

```typescript
    tasks: [
      {
        id: 't1',
        taskGroupId: 'g1',
        title: 'タスク1',
        goalSummary: null,
        assignees: [
          { employeeId: 'e1', employeeName: '鈴木' },
          { employeeId: 'e2', employeeName: '高橋' },
        ],
        progressPercent: 80,
      },
    ],
```

- [ ] **Step 3: テストを実行し、失敗を確認する**

Run: `node --test src/features/task-management/org-tree.test.ts`
Expected: `OrgTreeTaskRow` の形状不一致で型エラーまたは実行時失敗。

- [ ] **Step 4: `org-tree.ts` を実装する**

`OrgTreeNodeRole`・`OrgTreeNodeData`・`OrgTreeTaskRow` を次のように変更する:

```typescript
export type OrgTreeNodeRole =
  | 'owner'
  | 'task_group'
  | 'manager'
  | 'member'
  | 'task'
  | 'task_assignee'

export interface OrgTreeNodeData {
  id: string
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  /** role='task'のときのみ設定される達成基準（要求16のgoal_summary） */
  goalSummary?: string | null
}
```

```typescript
export interface OrgTreeTaskRow {
  id: string
  taskGroupId: string
  title: string
  goalSummary: string | null
  assignees: OrgTreeEmployeeRef[]
  progressPercent: number
}
```

`taskGroupNodeId`・`managerNodeId`・`memberNodeId` の下に、以下の2関数を追加する:

```typescript
function taskNodeId(taskId: string): string {
  return `task:${taskId}`
}

function taskAssigneeNodeId(taskId: string, employeeId: string): string {
  return `task-assignee:${taskId}:${employeeId}`
}
```

`buildOrgTreeGraph` 内の `personProgressByKey`・`personTaskCountByKey` の計算を、`assigneeEmployeeIds` から `assignees` に合わせて次のように変更する:

```typescript
const personKeys: string[] = []
for (const group of input.groups) {
  for (const person of [...group.managers, ...group.members]) {
    personKeys.push(`${group.taskGroupId}:${person.employeeId}`)
  }
}
const personProgressByKey = groupProgressByParent(
  input.tasks.flatMap(t =>
    t.assignees.map(assignee => ({
      value: t.progressPercent,
      parentId: `${t.taskGroupId}:${assignee.employeeId}`,
    }))
  ),
  personKeys
)

const personTaskCountByKey = new Map<string, number>()
for (const task of input.tasks) {
  for (const assignee of task.assignees) {
    const key = `${task.taskGroupId}:${assignee.employeeId}`
    personTaskCountByKey.set(key, (personTaskCountByKey.get(key) ?? 0) + 1)
  }
}
```

`groupTaskCountById`・`groupProgressById` の計算（既存の `input.tasks.map(t => t.taskGroupId)` 等）はフィールド名が変わっていないため変更不要。

`for (const group of input.groups) { ... }` ループの最後（メンバーノード追加ループの直後）に、タスクノード・担当者ノードの並列追加を挿入する:

```typescript
const tasksByGroupId = new Map<string, OrgTreeTaskRow[]>()
for (const task of input.tasks) {
  const list = tasksByGroupId.get(task.taskGroupId) ?? []
  list.push(task)
  tasksByGroupId.set(task.taskGroupId, list)
}

for (const group of input.groups) {
  const groupNodeId = taskGroupNodeId(group.taskGroupId)
  // ...(既存のグループノード・マネージャーノード・メンバーノード追加コードは変更なし)...

  // ここから追加: タスクグループの子として task ノードを並列追加し、
  // その子に task_assignee ノードを配置する（既存のmanager/member並列構造は維持）
  for (const task of tasksByGroupId.get(group.taskGroupId) ?? []) {
    const taskNode = taskNodeId(task.id)
    nodes.push({
      id: taskNode,
      label: task.title,
      role: 'task',
      taskCount: 1,
      progressPercent: task.progressPercent,
      goalSummary: task.goalSummary,
    })
    edges.push({ id: `${groupNodeId}->${taskNode}`, source: groupNodeId, target: taskNode })

    for (const assignee of task.assignees) {
      const assigneeNode = taskAssigneeNodeId(task.id, assignee.employeeId)
      nodes.push({
        id: assigneeNode,
        label: assignee.employeeName,
        role: 'task_assignee',
        taskCount: 1,
        progressPercent: task.progressPercent,
      })
      edges.push({ id: `${taskNode}->${assigneeNode}`, source: taskNode, target: assigneeNode })
    }
  }
}
```

（既存の `groupTaskCountById`/`groupProgressById`/`personProgressByKey`/`personTaskCountByKey` を使ったグループ・マネージャー・メンバーノードの`push`コードはこの追加ブロックの前に既存のまま残す。1つの `for (const group of input.groups)` ループの中で、既存コードの後ろに追加ブロックを続ける形になる）

- [ ] **Step 5: テストを実行し、成功を確認する**

Run: `node --test src/features/task-management/org-tree.test.ts`
Expected: 全件PASS。

- [ ] **Step 6: `queries.ts` の `getObjectiveOrgTree` を更新する**

タスク取得クエリを次のように変更する（`title`・`goal_summary`・`task_assignees(employee_id, employee:employee_id(name))` を追加取得する）:

```typescript
let taskRows: {
  id: string
  task_group_id: string
  title: string
  goal_summary: string | null
  progress_percent: number
  task_assignees: { employee_id: string; employee: { name: string | null } | null }[] | null
}[] = []
```

```typescript
taskRows = await fetchAllRows(async (from, to) => {
  const result = await supabase
    .from('tasks')
    .select(
      'id, task_group_id, title, goal_summary, progress_percent, task_assignees(employee_id, employee:employee_id(name))'
    )
    .in('task_group_id', groupIds)
    .order('id', { ascending: true })
    .range(from, to)
  return { data: result.data, error: result.error }
})
```

`tasks: OrgTreeTaskRow[]` への変換部分を次のように変更する:

```typescript
const tasks: OrgTreeTaskRow[] = taskRows.map(row => ({
  id: row.id,
  taskGroupId: row.task_group_id,
  title: row.title,
  goalSummary: row.goal_summary,
  assignees: (row.task_assignees ?? []).map(a => ({
    employeeId: a.employee_id,
    employeeName: a.employee?.name ?? '（名前未設定）',
  })),
  progressPercent: row.progress_percent,
}))
```

- [ ] **Step 7: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/org-tree.ts src/features/task-management/org-tree.test.ts src/features/task-management/queries.ts
git commit -m "feat: 組織ツリーにtask/task_assigneeノードを並列追加（要求17）"
```

---

### Task 12: 未読アドバイスバッジ集計関数・`OrgTreeNodeCard.tsx` 表示反映

**Files:**

- Modify: `src/features/task-management/queries.ts`
- Modify: `src/features/task-management/org-tree.ts`
- Modify: `src/features/task-management/components/OrgTreeNodeCard.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 7の `task_comments.target_employee_id`、既存の `dashboard_feed_read_state`（`20260821090000_create_dashboard_feed_read_state.sql`）
- Produces: `getUnreadAdviceCountsByTask(supabase, taskIds, currentEmployeeId)`、`OrgTreeNodeData.unreadAdviceCount?`

- [ ] **Step 1: `queries.ts` に未読アドバイス集計関数を追加する**

`getObjectiveOrgTree` の直前に、以下を追加する:

```typescript
/**
 * 指定したタスクID群のうち、閲覧者（currentEmployeeId）宛ての未読adviceコメント件数を
 * タスクID単位で集計する。既存の `/top` 通知フィードで使っている
 * `dashboard_feed_read_state`（従業員×dedupe_key単位の既読管理）をそのまま再利用し、
 * 新規テーブルは追加しない。task_comments と dashboard_feed_read_state は
 * FK関係を持たない（dedupe_keyは導出キーのため）ため、埋め込みJOINは使えず、
 * 2回のクエリをJS側で突き合わせる。
 */
export async function getUnreadAdviceCountsByTask(
  supabase: SupabaseClient<Database>,
  taskIds: string[],
  currentEmployeeId: string
): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {}

  const { data: adviceRows, error: adviceError } = await supabase
    .from('task_comments')
    .select('id, task_id')
    .in('task_id', taskIds)
    .eq('comment_type', 'advice')
    .eq('target_employee_id', currentEmployeeId)

  if (adviceError) throw adviceError
  if (!adviceRows || adviceRows.length === 0) return {}

  const dedupeKeys = adviceRows.map(row => `task_management:comment:${row.id}`)

  const { data: readRows, error: readError } = await supabase
    .from('dashboard_feed_read_state')
    .select('dedupe_key')
    .eq('employee_id', currentEmployeeId)
    .in('dedupe_key', dedupeKeys)

  if (readError) throw readError

  const readKeySet = new Set((readRows ?? []).map(r => r.dedupe_key))

  const counts: Record<string, number> = {}
  for (const row of adviceRows) {
    if (!row.task_id) continue
    if (readKeySet.has(`task_management:comment:${row.id}`)) continue
    counts[row.task_id] = (counts[row.task_id] ?? 0) + 1
  }

  return counts
}
```

- [ ] **Step 2: `getObjectiveOrgTree` に `currentEmployeeId` 引数を追加し、未読件数をノードへマージする**

`getObjectiveOrgTree` のシグネチャを次のように変更する:

```typescript
export async function getObjectiveOrgTree(
  supabase: SupabaseClient<Database>,
  objectiveId: string,
  currentEmployeeId: string | null
): Promise<OrgTree> {
```

関数末尾の `buildOrgTreeGraph` 呼び出しと `return` 部分を次のように変更する（`taskRows` から取得済みのタスクID一覧を使って未読件数を取得し、`role === 'task'` のノードにマージする）:

```typescript
const { nodes, edges } = buildOrgTreeGraph({
  ownerEmployeeId: objectiveRow.owner_employee_id,
  ownerEmployeeName: ownerRow.name ?? '（名前未設定）',
  groups,
  tasks,
})

const unreadAdviceCountsByTaskId = currentEmployeeId
  ? await getUnreadAdviceCountsByTask(
      supabase,
      tasks.map(t => t.id),
      currentEmployeeId
    )
  : {}

const nodesWithUnread = nodes.map(node =>
  node.role === 'task'
    ? { ...node, unreadAdviceCount: unreadAdviceCountsByTaskId[node.id.replace('task:', '')] ?? 0 }
    : node
)

return {
  nodes: layoutOrgTree(nodesWithUnread, edges, ORG_TREE_ROOT_ID),
  edges,
}
```

`OrgTreeTaskRow` に `id` フィールドが既にTask 11で追加済みのため、`tasks.map(t => t.id)` はそのまま使える。

- [ ] **Step 3: `org-tree.ts` の `OrgTreeNodeData` に `unreadAdviceCount` を追加する**

```typescript
export interface OrgTreeNodeData {
  id: string
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  goalSummary?: string | null
  /** role='task'のときのみ設定される、閲覧者宛ての未読adviceコメント件数 */
  unreadAdviceCount?: number
}
```

- [ ] **Step 4: `OrgTreeNodeCard.tsx` にバッジ表示を追加する**

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ProgressBar } from './ProgressBar'
import { Badge } from '@/components/ui/Badge'
import type { OrgTreeNodeRole } from '../org-tree'

export interface OrgTreeNodeCardData {
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  goalSummary?: string | null
  unreadAdviceCount?: number
  [key: string]: unknown
}

const ROLE_LABEL: Record<OrgTreeNodeRole, string> = {
  owner: '責任者',
  task_group: 'タスクグループ',
  manager: 'マネージャー',
  member: 'メンバー',
  task: 'タスク',
  task_assignee: '担当者',
}

const ROLE_BADGE_VARIANT: Record<OrgTreeNodeRole, 'primary' | 'teal' | 'orange' | 'neutral'> = {
  owner: 'orange',
  task_group: 'neutral',
  manager: 'teal',
  member: 'primary',
  task: 'teal',
  task_assignee: 'primary',
}

/** 組織ツリーの1ノード（責任者・タスクグループ・マネージャー・メンバー・タスク・タスク担当者）を表すカード */
export function OrgTreeNodeCard({ data }: NodeProps) {
  const { label, role, taskCount, progressPercent, goalSummary, unreadAdviceCount } =
    data as unknown as OrgTreeNodeCardData

  return (
    <div className="w-44 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <div className="flex items-center justify-between">
        <Badge variant={ROLE_BADGE_VARIANT[role]} className="!px-2 !py-0.5 !text-[10px]">
          {ROLE_LABEL[role]}
        </Badge>
        {Boolean(unreadAdviceCount) && (
          <span className="rounded-full bg-[#FD7601] px-1.5 py-0.5 text-[9px] font-semibold text-white">
            未読アドバイス {unreadAdviceCount}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-900" title={label}>
        {label}
      </p>
      {goalSummary && (
        <p className="mt-0.5 truncate text-[10px] text-slate-500" title={goalSummary}>
          目標: {goalSummary}
        </p>
      )}
      <p className="mt-1 text-[10px] text-slate-500">担当タスク {taskCount}件</p>
      <div className="mt-1">
        <ProgressBar progress={progressPercent} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  )
}
```

- [ ] **Step 5: 目標詳細ページで `getObjectiveOrgTree` に `currentEmployeeId` を渡す**

`src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx` の `getObjectiveOrgTree` 呼び出しを次のように変更する:

```tsx
const orgTree = await getObjectiveOrgTree(supabase, id, user?.employee_id ?? null)
```

- [ ] **Step 6: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add src/features/task-management/queries.ts src/features/task-management/org-tree.ts src/features/task-management/components/OrgTreeNodeCard.tsx "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"
git commit -m "feat: 組織ツリーのtaskノードに未読アドバイスバッジを表示（要求17）"
```

---

### Task 13: `task_groups_update` RLS拡張・`updateTaskGroup`・`TaskGroupEditForm`（要求18）

運用フロー図（プロジェクトの開始・運営）の精査で判明した齟齬への対応。現状`task_groups`を更新できるのは責任者のみで、しかも更新用のServer Action自体が存在しない。図が想定する「タスクマネージャーがアサインされたタスクの目標を設定する」を実現する。

**Files:**

- Create: `supabase/migrations/20260910100400_grant_task_group_manager_update.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で自動生成）
- Modify: `src/features/task-management/types.ts`
- Modify: `src/features/task-management/actions.ts`
- Create: `src/features/task-management/components/TaskGroupEditForm.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`

**Interfaces:**

- Consumes: Task 10の `TaskGroup.goalSummary`
- Produces: `UpdateTaskGroupInput`、`updateTaskGroup` Server Action、`TaskGroupEditForm({ group })`

- [ ] **Step 1: マイグレーションを作成・適用する**

```sql
-- タスクグループの名前・説明・目標をマネージャーも編集できるようにする（責任者の権限は維持したまま拡張）。
-- 背景: docs/implementation-plan-task-management.md セクション19.5（Phase 4・要求18）
-- 運用フロー図「タスクマネージャーはアサインされたタスクの目標を設定する」に対応する。
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- is_task_group_owner() / is_task_group_manager()

DROP POLICY IF EXISTS "task_groups_update" ON public.task_groups;
CREATE POLICY "task_groups_update" ON public.task_groups
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(id)
      OR public.is_task_group_manager(id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

COMMENT ON POLICY "task_groups_update" ON public.task_groups IS
  '責任者に加えてマネージャーも更新できる（Phase4要求18で拡張。名前・説明・目標(goal_summary)の編集をマネージャーに開放するため）';
```

Run: `supabase migration up && supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] **Step 2: `types.ts` に `updateTaskGroupSchema` を追加する**

`createTaskGroupSchema` の直後に、以下を追加する:

```typescript
export const updateTaskGroupSchema = z.object({
  taskGroupId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goalSummary: z.string().max(200).optional(),
})
export type UpdateTaskGroupInput = z.infer<typeof updateTaskGroupSchema>
```

- [ ] **Step 3: `actions.ts` に `updateTaskGroup` を追加する**

`createTaskGroup` の直後（`assignManager` の直前）に、以下を追加する:

```typescript
/**
 * タスクグループ（task_groups）の名前・説明・目標（達成基準）を更新する。
 * 更新可否（責任者・マネージャー）は RLS の task_groups UPDATE ポリシーが強制する
 * （Phase4要求18でマネージャーにも拡張済み）。0件更新時はエラーを投げる（updateTaskStatus等と同じパターン）。
 */
export async function updateTaskGroup(input: UpdateTaskGroupInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskGroupSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_groups')
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      goal_summary: parsed.goalSummary ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.taskGroupId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクグループを編集する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}
```

`actions.ts` 冒頭のimportに `updateTaskGroupSchema, type UpdateTaskGroupInput` を追加する。

- [ ] **Step 4: `TaskGroupEditForm.tsx` を作成する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskGroup } from '../actions'
import type { TaskGroup } from '../types'

interface TaskGroupEditFormProps {
  group: TaskGroup
}

/**
 * タスクグループの名前・説明・目標（達成基準）を編集するインラインフォーム。
 * 責任者・マネージャーいずれも編集可（task_groups_updateのRLSが最終防衛、要求18）。
 * 運用フロー図の「マネージャーがアサインされたタスクの目標を設定する」に対応する。
 */
export function TaskGroupEditForm({ group }: TaskGroupEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [goalSummary, setGoalSummary] = useState(group.goalSummary ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskGroup({
          taskGroupId: group.id,
          name,
          description: description || undefined,
          goalSummary: goalSummary || undefined,
        })
        setIsEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクグループの更新に失敗しました')
      }
    })
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-[10px] text-[#FD7601]"
      >
        編集
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
      <label className="block text-xs font-medium text-slate-700">
        タスクグループ名
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        説明
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        目標（達成基準）
        <input
          value={goalSummary}
          onChange={e => setGoalSummary(e.target.value)}
          maxLength={200}
          placeholder="例: 改善案の3案を立案"
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-slate-500"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: タスクグループ詳細ページに配線する**

`src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx` の冒頭importに以下を追加する:

```tsx
import { TaskGroupEditForm } from '@/features/task-management/components/TaskGroupEditForm'
```

ページ見出し部分（`<h1>{board.group.name}</h1>` を含む `<div className="flex items-center justify-between">` ブロック）の直後に、以下を追加する:

```tsx
{
  ;(isOwner || isManager) && <TaskGroupEditForm group={board.group} />
}
```

- [ ] **Step 6: 型チェック・Lintを実行し、コミット**

Run: `npm run type-check && npm run lint`

```bash
git add supabase/migrations/20260910100400_grant_task_group_manager_update.sql src/lib/supabase/types.ts src/features/task-management/types.ts src/features/task-management/actions.ts src/features/task-management/components/TaskGroupEditForm.tsx "src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx"
git commit -m "feat: タスクグループの目標・名前・説明をマネージャーも編集可能にする（要求18）"
```

---

### Task 14: [最終・ユーザー承認必須] `tasks.assignee_employee_id` 列の削除

**この タスクは、Task 1〜13がすべて完了し、本番相当のデータで複数担当者機能が問題なく動作することを確認したあとにのみ実施する。実行前に必ずユーザーに影響件数を提示し、明示的な承認を得ること（CLAUDE.mdのデータ保護ルール、絶対禁止表の「`WHERE`句のない`DELETE`/`UPDATE`」に準じる慎重さで扱う。列削除もスキーマ上不可逆な操作である）。**

**Files:**

- Create: `supabase/migrations/20260910100300_drop_tasks_assignee_employee_id.sql`
- Modify: `src/lib/supabase/types.ts`（`supabase gen types` で自動生成）

- [ ] **Step 1: 影響件数を確認し、ユーザーに提示する**

Run（Studio SQL Editor等で実行）:

```sql
SELECT COUNT(*) FROM tasks WHERE assignee_employee_id IS NOT NULL;
```

この結果件数と、「これらの値は既に `task_assignees` にバックフィル済みであり、アプリケーションコードはTask 2以降 `assignee_employee_id` を一切参照していない」ことをユーザーに提示し、列削除の実行許可を得る。

- [ ] **Step 2: ユーザーの承認が得られたら、マイグレーションを作成する**

```sql
-- tasks.assignee_employee_id（単一担当者、Phase 4で task_assignees に置き換え済み）を削除する。
-- 実行前提: task_assignees へのバックフィルが完了しており（Task 1）、
-- アプリケーションコードは Task 2 以降この列を一切参照していないことをユーザーが確認済み。
-- 背景: docs/implementation-plan-task-management.md セクション19.1（Phase 4・要求14）

ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_employee_id;
```

- [ ] **Step 3: マイグレーションを適用し、型を再生成する**

Run: `supabase migration up && supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] **Step 4: 全体テスト・型チェックを実行する**

Run: `npm run type-check && npm run lint && node --test src/features/task-management/*.test.ts`
Expected: 全件エラーなし・PASS。

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/20260910100300_drop_tasks_assignee_employee_id.sql src/lib/supabase/types.ts
git commit -m "chore: task_assigneesへの移行完了に伴いtasks.assignee_employee_id列を削除（要求14最終ステップ）"
```

---

## 完了後の確認事項（PRD更新）

全タスク完了後、`docs/implementation-plan-task-management.md` セクション19.6の実装ステータス表を「未着手」から「完了」に更新し、セクション12の実装ステータス表のPhase 4行を「完了」に更新する。
