# タスク管理 Phase 5（目標中心シンプルUI）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/tasks/objectives/new`と`/tasks/objectives/[id]`を「目標→タスクの直接作成」に見せるシンプルUIに再構成し、既存のマイルストーン・タスクグループのデータモデルは裏側に隠したまま流用する。

**Architecture:** 目標作成時に裏でデフォルトのマイルストーン・タスクグループを自動生成する。`task_assignees`に`role`列（`responsible`/`member`）を追加し、タスク責任者（`is_manager=true`限定・1人）とメンバー（複数）を区別する。責任者・メンバーは既存RLSの可視性を満たすため、同時に`task_group_managers`/`task_group_members`にも同期登録する。コミュニケーションは既存の`advice`（上→下）に加え、`suggestion`/`report`（下→上）を同じ設計パターンで追加する。

**Tech Stack:** Next.js 16 (App Router) + React 19, TypeScript (strict: false), Supabase (PostgreSQL + RLS), Zod v4, Recharts, `@xyflow/react`, `node:test` + `node:assert/strict`

**Spec:** `docs/superpowers/specs/2026-09-11-task-management-phase5-design.md`

## Global Constraints

- コードコメントは日本語で記述する
- パスエイリアス `@/*` → `./src/*`
- `page.tsx`に`supabase.from(...)`を直接書かない。SELECTは`queries.ts`、INSERT/UPDATE/DELETEは`actions.ts`（Server Actions）に集約する
- マイグレーションは`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`を使い、既存データを破壊しない。破壊的操作（DROP等）はユーザー承認なしに行わない
- テストは`node:test` + `node:assert/strict`。実行コマンド: `npm run test`
- 型チェック: `npm run type-check`（内部的に`tsc --noEmit`相当）
- ローカルSupabase接続: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres`
- マイグレーションファイル名は`YYYYMMDDHHMMSS_snake_case_description.sql`形式。直近の最新は`20260910100500_...`なので、本計画のマイグレーションは`20260911100000`以降の連番タイムスタンプを使う
- HR-DX Design System準拠（ブランドカラー `#FD7601`、hairlineボーダー `#e2e6ec`、Lucideアイコン）

---

### Task 1: `task_assignees`へのrole列追加とRLS拡張

**Files:**

- Create: `supabase/migrations/20260911100000_add_task_assignees_role.sql`

**Interfaces:**

- Produces: `task_assignees.role`列（`'responsible' | 'member'`、デフォルト`'member'`）、1タスク1responsible制約、responsibleは`is_manager=true`限定のRLS制約

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- supabase/migrations/20260911100000_add_task_assignees_role.sql
ALTER TABLE public.task_assignees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

ALTER TABLE public.task_assignees
  ADD CONSTRAINT task_assignees_role_check
  CHECK (role IN ('responsible', 'member'));

-- 1タスクにつき responsible は最大1人
CREATE UNIQUE INDEX IF NOT EXISTS task_assignees_one_responsible_per_task
  ON public.task_assignees (task_id)
  WHERE role = 'responsible';

-- 既存の task_assignees_insert ポリシーを、role='responsible' は is_manager=true の
-- 従業員のみ許可する条件を追加して置き換える（責任者・マネージャーのみ挿入可という既存条件は維持）
DROP POLICY IF EXISTS "task_assignees_insert" ON public.task_assignees;
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
    AND (
      role = 'member'
      OR (
        role = 'responsible'
        AND EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = task_assignees.employee_id AND e.is_manager = true
        )
      )
    )
  );
```

- [ ] **Step 2: マイグレーションを適用する**

Run: `supabase migration up`

- [ ] **Step 3: スキーマとRLSを読み取り専用で確認する**

Run:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "\d task_assignees"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "SELECT polname, pg_get_expr(polwithcheck, polrelid) FROM pg_policy WHERE polrelid = 'task_assignees'::regclass AND polcmd = 'a';"
```

Expected: `role`列が`NOT NULL DEFAULT 'member'`で存在し、`task_assignees_role_check`制約と`task_assignees_one_responsible_per_task`ユニークインデックスが表示され、`task_assignees_insert`のWITH CHECKにrole条件が含まれること

- [ ] **Step 4: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/20260911100000_add_task_assignees_role.sql src/lib/supabase/types.ts
git commit -m "feat: task_assigneesにresponsible/member役割列を追加"
```

---

### Task 2: `task_comments`の宛先制約をsuggestion/reportに拡張

**Files:**

- Create: `supabase/migrations/20260911100100_extend_task_comments_targets.sql`

**Interfaces:**

- Consumes: 既存の`is_task_group_owner`, `is_task_group_manager`, `is_employee_task_group_manager`, `is_employee_task_group_member`, `task_group_id_for_task`（`supabase/migrations/20260907032410_create_task_management_tables.sql`, `20260910100100_add_task_comments_advice_target.sql`）
- Produces: `can_send_suggestion(p_task_group_id UUID, p_target_employee_id UUID)`, `can_send_report(p_task_group_id UUID, p_target_employee_id UUID)`関数。`task_comments_advice_requires_target`制約を`advice`/`suggestion`/`report`共通の宛先必須制約に置き換え。`task_comments_insert`/`task_comments_update`のRLSを拡張

**設計メモ（design.mdセクション4より）**: `suggestion`はメンバー→タスク責任者(マネージャー) または タスク責任者(マネージャー)→目標責任者(オーナー)の**両方向**を許可する。`report`はタスク責任者(マネージャー)→目標責任者(オーナー)のみ。

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- supabase/migrations/20260911100100_extend_task_comments_targets.sql

-- 1. 宛先必須の対象を advice だけでなく suggestion / report にも広げる
ALTER TABLE public.task_comments
  DROP CONSTRAINT IF EXISTS task_comments_advice_requires_target;

ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_directed_types_require_target
  CHECK (
    (comment_type IN ('advice', 'suggestion', 'report') AND target_employee_id IS NOT NULL)
    OR (comment_type = 'general' AND target_employee_id IS NULL)
  );

-- 2. suggestion: メンバー→マネージャー、または マネージャー→オーナー の両方向
CREATE OR REPLACE FUNCTION public.can_send_suggestion(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (
      public.is_task_group_member(p_task_group_id)
      AND public.is_employee_task_group_manager(p_task_group_id, p_target_employee_id)
    )
    OR
    (
      public.is_task_group_manager(p_task_group_id)
      AND public.is_employee_task_group_owner(p_task_group_id, p_target_employee_id)
    );
$$;

-- 3. report: マネージャー→オーナー のみ
CREATE OR REPLACE FUNCTION public.can_send_report(p_task_group_id UUID, p_target_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_task_group_manager(p_task_group_id)
    AND public.is_employee_task_group_owner(p_task_group_id, p_target_employee_id);
$$;

-- 4. is_employee_task_group_owner: 任意の従業員がそのタスクグループの目標責任者かを判定
--    （既存の is_employee_task_group_manager / is_employee_task_group_member と対称なヘルパー）
CREATE OR REPLACE FUNCTION public.is_employee_task_group_owner(p_task_group_id UUID, p_employee_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_groups g
    JOIN public.task_milestones ms ON ms.id = g.milestone_id
    JOIN public.task_objectives o ON o.id = ms.objective_id
    WHERE g.id = p_task_group_id AND o.owner_employee_id = p_employee_id
  );
$$;

-- 5. task_comments_insert / task_comments_update に suggestion / report の権限チェックを追加
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
      comment_type = 'general'
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE
  USING (tenant_id = public.current_tenant_id() AND employee_id = public.current_employee_id())
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
    AND (
      comment_type = 'general'
      OR (comment_type = 'advice' AND target_employee_id IS NOT NULL
          AND public.can_send_advice(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'suggestion' AND target_employee_id IS NOT NULL
          AND public.can_send_suggestion(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
      OR (comment_type = 'report' AND target_employee_id IS NOT NULL
          AND public.can_send_report(COALESCE(task_group_id, public.task_group_id_for_task(task_id)), target_employee_id))
    )
  );
```

**注意（過去の実績を踏まえる）**: `20260910100500_harden_task_comments_update_advice_check.sql`は「UPDATE側だけadviceチェックの更新が漏れてバイパスが発生した」修正コミット。本タスクはINSERTとUPDATEの両方に同じ条件を必ず反映させる。

- [ ] **Step 2: マイグレーションを適用する**

Run: `supabase migration up`

- [ ] **Step 3: RLSの内容を読み取り専用で確認する**

Run:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "SELECT polname, pg_get_expr(polwithcheck, polrelid) FROM pg_policy WHERE polrelid = 'task_comments'::regclass AND polcmd IN ('a','w');"
```

Expected: `task_comments_insert`と`task_comments_update`の両方に`suggestion`/`report`の条件が含まれること

- [ ] **Step 4: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/20260911100100_extend_task_comments_targets.sql src/lib/supabase/types.ts
git commit -m "feat: task_commentsのsuggestion/report宛先送信権限を追加"
```

---

### Task 3: types.ts の型・スキーマ拡張

**Files:**

- Modify: `src/features/task-management/types.ts`
- Test: `src/features/task-management/types.test.ts`

**Interfaces:**

- Consumes: なし（型定義のみ）
- Produces:
  - `ASSIGNEE_ROLES = ['responsible', 'member'] as const`, `AssigneeRole`型
  - `Task`インターフェースに`responsibleEmployeeId: string | null`, `memberEmployeeIds: string[]`を追加（既存`assigneeEmployeeIds: string[]`は維持、破壊的変更なし）
  - `addTaskAssigneeSchema`に`role: z.enum(ASSIGNEE_ROLES).default('member')`を追加
  - `createCommentSchema`の宛先必須ルールを`advice`だけでなく`suggestion`/`report`にも拡張
  - `createSimpleTaskSchema`（Phase5専用の新規タスク作成スキーマ）: `{ taskGroupId: string (uuid), title: string, goalSummary?: string, dueDate?: string, responsibleEmployeeId: string (uuid) }`

- [ ] **Step 1: 失敗するテストを書く（`types.test.ts`に追記）**

```ts
import { addTaskAssigneeSchema, createCommentSchema, createSimpleTaskSchema } from './types'

test('addTaskAssigneeSchemaはroleを省略するとmemberになる', () => {
  const parsed = addTaskAssigneeSchema.parse({
    taskId: '11111111-1111-1111-1111-111111111111',
    employeeId: '22222222-2222-2222-2222-222222222222',
  })
  assert.equal(parsed.role, 'member')
})

test('createCommentSchemaはsuggestionにtargetEmployeeIdが無いと失敗する', () => {
  assert.throws(() =>
    createCommentSchema.parse({
      taskGroupId: '11111111-1111-1111-1111-111111111111',
      commentType: 'suggestion',
      body: 'テスト',
    })
  )
})

test('createCommentSchemaはreportにtargetEmployeeIdがあれば成功する', () => {
  const parsed = createCommentSchema.parse({
    taskGroupId: '11111111-1111-1111-1111-111111111111',
    commentType: 'report',
    targetEmployeeId: '22222222-2222-2222-2222-222222222222',
    body: 'テスト',
  })
  assert.equal(parsed.commentType, 'report')
})

test('createSimpleTaskSchemaはresponsibleEmployeeId必須', () => {
  assert.throws(() =>
    createSimpleTaskSchema.parse({
      taskGroupId: '11111111-1111-1111-1111-111111111111',
      title: 'タスク',
    })
  )
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm run test -- --test-name-pattern="addTaskAssigneeSchema|createCommentSchema|createSimpleTaskSchema"`
Expected: FAIL（`createSimpleTaskSchema`が存在しない、または宛先ルールが`advice`限定のためsuggestion/reportのテストが期待通りに失敗/成功しない）

- [ ] **Step 3: `types.ts`を実装する**

`ASSIGNEE_ROLES`と`AssigneeRole`を`TASK_STATUSES`定義の近くに追加:

```ts
export const ASSIGNEE_ROLES = ['responsible', 'member'] as const
export type AssigneeRole = (typeof ASSIGNEE_ROLES)[number]
```

既存の`Task`インターフェースを変更（`assigneeEmployeeIds`は維持、2フィールド追加）:

```ts
export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  goalSummary: string | null
  createdByEmployeeId: string
  assigneeEmployeeIds: string[]
  responsibleEmployeeId: string | null
  memberEmployeeIds: string[]
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}
```

既存の`addTaskAssigneeSchema`を変更:

```ts
export const addTaskAssigneeSchema = z.object({
  taskId: z.string().uuid(),
  employeeId: z.string().uuid(),
  role: z.enum(ASSIGNEE_ROLES).default('member'),
})
export type AddTaskAssigneeInput = z.infer<typeof addTaskAssigneeSchema>
```

既存の`createCommentSchema`の`.refine()`群を変更（`advice`限定から`advice`/`suggestion`/`report`に拡張。既存の3つの`.refine`のうち宛先関連の2つを書き換える）:

```ts
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
  .refine(
    data =>
      !(['advice', 'suggestion', 'report'] as const).includes(
        data.commentType as 'advice' | 'suggestion' | 'report'
      ) || Boolean(data.targetEmployeeId),
    { message: 'advice/suggestion/report には targetEmployeeId が必須' }
  )
  .refine(data => data.commentType !== 'general' || !data.targetEmployeeId, {
    message: 'general には targetEmployeeId を指定できない',
  })
```

新規に`createSimpleTaskSchema`を`createTaskSchema`の直後に追加:

```ts
export const createSimpleTaskSchema = z.object({
  taskGroupId: z.string().uuid(),
  title: z.string().min(1).max(200),
  goalSummary: z.string().max(200).optional(),
  dueDate: dateStringSchema.optional(),
  responsibleEmployeeId: z.string().uuid(),
})
export type CreateSimpleTaskInput = z.infer<typeof createSimpleTaskSchema>
```

- [ ] **Step 4: テストを実行してパスを確認する**

Run: `npm run test -- --test-name-pattern="addTaskAssigneeSchema|createCommentSchema|createSimpleTaskSchema"`
Expected: PASS

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし（`Task`型にフィールド追加のみなので既存コードは壊れない）

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/types.ts src/features/task-management/types.test.ts
git commit -m "feat: タスク管理の型定義にresponsible/member役割とsuggestion/report宛先ルールを追加"
```

---

### Task 4: permissions.ts に責任者/メンバー判定関数を追加

**Files:**

- Modify: `src/features/task-management/permissions.ts`
- Test: `src/features/task-management/permissions.test.ts`

**Interfaces:**

- Consumes: なし
- Produces: `isTaskResponsible(responsibleEmployeeId: string | null, currentEmployeeId: string): boolean`, `isTaskMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean`, `canEditTask(isObjectiveOwner: boolean, isTaskResponsible: boolean): boolean`

- [ ] **Step 1: 失敗するテストを書く（`permissions.test.ts`に追記）**

```ts
import { isTaskResponsible, isTaskMember, canEditTask } from './permissions'

test('タスク責任者本人ならtrue', () => {
  assert.equal(isTaskResponsible('emp-1', 'emp-1'), true)
})

test('責任者が未設定(null)ならfalse', () => {
  assert.equal(isTaskResponsible(null, 'emp-1'), false)
})

test('メンバーに含まれていればtrue', () => {
  assert.equal(isTaskMember(['emp-1', 'emp-2'], 'emp-1'), true)
})

test('メンバーに含まれていなければfalse', () => {
  assert.equal(isTaskMember(['emp-2'], 'emp-1'), false)
})

test('目標責任者は編集可', () => {
  assert.equal(canEditTask(true, false), true)
})

test('タスク責任者は編集可', () => {
  assert.equal(canEditTask(false, true), true)
})

test('どちらでもなければ編集不可', () => {
  assert.equal(canEditTask(false, false), false)
})
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm run test -- --test-name-pattern="isTaskResponsible|isTaskMember|canEditTask"`
Expected: FAIL（関数が存在しない）

- [ ] **Step 3: `permissions.ts`に実装を追加する**

```ts
export function isTaskResponsible(
  responsibleEmployeeId: string | null,
  currentEmployeeId: string
): boolean {
  return responsibleEmployeeId === currentEmployeeId
}

export function isTaskMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean {
  return memberEmployeeIds.includes(currentEmployeeId)
}

export function canEditTask(isObjectiveOwner: boolean, isTaskResponsible: boolean): boolean {
  return isObjectiveOwner || isTaskResponsible
}
```

- [ ] **Step 4: テストを実行してパスを確認する**

Run: `npm run test -- --test-name-pattern="isTaskResponsible|isTaskMember|canEditTask"`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/features/task-management/permissions.ts src/features/task-management/permissions.test.ts
git commit -m "feat: タスク責任者/メンバーの権限判定関数を追加"
```

---

### Task 5: queries.ts の拡張（mapTask・getTenantEmployees・新規クエリ）

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: `Task`型（Task 3で拡張済み）, `EmployeeOption`型
- Produces:
  - `EmployeeOption`に`isManager: boolean`を追加
  - `getManagerEmployees(supabase): Promise<EmployeeOption[]>`（`is_manager=true`のみ）
  - `getObjectiveSimpleView(supabase, objectiveId): Promise<ObjectiveSimpleView>`（新規、目標＋デフォルトタスクグループ＋配下タスク一覧をまとめて返す）
  - `ObjectiveSimpleView`型: `{ objective: TaskObjective; defaultTaskGroupId: string; tasks: Task[] }`

- [ ] **Step 1: `EmployeeOption`型を拡張する（`employee-filter.ts`）**

```ts
// src/features/task-management/employee-filter.ts
export interface EmployeeOption {
  id: string
  name: string
  isManager: boolean
}
```

- [ ] **Step 2: `getTenantEmployees`のSELECT列を拡張する**

`queries.ts`の`getTenantEmployees`関数（324-338行目）を変更:

```ts
export async function getTenantEmployees(
  supabase: SupabaseClient<Database>
): Promise<EmployeeOption[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, is_manager')
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name ?? '（名前未設定）',
    isManager: row.is_manager ?? false,
  }))
}

/** タスク責任者候補（is_manager=trueの従業員）のみを取得する */
export async function getManagerEmployees(
  supabase: SupabaseClient<Database>
): Promise<EmployeeOption[]> {
  const employees = await getTenantEmployees(supabase)
  return employees.filter(e => e.isManager)
}
```

- [ ] **Step 3: `mapTask`を拡張し、`task_assignees`のroleを反映する**

`queries.ts`の`mapTask`関数（298-317行目）とその呼び出し元のSELECT文（`getTaskGroupBoard`内、355-360行目）を変更:

```ts
function mapTask(
  row: Database['public']['Tables']['tasks']['Row'] & {
    task_assignees: { employee_id: string; role: string }[] | null
  }
): Task {
  const assignees = row.task_assignees ?? []
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskGroupId: row.task_group_id,
    title: row.title,
    description: row.description,
    goalSummary: row.goal_summary,
    createdByEmployeeId: row.created_by_employee_id,
    assigneeEmployeeIds: assignees.map(a => a.employee_id),
    responsibleEmployeeId: assignees.find(a => a.role === 'responsible')?.employee_id ?? null,
    memberEmployeeIds: assignees.filter(a => a.role === 'member').map(a => a.employee_id),
    status: row.status as Task['status'],
    progressPercent: row.progress_percent,
    priority: row.priority as Task['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
  }
}
```

`getTaskGroupBoard`内の`.select('*, task_assignees(employee_id)')`を`.select('*, task_assignees(employee_id, role)')`に変更する。

- [ ] **Step 4: `ObjectiveSimpleView`と`getObjectiveSimpleView`を新規追加する**

`getObjectiveDetail`関数の直後に追加:

```ts
export interface ObjectiveSimpleView {
  objective: TaskObjective
  defaultTaskGroupId: string
  tasks: Task[]
}

/**
 * Phase5のシンプルUI用に、目標本体・デフォルトタスクグループID・配下タスク一覧をまとめて取得する。
 * 目標が複数タスクグループを持つ場合でも、作成日時が最も古いものを「デフォルト」として扱う。
 */
export async function getObjectiveSimpleView(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<ObjectiveSimpleView> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('*')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('id')
    .eq('objective_id', objectiveId)
    .order('created_at', { ascending: true })

  if (milestoneError) throw milestoneError
  if (!milestoneRows || milestoneRows.length === 0) {
    throw new Error('この目標にはマイルストーンが存在しません')
  }

  const milestoneIds = milestoneRows.map(m => m.id)

  const { data: groupRows, error: groupError } = await supabase
    .from('task_groups')
    .select('id')
    .in('milestone_id', milestoneIds)
    .order('created_at', { ascending: true })

  if (groupError) throw groupError
  if (!groupRows || groupRows.length === 0) {
    throw new Error('この目標にはタスクグループが存在しません')
  }

  const defaultTaskGroupId = groupRows[0].id
  const groupIds = groupRows.map(g => g.id)

  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('*, task_assignees(employee_id, role)')
    .in('task_group_id', groupIds)
    .order('created_at', { ascending: true })

  if (taskError) throw taskError

  return {
    objective: mapObjective(objectiveRow),
    defaultTaskGroupId,
    tasks: (taskRows ?? []).map(mapTask),
  }
}
```

`mapObjective`関数がまだ存在しない場合は、既存の`getMyObjectives`関数内でobjectiveの行をどうcamelCase化しているかを確認し（既存コードに同等の変換ロジックがあるはず）、同じ変換を切り出して`mapObjective`という名前の関数にし、`getMyObjectives`側もこの関数を使うようにリファクタする。

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/queries.ts src/features/task-management/employee-filter.ts
git commit -m "feat: queries.tsにタスク責任者候補取得・目標シンプルビュー取得を追加"
```

---

### Task 6: `createObjective`拡張とデフォルト構造自動生成

**Files:**

- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: `createObjectiveSchema`（既存、変更なし）
- Produces: `createObjective`の戻り値は変更なし（`{ id: string }`）。副作用として`task_milestones`・`task_groups`に各1件のデフォルト行を追加作成する

- [ ] **Step 1: `createObjective`を拡張する（61-88行目を置き換え）**

```ts
export async function createObjective(input: CreateObjectiveInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data: objective, error: objectiveError } = await supabase
    .from('task_objectives')
    .insert({
      tenant_id: user.tenant_id,
      owner_employee_id: user.employee_id,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (objectiveError) throw objectiveError

  // Phase5: UIには表示しない既定のマイルストーン・タスクグループを自動生成する
  const { data: milestone, error: milestoneError } = await supabase
    .from('task_milestones')
    .insert({
      tenant_id: user.tenant_id,
      objective_id: objective.id,
      title: '既定マイルストーン',
    })
    .select('id')
    .single()

  if (milestoneError) throw milestoneError

  const { error: groupError } = await supabase.from('task_groups').insert({
    tenant_id: user.tenant_id,
    milestone_id: milestone.id,
    name: '既定タスクグループ',
  })

  if (groupError) throw groupError

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: objective.id }
}
```

**注意**: `task_milestones`/`task_groups`の`due_date`/`description`は`NULL`許容のため未指定でよい（既存のテーブル定義どおり）。`is_task_group_owner`はtask_groups自己参照SELECTで直後の可視性問題があるが（調査結果セクション2の補足参照）、ここはINSERTのみで後続SELECTを行わないため影響しない。

- [ ] **Step 2: Server Actionの統合テストを手動で確認する**（`node:test`でのSupabase呼び出しモックはこのプロジェクトの既存パターンに無いため、実際にローカルSupabaseに対してdev server経由で動作確認する）

Run: `npm run dev`し、ブラウザで`/tasks/objectives/new`から目標を1件作成した後、以下で確認する:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "
SELECT o.title AS objective, m.title AS milestone, g.name AS group
FROM task_objectives o
JOIN task_milestones m ON m.objective_id = o.id
JOIN task_groups g ON g.milestone_id = m.id
ORDER BY o.created_at DESC LIMIT 1;
"
```

Expected: 作成した目標に対応する行が1件、`milestone`が`既定マイルストーン`、`group`が`既定タスクグループ`であること

- [ ] **Step 3: コミット**

```bash
git add src/features/task-management/actions.ts
git commit -m "feat: 目標作成時に既定マイルストーン・タスクグループを自動生成する"
```

---

### Task 7: 責任者付きタスク作成（`createSimpleTask`）とRLS同期登録

**Files:**

- Modify: `src/features/task-management/actions.ts`
- Modify: `src/features/task-management/types.ts`（Task 3で追加済みの`createSimpleTaskSchema`をimportに追加）

**Interfaces:**

- Consumes: `createSimpleTaskSchema`（Task 3）, `CreateSimpleTaskInput`
- Produces: `createSimpleTask(input: CreateSimpleTaskInput): Promise<{ id: string }>`

- [ ] **Step 1: `actions.ts`の先頭importに`createSimpleTaskSchema`, `CreateSimpleTaskInput`を追加する**

```ts
  createSimpleTaskSchema,
  type CreateSimpleTaskInput,
```

（`createTaskSchema` importの直後に追加）

- [ ] **Step 2: `createSimpleTask`を`createTask`関数の直後に実装する**

```ts
/**
 * Phase5のシンプルUI専用: タスクを作成し、同時にタスク責任者を task_assignees（role='responsible'）
 * および task_group_managers に登録する。
 * task_group_managers への同期登録は、責任者・メンバーが既存RLS（task_objectives_select等の
 * 「タスクグループ参加者」条件）の可視範囲に入るようにするため（design.mdセクション2.3）。
 */
export async function createSimpleTask(input: CreateSimpleTaskInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createSimpleTaskSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      title: parsed.title,
      goal_summary: parsed.goalSummary ?? null,
      due_date: parsed.dueDate ?? null,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (taskError) throw taskError

  const { error: assigneeError } = await supabase.from('task_assignees').insert({
    tenant_id: user.tenant_id,
    task_id: task.id,
    employee_id: parsed.responsibleEmployeeId,
    role: 'responsible',
  })

  if (assigneeError) throw assigneeError

  const { error: managerError } = await supabase.from('task_group_managers').upsert(
    {
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      employee_id: parsed.responsibleEmployeeId,
    },
    { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
  )

  if (managerError) throw managerError

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(parsed.taskGroupId))

  return { id: task.id }
}
```

**注意**: `revalidatePath`には目標詳細ページのパスが必要だが、`createSimpleTask`の入力は`taskGroupId`のみを持つ。呼び出し元（`/tasks/objectives/new`のクライアントコンポーネント）は目標IDを知っているので、`router.refresh()`をクライアント側で呼ぶ設計にし、`revalidatePath`は`APP_ROUTES.tasks.root`のみに簡略化してよい（`createTaskGroup`のように milestoneId→objective_id 引き当てをするほどの必要性は薄いため、YAGNI）。上記コードの`revalidatePath`行を次に置き換える:

```ts
revalidatePath(APP_ROUTES.tasks.root)
```

- [ ] **Step 3: `task_group_managers`テーブルに`(task_group_id, employee_id)`のUNIQUE制約があるか確認する**（upsertのonConflictに必要）

Run:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "\d task_group_managers"
```

Expected: `UNIQUE`制約または`PRIMARY KEY`が`(task_group_id, employee_id)`の組で存在すること。存在しない場合は、本タスクのマイグレーション（Task 1のファイルに追記するか、新規`20260911100050_add_task_group_managers_unique.sql`を作成）で以下を追加する:

```sql
ALTER TABLE public.task_group_managers
  ADD CONSTRAINT task_group_managers_group_employee_unique
  UNIQUE (task_group_id, employee_id);
```

- [ ] **Step 4: 動作確認**

Run: `npm run dev`し、`/tasks/objectives/new`の完成後のフローでタスクを1件作成後:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "
SELECT ta.role, e.name FROM task_assignees ta JOIN employees e ON e.id = ta.employee_id
ORDER BY ta.assigned_at DESC LIMIT 1;
"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "
SELECT tgm.task_group_id, e.name FROM task_group_managers tgm JOIN employees e ON e.id = tgm.employee_id
ORDER BY e.name DESC LIMIT 1;
"
```

Expected: `task_assignees`に`role='responsible'`の行、`task_group_managers`に同じ人物の行が存在すること

- [ ] **Step 5: コミット**

```bash
git add src/features/task-management/actions.ts
git commit -m "feat: タスク責任者付きの新規タスク作成アクションを追加"
```

---

### Task 8: `addTaskAssignee`/`removeTaskAssignee`のrole対応とtask_group_members同期

**Files:**

- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: `addTaskAssigneeSchema`（Task 3でrole追加済み）
- Produces: `addTaskAssignee`の入力に`role`が渡せるようになる（省略時`'member'`）。member追加時は`task_group_members`にも同期登録

- [ ] **Step 1: `addTaskAssignee`を変更する（422-449行目を置き換え）**

```ts
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
    role: parsed.role,
  })

  if (error) throw error

  if (parsed.role === 'member') {
    const { error: memberError } = await supabase.from('task_group_members').upsert(
      {
        tenant_id: user.tenant_id,
        task_group_id: task.task_group_id,
        employee_id: parsed.employeeId,
      },
      { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
    )
    if (memberError) throw memberError
  } else {
    const { error: managerError } = await supabase.from('task_group_managers').upsert(
      {
        tenant_id: user.tenant_id,
        task_group_id: task.task_group_id,
        employee_id: parsed.employeeId,
      },
      { onConflict: 'task_group_id,employee_id', ignoreDuplicates: true }
    )
    if (managerError) throw managerError
  }

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}
```

- [ ] **Step 2: `task_group_members`テーブルにも`(task_group_id, employee_id)`のUNIQUE制約があるか確認する**（Task 7 Step3と同様の手順）

Run:

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -c "\d task_group_members"
```

制約がなければ、Task 7で作成したマイグレーションファイル（または新規ファイル）に以下を追記する:

```sql
ALTER TABLE public.task_group_members
  ADD CONSTRAINT task_group_members_group_employee_unique
  UNIQUE (task_group_id, employee_id);
```

- [ ] **Step 3: 動作確認**

`npm run dev`で`/tasks/objectives/[id]`のタスク詳細モーダルから既存の担当者追加UIを使い、追加後に`task_group_members`/`task_group_managers`へ同期されていることをpsqlのSELECTで確認する（Task 7 Step4と同様のクエリパターン）。

- [ ] **Step 4: コミット**

```bash
git add src/features/task-management/actions.ts
git commit -m "feat: タスク担当者アサインをrole対応させ、タスクグループへの同期登録を追加"
```

---

### Task 9: `/tasks/objectives/new` のStep2 UI（タスク作成モーダル・カード一覧）

**Files:**

- Create: `src/features/task-management/components/SimpleTaskForm.tsx`
- Create: `src/features/task-management/components/ObjectiveCreationFlow.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/new/page.tsx`

**Interfaces:**

- Consumes: `createObjective`（Task 6）, `createSimpleTask`（Task 7）, `getManagerEmployees`（Task 5）, `Task`型, `EmployeeOption`型, `ObjectiveForm`（既存、変更なし）
- Produces: `ObjectiveCreationFlow`（Client Component、目標作成前後でStep1/Step2を切り替える）, `SimpleTaskForm`（Client Component、モーダル内のタスク作成フォーム）

- [ ] **Step 1: `page.tsx`をServer Componentのまま、データ取得のみ行い`ObjectiveCreationFlow`に委譲する**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getManagerEmployees } from '@/features/task-management/queries'
import { ObjectiveCreationFlow } from '@/features/task-management/components/ObjectiveCreationFlow'

export default async function NewObjectivePage() {
  const supabase = await createClient()
  const managers = await getManagerEmployees(supabase)

  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <ObjectiveCreationFlow managers={managers} />
    </div>
  )
}
```

- [ ] **Step 2: `ObjectiveCreationFlow.tsx`を実装する（Step1: 目標フォーム、Step2: タスク作成ボタン＋モーダル＋一覧）**

```tsx
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createObjective, createSimpleTask } from '../actions'
import { SimpleTaskForm } from './SimpleTaskForm'
import { APP_ROUTES } from '@/config/routes'
import type { EmployeeOption } from '../employee-filter'

interface CreatedTask {
  id: string
  title: string
  goalSummary: string | null
  responsibleEmployeeId: string
}

interface ObjectiveCreationFlowProps {
  managers: EmployeeOption[]
}

/**
 * 目標作成 → タスク作成（複数回）を1画面で行うフロー。
 * 目標作成前は Step1（ObjectiveForm相当のインラインフォーム）、
 * 作成後は Step2（タスク作成ボタン + 作成済みタスクのカード一覧）を表示する。
 */
export function ObjectiveCreationFlow({ managers }: ObjectiveCreationFlowProps) {
  const [objective, setObjective] = useState<{ id: string; taskGroupId: string } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tasks, setTasks] = useState<CreatedTask[]>([])

  function handleCreateObjective(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createObjective({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        // Task 6でcreateObjectiveが自動生成する既定タスクグループのIDを取得するため、
        // 別途 getObjectiveSimpleView 相当の情報が必要。ここでは目標詳細への遷移を
        // シンプルにするため、objectiveId のみ保持し、タスク作成モーダルには
        // taskGroupId をサーバーから取得し直す（次のステップで解決）。
        setObjective({ id, taskGroupId: '' })
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      }
    })
  }

  if (!objective) {
    return (
      <form onSubmit={handleCreateObjective} className="space-y-3">
        <h1 className="text-lg font-semibold text-slate-900">新しい目標を作成</h1>
        <label className="block text-xs font-medium text-slate-700">
          目標名
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          説明
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          期限
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          目標を作成
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={APP_ROUTES.tasks.root} className="text-xs text-slate-500 underline">
          ← 戻る
        </Link>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          タスクの作成
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">タスクがまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(t => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white">
              <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
                {t.title}
              </p>
              <div className="p-3 text-xs text-slate-500">
                {t.goalSummary && <p>{t.goalSummary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <SimpleTaskForm
          taskGroupId={objective.taskGroupId}
          managers={managers}
          onClose={() => setIsModalOpen(false)}
          onCreated={task => {
            setTasks(prev => [...prev, task])
            setIsModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
```

**設計上の課題**: `createObjective`の戻り値は`{ id: string }`のみで、自動生成された`taskGroupId`を含まない。次のStepでこれを解決する。

- [ ] **Step 3: `createObjective`の戻り値を拡張し、`taskGroupId`も返すようにする**（Task 6で実装したコードを修正）

`src/features/task-management/actions.ts`の`createObjective`関数の戻り値型と最終行を変更:

```ts
export async function createObjective(
  input: CreateObjectiveInput
): Promise<{ id: string; defaultTaskGroupId: string }> {
  // ...(Task 6と同じ処理、objective・milestone・group作成まで共通)...

  const { data: group, error: groupError } = await supabase
    .from('task_groups')
    .insert({
      tenant_id: user.tenant_id,
      milestone_id: milestone.id,
      name: '既定タスクグループ',
    })
    .select('id')
    .single()

  if (groupError) throw groupError

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: objective.id, defaultTaskGroupId: group.id }
}
```

（Task 6のStepで`.select('id').single()`を付けていなかった`task_groups`のinsertに`.select('id').single()`を追加し、`group.id`を受け取る形に変更する）

`ObjectiveCreationFlow.tsx`の`handleCreateObjective`内を修正:

```ts
const { id, defaultTaskGroupId } = await createObjective({
  title,
  description: description || undefined,
  dueDate: dueDate || undefined,
})
setObjective({ id, taskGroupId: defaultTaskGroupId })
```

- [ ] **Step 4: `SimpleTaskForm.tsx`を実装する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createSimpleTask } from '../actions'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface CreatedTask {
  id: string
  title: string
  goalSummary: string | null
  responsibleEmployeeId: string
}

interface SimpleTaskFormProps {
  taskGroupId: string
  managers: EmployeeOption[]
  onClose: () => void
  onCreated: (task: CreatedTask) => void
}

/** タスクの新規作成モーダル。タスク責任者は is_manager=true の従業員のみ選択できる。 */
export function SimpleTaskForm({ taskGroupId, managers, onClose, onCreated }: SimpleTaskFormProps) {
  const [title, setTitle] = useState('')
  const [goalSummary, setGoalSummary] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createSimpleTask({
          taskGroupId,
          title,
          goalSummary: goalSummary || undefined,
          dueDate: dueDate || undefined,
          responsibleEmployeeId,
        })
        onCreated({ id, title, goalSummary: goalSummary || null, responsibleEmployeeId })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクの登録に失敗しました')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-lg bg-white p-4 shadow-lg"
      >
        <h2 className="text-sm font-semibold text-slate-900">タスクの作成</h2>
        <label className="block text-xs font-medium text-slate-700">
          タスク名
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          タスク目標
          <input
            value={goalSummary}
            onChange={e => setGoalSummary(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          期限
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          タスク責任者
          <EmployeePicker
            employees={managers}
            value={responsibleEmployeeId}
            onChange={setResponsibleEmployeeId}
            placeholder="責任者を選択"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending || !responsibleEmployeeId}
            className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            タスクを登録する
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 6: 手動動作確認**

`npm run dev`で`/tasks/objectives/new`にアクセスし、目標作成→タスク作成モーダル→登録→カード表示、の一連の流れをブラウザで確認する

- [ ] **Step 7: コミット**

```bash
git add src/app/\(tenant\)/\(tenant-users\)/tasks/objectives/new/page.tsx src/features/task-management/components/ObjectiveCreationFlow.tsx src/features/task-management/components/SimpleTaskForm.tsx src/features/task-management/actions.ts
git commit -m "feat: 目標作成後にその場でタスクを作成できるフローを追加"
```

---

### Task 10: `/tasks/objectives/[id]` のヘッダー・ステータス分布・タスクカードグリッド

**Files:**

- Create: `src/features/task-management/components/TaskStatusDonutChart.tsx`
- Create: `src/features/task-management/components/SimpleTaskCard.tsx`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: `getObjectiveSimpleView`（Task 5）, `getTenantEmployees`（Task 5拡張版）, `Task`型（`responsibleEmployeeId`, `memberEmployeeIds`含む）, `TASK_STATUSES`
- Produces: `TaskStatusDonutChart({ tasks: Task[] })`, `SimpleTaskCard({ task, employeeNameById, canEdit, onEdit, onDelete })`

- [ ] **Step 1: `TaskStatusDonutChart.tsx`を実装する（Rechartsのドーナツグラフ、`WorkDistributionChart.tsx`のimportパターンを踏襲）**

```tsx
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TASK_STATUSES, type Task, type TaskStatus } from '../types'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: '#94a3b8',
  in_progress: '#FD7601',
  review: '#eab308',
  done: '#1a8754',
  blocked: '#ef4444',
}

interface TaskStatusDonutChartProps {
  tasks: Task[]
}

/** タスクのステータス分布をドーナツグラフで表示する */
export function TaskStatusDonutChart({ tasks }: TaskStatusDonutChartProps) {
  const data = TASK_STATUSES.map(status => ({
    status,
    label: STATUS_LABEL[status],
    value: tasks.filter(t => t.status === status).length,
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return <p className="text-xs text-slate-500">タスクがまだありません。</p>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80}>
          {data.map(d => (
            <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: `SimpleTaskCard.tsx`を実装する**

```tsx
'use client'

import { ListTodo } from 'lucide-react'
import type { Task } from '../types'

interface SimpleTaskCardProps {
  task: Task
  employeeNameById: Record<string, string>
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

/** 目標詳細ページのタスクカード（Phase5シンプルUI用）。 */
export function SimpleTaskCard({
  task,
  employeeNameById,
  canEdit,
  onEdit,
  onDelete,
}: SimpleTaskCardProps) {
  const isOverdue = task.dueDate !== null && task.dueDate < new Date().toISOString().slice(0, 10)
  const responsibleName = task.responsibleEmployeeId
    ? (employeeNameById[task.responsibleEmployeeId] ?? task.responsibleEmployeeId)
    : '未設定'

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
      <p className="flex items-center gap-1.5 truncate border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-[#FD7601]" strokeWidth={2} />
        <span className="truncate">{task.title}</span>
      </p>
      <div className="space-y-1.5 p-3 text-xs text-slate-500">
        {task.goalSummary && <p className="truncate">目標: {task.goalSummary}</p>}
        {task.dueDate && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isOverdue ? 'bg-red-50 text-red-600' : 'bg-(--success-bg) text-(--green-600)'
            }`}
          >
            期限: {task.dueDate}
          </span>
        )}
        <p>メンバー数: {task.memberEmployeeIds.length}</p>
        <p>責任者: {responsibleName}</p>
        {canEdit && (
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onEdit} className="text-[10px] text-slate-600 underline">
              編集
            </button>
            <button type="button" onClick={onDelete} className="text-[10px] text-red-600 underline">
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `page.tsx`を書き換える**

```tsx
import { Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getObjectiveSimpleView, getTenantEmployees } from '@/features/task-management/queries'
import { TaskStatusDonutChart } from '@/features/task-management/components/TaskStatusDonutChart'
import { ObjectiveTaskBoard } from '@/features/task-management/components/ObjectiveTaskBoard'
import { isObjectiveOwner } from '@/features/task-management/permissions'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const { objective, defaultTaskGroupId, tasks } = await getObjectiveSimpleView(supabase, id)
  const employees = await getTenantEmployees(supabase)
  const employeeNameById = Object.fromEntries(employees.map(e => [e.id, e.name]))
  const isOwner = user?.employee_id
    ? isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
    : false

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Target className="h-5 w-5 text-[#FD7601]" strokeWidth={2} />
          {objective.title}
        </h1>
        <p className="text-xs text-slate-500">
          作成者: {employeeNameById[objective.ownerEmployeeId] ?? objective.ownerEmployeeId}
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="mb-2 text-xs font-semibold text-slate-900">ステータス分布</h2>
        <TaskStatusDonutChart tasks={tasks} />
      </section>

      <ObjectiveTaskBoard
        objectiveId={objective.id}
        taskGroupId={defaultTaskGroupId}
        tasks={tasks}
        employees={employees}
        employeeNameById={employeeNameById}
        currentEmployeeId={user?.employee_id ?? null}
        isObjectiveOwner={isOwner}
      />
    </div>
  )
}
```

**注意**: `ObjectiveTaskBoard`（タスクカードグリッド＋編集/削除操作＋モーダル管理を担うClient Component）はTask 11で実装する。本Stepでは`page.tsx`と`TaskStatusDonutChart`のみ先に完成させ、`ObjectiveTaskBoard`は仮に空のプレースホルダーコンポーネント（`<div>準備中</div>`を返すだけ）を`src/features/task-management/components/ObjectiveTaskBoard.tsx`に作成してビルドを通す。

```tsx
// 仮実装（Task 11で置き換える）
export function ObjectiveTaskBoard() {
  return <div className="text-xs text-slate-500">準備中</div>
}
```

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/app/\(tenant\)/\(tenant-users\)/tasks/objectives/\[id\]/page.tsx src/features/task-management/components/TaskStatusDonutChart.tsx src/features/task-management/components/SimpleTaskCard.tsx src/features/task-management/components/ObjectiveTaskBoard.tsx
git commit -m "feat: 目標詳細ページをヘッダー+ステータス分布+タスクカード構成に再構築（骨組み）"
```

---

### Task 11: タスクカードグリッド本体（`ObjectiveTaskBoard`）と削除アクション

**Files:**

- Modify: `src/features/task-management/components/ObjectiveTaskBoard.tsx`（Task 10の仮実装を置き換え）
- Modify: `src/features/task-management/actions.ts`（`deleteTask`を追加）
- Modify: `src/features/task-management/types.ts`（`deleteTaskSchema`を追加）

**Interfaces:**

- Consumes: `SimpleTaskCard`（Task 10）, `TaskDetailModal`（既存、Task 12で編集セクションを追加）, `canEditTask`/`isTaskResponsible`（Task 4）
- Produces: `deleteTask(input: { taskId: string }): Promise<void>`, `ObjectiveTaskBoard`（Client Component）

- [ ] **Step 1: `types.ts`に`deleteTaskSchema`を追加する**

```ts
export const deleteTaskSchema = z.object({ taskId: z.string().uuid() })
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>
```

- [ ] **Step 2: `actions.ts`に`deleteTask`を追加する（`removeTaskAssignee`の直後）**

```ts
/**
 * タスク（tasks）を削除する。削除可否（責任者・マネージャー）は RLS の tasks DELETE ポリシーが強制する。
 * 0件削除時はエラーを投げる（`updateTaskStatus` と同じパターン）。
 */
export async function deleteTask(input: DeleteTaskInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = deleteTaskSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase.from('tasks').delete().eq('id', parsed.taskId).select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを削除する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
}
```

- [ ] **Step 3: `ObjectiveTaskBoard.tsx`を実装する**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SimpleTaskCard } from './SimpleTaskCard'
import { TaskDetailModal } from './TaskDetailModal'
import { deleteTask } from '../actions'
import { isObjectiveOwner, isTaskResponsible, canEditTask } from '../permissions'
import type { Task } from '../types'
import type { EmployeeOption } from '../employee-filter'

interface ObjectiveTaskBoardProps {
  objectiveId: string
  taskGroupId: string
  tasks: Task[]
  employees: EmployeeOption[]
  employeeNameById: Record<string, string>
  currentEmployeeId: string | null
  isObjectiveOwner: boolean
}

/** タスクカードのグリッド表示 + カードクリックで開く詳細モーダルの管理。 */
export function ObjectiveTaskBoard({
  taskGroupId,
  tasks,
  employees,
  employeeNameById,
  currentEmployeeId,
  isObjectiveOwner: isOwner,
}: ObjectiveTaskBoardProps) {
  const router = useRouter()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(taskId: string) {
    if (!window.confirm('このタスクを削除しますか？')) return
    startTransition(async () => {
      await deleteTask({ taskId })
      router.refresh()
    })
  }

  const openTask = tasks.find(t => t.id === openTaskId) ?? null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">タスク一覧</h2>
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">タスクがまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(task => {
            const isResponsible = currentEmployeeId
              ? isTaskResponsible(task.responsibleEmployeeId, currentEmployeeId)
              : false
            const canEdit = canEditTask(isOwner, isResponsible)
            return (
              <div key={task.id} onClick={() => setOpenTaskId(task.id)} className="cursor-pointer">
                <SimpleTaskCard
                  task={task}
                  employeeNameById={employeeNameById}
                  canEdit={canEdit}
                  onEdit={() => setOpenTaskId(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              </div>
            )
          })}
        </div>
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          isOpen={true}
          onClose={() => setOpenTaskId(null)}
          canOperate={
            currentEmployeeId
              ? isOwner ||
                isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId) ||
                openTask.memberEmployeeIds.includes(currentEmployeeId)
              : false
          }
          currentEmployeeId={currentEmployeeId}
          canModerateComments={isOwner}
          canLogWork={
            currentEmployeeId
              ? isOwner ||
                isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId) ||
                openTask.memberEmployeeIds.includes(currentEmployeeId)
              : false
          }
          canManageAssignees={
            isOwner ||
            (currentEmployeeId
              ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
              : false)
          }
          assignableEmployees={employees}
          adviceTargets={[]}
          employeeNameById={employeeNameById}
        />
      )}
      {isPending && <p className="text-xs text-slate-400">処理中...</p>}
    </section>
  )
}
```

**注意**: `adviceTargets={[]}`は暫定値。Task 13でコミュニケーションルート（advice/suggestion/report）を`TaskDetailModal`の`CommentThread`呼び出し部分に正しく配線する。`taskGroupId`引数は現時点で`ObjectiveTaskBoard`内で未使用だが、Task 13で`suggestionTargets`/`reportTargets`の算出に必要になるため、propsとして残す（ESLintの未使用変数警告が出る場合は、Task 13まで`// eslint-disable-next-line`を付けるか、先に`_taskGroupId`のような命名で回避する）。

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: 手動動作確認**

`npm run dev`で目標詳細ページを開き、タスクカードのクリックで詳細モーダルが開くこと、削除ボタンで確認ダイアログ後に削除されることを確認する

- [ ] **Step 6: コミット**

```bash
git add src/features/task-management/components/ObjectiveTaskBoard.tsx src/features/task-management/actions.ts src/features/task-management/types.ts
git commit -m "feat: 目標詳細ページのタスクカードグリッドと削除機能を実装"
```

---

### Task 12: タスク編集（基本情報インライン編集）とメンバー管理のdivision絞り込み

**Files:**

- Modify: `src/features/task-management/actions.ts`（`updateTaskBasicInfo`を追加）
- Modify: `src/features/task-management/types.ts`（`updateTaskBasicInfoSchema`を追加）
- Modify: `src/features/task-management/components/TaskDetailModal.tsx`（基本情報編集セクション追加）
- Create: `src/features/task-management/components/DivisionFilteredEmployeePicker.tsx`

**Interfaces:**

- Consumes: `divisions`テーブル（`id, tenant_id, name, parent_id, layer`）, `EmployeeOption`
- Produces: `updateTaskBasicInfo(input: { taskId: string; title: string; goalSummary?: string; dueDate?: string }): Promise<void>`, `DivisionFilteredEmployeePicker({ employees, employeeDivisionById, divisions, value, onChange })`

- [ ] **Step 1: `types.ts`に`updateTaskBasicInfoSchema`を追加する**

```ts
export const updateTaskBasicInfoSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(200),
  goalSummary: z.string().max(200).optional(),
  dueDate: dateStringSchema.optional(),
})
export type UpdateTaskBasicInfoInput = z.infer<typeof updateTaskBasicInfoSchema>
```

- [ ] **Step 2: `actions.ts`に`updateTaskBasicInfo`を追加する（`updateTaskProgress`の直後）**

```ts
/**
 * タスクの基本情報（タスク名・タスク目標・期限）を更新する。
 * カラム制限: title/goal_summary/due_date/updated_at のみ更新する。
 * 更新可否（責任者・マネージャー）は RLS の tasks UPDATE ポリシーが強制する。
 */
export async function updateTaskBasicInfo(input: UpdateTaskBasicInfoInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskBasicInfoSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: parsed.title,
      goal_summary: parsed.goalSummary ?? null,
      due_date: parsed.dueDate ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.taskId)
    .select('id')

  if (error) throw error
  if (data === null || data.length === 0) {
    throw new Error('このタスクを更新する権限がありません')
  }

  revalidatePath(APP_ROUTES.tasks.root)
}
```

- [ ] **Step 3: `DivisionFilteredEmployeePicker.tsx`を実装する（`layer`によるインデント表示のフラットselect方式）**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface DivisionOption {
  id: string
  name: string
  parentId: string | null
  layer: number
}

interface DivisionFilteredEmployeePickerProps {
  employees: EmployeeOption[]
  employeeDivisionById: Record<string, string | null>
  divisions: DivisionOption[]
  value: string
  onChange: (employeeId: string) => void
}

/** 組織階層（division）で従業員を絞り込んでから選択する2段階ピッカー。 */
export function DivisionFilteredEmployeePicker({
  employees,
  employeeDivisionById,
  divisions,
  value,
  onChange,
}: DivisionFilteredEmployeePickerProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState('')

  const flatDivisions = useMemo(
    () => divisions.slice().sort((a, b) => a.layer - b.layer || a.name.localeCompare(b.name)),
    [divisions]
  )

  const filteredEmployees = selectedDivisionId
    ? employees.filter(e => employeeDivisionById[e.id] === selectedDivisionId)
    : employees

  return (
    <div className="space-y-1.5">
      <select
        value={selectedDivisionId}
        onChange={e => setSelectedDivisionId(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      >
        <option value="">すべての組織</option>
        {flatDivisions.map(d => (
          <option key={d.id} value={d.id}>
            {'　'.repeat(d.layer - 1)}
            {d.name}
          </option>
        ))}
      </select>
      <EmployeePicker employees={filteredEmployees} value={value} onChange={onChange} />
    </div>
  )
}
```

**注意**: 階層ツリー構築用の`buildDivisionTree`（`src/features/team-connect/tree-utils.ts`）は使わず、`layer`によるインデント表示のみの単純なフラットselect方式にした（`調査結果`にある`DirectoryList.tsx`と同様のパターン）。将来的に折りたたみ式の階層UIが必要になった場合は、`buildDivisionTree`の戻り値（`DivisionTreeNode`）を使う設計に差し替える。

- [ ] **Step 4: `TaskDetailModal.tsx`に基本情報編集セクションを追加する**

`TaskDetailModalProps`に`canEditBasicInfo: boolean`を追加し、`updateTaskBasicInfo`をimportして、タイトル表示部分（144-149行目付近）を編集フォームと切り替え可能にする。既存の`<h2>{task.title}</h2>`の直後、`{task.description && ...}`ブロックの前に以下を追加する:

```tsx
{
  canEditBasicInfo && <BasicInfoEditForm task={task} />
}
```

同ファイル内に`BasicInfoEditForm`を追加（ファイル末尾、`export function TaskDetailModal`の外側に新規関数として定義）:

```tsx
function BasicInfoEditForm({ task }: { task: Task }) {
  const router = useRouter()
  const [title, setTitle] = useState(task.title)
  const [goalSummary, setGoalSummary] = useState(task.goalSummary ?? '')
  const [dueDate, setDueDate] = useState(task.dueDate ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskBasicInfo({
          taskId: task.id,
          title,
          goalSummary: goalSummary || undefined,
          dueDate: dueDate || undefined,
        })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-slate-200 p-2">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      <input
        value={goalSummary}
        onChange={e => setGoalSummary(e.target.value)}
        placeholder="タスク目標"
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      {error && <p className="text-[10px] text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
      >
        保存
      </button>
    </form>
  )
}
```

`import { updateTaskBasicInfo } from '../actions'`をファイル先頭のimportに追加する。

- [ ] **Step 5: `ObjectiveTaskBoard.tsx`の`TaskDetailModal`呼び出しに`canEditBasicInfo`を渡す**

Task 11で実装した`<TaskDetailModal ...>`の props に追加:

```tsx
          canEditBasicInfo={canEditTask(
            isOwner,
            currentEmployeeId ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId) : false
          )}
```

- [ ] **Step 6: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 7: 手動動作確認**

タスク詳細モーダルを開き、基本情報編集フォームで名前・目標・期限を変更して保存し、反映されることを確認する

- [ ] **Step 8: コミット**

```bash
git add src/features/task-management/actions.ts src/features/task-management/types.ts src/features/task-management/components/TaskDetailModal.tsx src/features/task-management/components/DivisionFilteredEmployeePicker.tsx src/features/task-management/components/ObjectiveTaskBoard.tsx
git commit -m "feat: タスク基本情報のインライン編集と組織階層絞り込みの担当者選択を追加"
```

---

### Task 13: コミュニケーションルート（suggestion/report）のUI配線

**Files:**

- Modify: `src/features/task-management/components/CommentThread.tsx`
- Modify: `src/features/task-management/components/ObjectiveTaskBoard.tsx`
- Modify: `src/features/task-management/queries.ts`（`getTaskGroupParticipants`ヘルパー追加）

**Interfaces:**

- Consumes: `COMMENT_TYPES`, `can_send_suggestion`/`can_send_report`（Task 2、RLSのみ・クライアントコードからは直接呼ばない）
- Produces: `CommentThread`に`suggestionTargets: EmployeeOption[]`, `reportTargets: EmployeeOption[]` propsを追加

- [ ] **Step 1: `CommentThread.tsx`のprops定義を拡張する**

既存の`adviceTargets: EmployeeOption[]`propの直後に追加:

```ts
  /** 提案(suggestion)を送信できる相手 */
  suggestionTargets: EmployeeOption[]
  /** 報告(report)を送信できる相手 */
  reportTargets: EmployeeOption[]
```

- [ ] **Step 2: 種別選択に応じた宛先候補の切り替えロジックを拡張する**

既存コードで`commentType === 'advice'`の場合のみ`adviceTargets`を宛先ピッカーに渡している箇所（`availableTypes`計算、宛先ピッカーのconditional render）を、`suggestion`/`report`にも同様のパターンで拡張する。具体的には、既存の「`commentType`に応じて表示する宛先候補を切り替える」変数（例: `const targets = commentType === 'advice' ? adviceTargets : []`のような箇所）を次のように書き換える:

```ts
const targetsByType: Record<string, EmployeeOption[]> = {
  advice: adviceTargets,
  suggestion: suggestionTargets,
  report: reportTargets,
  general: [],
}
const targets = targetsByType[commentType] ?? []
const needsTarget = commentType !== 'general'
```

既存の`commentType === 'advice'`という条件分岐を`needsTarget`に置き換える。

- [ ] **Step 3: `queries.ts`に`getTaskGroupParticipants`を追加する（責任者・マネージャー・メンバーの一覧をまとめて返す）**

```ts
export interface TaskGroupParticipants {
  objectiveOwner: EmployeeOption | null
  managers: EmployeeOption[]
  members: EmployeeOption[]
}

/** 目標責任者・タスクグループのマネージャー・メンバー一覧をまとめて取得する（宛先候補の算出用） */
export async function getTaskGroupParticipants(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<TaskGroupParticipants> {
  const summary = await getTaskGroupSummary(supabase, taskGroupId)
  const employees = await getTenantEmployees(supabase)
  const byId = new Map(employees.map(e => [e.id, e]))

  return {
    objectiveOwner: byId.get(summary.objectiveOwnerEmployeeId) ?? null,
    managers: summary.managerEmployeeIds
      .map(id => byId.get(id))
      .filter((e): e is EmployeeOption => Boolean(e)),
    members: summary.memberEmployeeIds
      .map(id => byId.get(id))
      .filter((e): e is EmployeeOption => Boolean(e)),
  }
}
```

- [ ] **Step 4: `page.tsx`（`/tasks/objectives/[id]`）で`getTaskGroupParticipants`を呼び出し、`ObjectiveTaskBoard`に渡す**

Task 10で実装した`page.tsx`に追加:

```tsx
import { getTaskGroupParticipants } from '@/features/task-management/queries'
// ...
  const participants = await getTaskGroupParticipants(supabase, defaultTaskGroupId)
// ...
      <ObjectiveTaskBoard
        // ...既存props
        participants={participants}
      />
```

- [ ] **Step 5: `ObjectiveTaskBoard.tsx`で役割に応じた`adviceTargets`/`suggestionTargets`/`reportTargets`を算出し、`TaskDetailModal`に渡す**

design.mdセクション4の表に基づき、`ObjectiveTaskBoard`内に以下のロジックを追加（`props`に`participants: TaskGroupParticipants`を追加した上で）:

```ts
const isResponsibleOfOpenTask =
  currentEmployeeId && openTask
    ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
    : false
const isMemberOfOpenTask =
  currentEmployeeId && openTask ? openTask.memberEmployeeIds.includes(currentEmployeeId) : false

// advice: オーナー→責任者、責任者→メンバー
const adviceTargets = isOwner
  ? participants.managers
  : isResponsibleOfOpenTask
    ? participants.members
    : []
// suggestion: メンバー→責任者、責任者→オーナー
const suggestionTargets = isMemberOfOpenTask
  ? participants.managers
  : isResponsibleOfOpenTask && participants.objectiveOwner
    ? [participants.objectiveOwner]
    : []
// report: 責任者→オーナーのみ
const reportTargets =
  isResponsibleOfOpenTask && participants.objectiveOwner ? [participants.objectiveOwner] : []
```

`TaskDetailModal`呼び出しに`adviceTargets={adviceTargets}`（既存）に加え`suggestionTargets={suggestionTargets}` `reportTargets={reportTargets}`を渡す。`TaskDetailModal`内の`CommentThread`呼び出しにもこれらをそのまま伝播させる（`TaskDetailModal`のpropsにも`suggestionTargets`/`reportTargets`を追加する必要がある）。

- [ ] **Step 6: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 7: 手動動作確認**

タスクメンバーとしてログインした状態でタスク詳細モーダルを開き、コメント種別に「提案」を選ぶとタスク責任者が宛先候補に出ること、責任者としてログインした場合は「報告」で目標責任者が宛先候補に出ることを確認する

- [ ] **Step 8: コミット**

```bash
git add src/features/task-management/components/CommentThread.tsx src/features/task-management/components/ObjectiveTaskBoard.tsx src/features/task-management/components/TaskDetailModal.tsx src/features/task-management/queries.ts src/app/\(tenant\)/\(tenant-users\)/tasks/objectives/\[id\]/page.tsx
git commit -m "feat: コメントのsuggestion/report宛先ルートをUIに配線"
```

---

### Task 14: 責任者・メンバー別工数分布グラフ

**Files:**

- Modify: `src/features/task-management/queries.ts`
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: `WorkDistributionChart`（既存、無改修で流用）
- Produces: `getWorkLogSummaryByAssigneeRole(supabase, taskGroupId): Promise<{ employeeId: string; employeeName: string; role: 'responsible' | 'member'; totalHours: number }[]>`

- [ ] **Step 1: `queries.ts`に新規集計関数を追加する**

既存の`getWorkLogSummaryByGroup`（481-499行目）を参考に、`task_work_logs`を`task_assignees`経由でroleと結合する版を追加する:

```ts
export interface AssigneeHoursSummary {
  employeeId: string
  employeeName: string
  role: 'responsible' | 'member'
  totalHours: number
}

/** タスクグループ配下の工数記録を、担当者の役割（責任者/メンバー）別に集計する */
export async function getWorkLogSummaryByAssigneeRole(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<AssigneeHoursSummary[]> {
  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('id')
    .eq('task_group_id', taskGroupId)

  if (taskError) throw taskError

  const taskIds = (taskRows ?? []).map(t => t.id)
  if (taskIds.length === 0) return []

  const { data: logRows, error: logError } = await supabase
    .from('task_work_logs')
    .select('employee_id, hours, employee:employee_id(name)')
    .in('task_id', taskIds)

  if (logError) throw logError

  const { data: assigneeRows, error: assigneeError } = await supabase
    .from('task_assignees')
    .select('employee_id, role')
    .in('task_id', taskIds)

  if (assigneeError) throw assigneeError

  const roleByEmployeeId = new Map<string, 'responsible' | 'member'>()
  for (const row of assigneeRows ?? []) {
    if (row.role === 'responsible' || roleByEmployeeId.get(row.employee_id) !== 'responsible') {
      roleByEmployeeId.set(row.employee_id, row.role as 'responsible' | 'member')
    }
  }

  const hoursByEmployeeId = new Map<string, { name: string; hours: number }>()
  for (const row of logRows ?? []) {
    const current = hoursByEmployeeId.get(row.employee_id) ?? {
      name: row.employee?.name ?? '（名前未設定）',
      hours: 0,
    }
    current.hours += row.hours
    hoursByEmployeeId.set(row.employee_id, current)
  }

  return Array.from(hoursByEmployeeId.entries()).map(([employeeId, v]) => ({
    employeeId,
    employeeName: v.name,
    role: roleByEmployeeId.get(employeeId) ?? 'member',
    totalHours: v.hours,
  }))
}
```

- [ ] **Step 2: `page.tsx`に工数分布セクションを追加する**

`page.tsx`（`/tasks/objectives/[id]`）に以下を追加:

```tsx
import { getWorkLogSummaryByAssigneeRole } from '@/features/task-management/queries'
import { WorkDistributionChart } from '@/features/task-management/components/WorkDistributionChart'
// ...
  const workLogSummary = await getWorkLogSummaryByAssigneeRole(supabase, defaultTaskGroupId)
// ...（ObjectiveTaskBoardの後に追加）
      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="mb-2 text-xs font-semibold text-slate-900">責任者・メンバー別工数分布</h2>
        <WorkDistributionChart
          data={workLogSummary.map(s => ({
            id: s.employeeId,
            label: `${s.employeeName}（${s.role === 'responsible' ? '責任者' : 'メンバー'}）`,
            hours: s.totalHours,
          }))}
          emptyMessage="工数記録はまだありません。"
        />
      </section>
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/task-management/queries.ts src/app/\(tenant\)/\(tenant-users\)/tasks/objectives/\[id\]/page.tsx
git commit -m "feat: 目標詳細ページに責任者・メンバー別工数分布グラフを追加"
```

---

### Task 15: 組織ツリーのtask単位組み替え

**Files:**

- Modify: `src/features/task-management/org-tree.ts`
- Modify: `src/features/task-management/queries.ts`（`getObjectiveOrgTree`をシンプルUI向けに調整）
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: `buildOrgTreeGraph`, `layoutOrgTree`, `OrgTreeSection`（既存、無改修で流用可能と調査済み）
- Produces: 既存の`getObjectiveOrgTree`をそのまま呼び出し、`page.tsx`に`OrgTreeSection`を追加するのみ（`org-tree.ts`自体は既にtask/task_assigneeノードを持つ設計のため変更不要と判明）

**設計の再確認**: 調査結果より、`org-tree.ts`の`BuildOrgTreeInput`は既に`groups: OrgTreeGroupInput[]`と`tasks: OrgTreeTaskRow[]`を受け取り、`owner→task_group→{manager,member}`と`owner→task_group→task→task_assignee`を並列構築する設計になっている（Phase4で実装済み）。Phase5では目標が常に1つのデフォルトタスクグループしか持たないため、この既存ロジックはそのまま使える。**新規のコード変更は不要**で、`page.tsx`に表示セクションを追加するだけでよい。

- [ ] **Step 1: `page.tsx`に組織ツリーセクションを追加する**

```tsx
import { getObjectiveOrgTree } from '@/features/task-management/queries'
import { OrgTreeSection } from '@/features/task-management/components/OrgTreeSection'
// ...
  const orgTree = await getObjectiveOrgTree(supabase, id, user?.employee_id ?? null)
// ...（工数分布セクションの後に追加）
      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="mb-2 text-xs font-semibold text-slate-900">組織ツリー</h2>
        <OrgTreeSection data={orgTree} />
      </section>
```

- [ ] **Step 2: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: 手動動作確認**

`npm run dev`で目標詳細ページに組織ツリーが表示され、目標責任者→タスク→担当者の階層が見えることを確認する

- [ ] **Step 4: 既存の全ユニットテストを実行し、回帰がないことを確認する**

Run: `npm run test`
Expected: 全テストPASS

- [ ] **Step 5: コミット**

```bash
git add src/app/\(tenant\)/\(tenant-users\)/tasks/objectives/\[id\]/page.tsx
git commit -m "feat: 目標詳細ページに組織ツリー表示を追加(Phase5完了)"
```

---

## 実装後の確認事項（PRDへの反映）

全タスク完了後、`docs/implementation-plan-task-management.md`にセクション20として本Phaseの要約を追記する（Phase4のセクション19と同じ構成: 背景・要求ごとの詳細設計・実装ステータス表）。これは実装が完了し動作確認が済んでから行う。
