# タスク管理 Phase1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 目標→マイルストーン→タスクグループ→タスクの階層構造を作成でき、責任者/タスクマネージャー/メンバーの役割割当と、メンバーによる進捗（ステータス・進捗率%）報告、カンバンボードでの可視化までを一通り動かせるようにする（Phase1 = MVP）。

**Architecture:** 既存の `page.tsx → queries.ts(SELECT) → Client Component → actions.ts(Server Actions)` パターンに従う。新規 `src/features/task-management/` に集約し、画面は権限（app_role）に依存せず `(tenant-users)` 配下に一本化する。役割（責任者/マネージャー/メンバー）は既存 `app_role` と独立し、`task_objectives.owner_employee_id` / `task_group_managers` / `task_group_members` への行の存在で決まる。DBレベルでは新規 SQL ヘルパー関数（`is_task_group_manager()` 等）で RLS を構成する。

**Tech Stack:** Next.js 16 App Router + React 19, TypeScript, Supabase(PostgreSQL + RLS), Zod v4, Tailwind CSS v4, `node:test` + `tsx`（既存の唯一のテストランナー）

**Spec:** `docs/implementation-plan-task-management.md`（このプロジェクトの正本PRD。Phase2/3の内容や成功指標等はこの spec を参照。本 plan は spec のセクション4〜6のPhase1範囲のみを実装する）

## Global Constraints

- 新規テーブルは必ず `CREATE TABLE IF NOT EXISTS`、既存テーブルへの変更は行わない（今回は新規テーブルのみ）
- 全新規テーブルに `tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE` と RLS (`ENABLE ROW LEVEL SECURITY`) を必須で付与する
- `employees` への参照は `employees.id`（`auth_user_id` は存在しない。ユーザー特定は `employees.user_id = auth.uid()`）
- RLS ヘルパー関数は `current_tenant_id()` / `current_employee_id()` / `current_employee_app_role()`（すべて `supabase/migrations/20260307000000_init_schema.sql` 定義済み）を再利用し、新規ヘルパーも同じ `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` パターンに揃える
- テナント管理者判定は `public.current_employee_app_role() <> 'employee'`
- エンドユーザー向け `actions.ts` で `createAdminClient()` を使わない
- `page.tsx` に `supabase.from(...)` を直接書かない。SELECT は `queries.ts`、書き込みは `actions.ts` の Server Action のみ
- ルーティングは `src/config/routes.ts` の `APP_ROUTES` 経由（URL ハードコード禁止）
- コードコメントは日本語
- データ取得が発生するルートには `loading.tsx` / `error.tsx` を配置する
- テストは `node --import tsx --test` で実行する既存構成に従う。Zod スキーマ・純粋関数（進捗計算・権限判定）は `*.test.ts` で unit test する。Supabase 呼び出しを含む `queries.ts`/`actions.ts` と React コンポーネント自体はこのプロジェクトに unit test の前例がないため、テストは書かず「Server Actions テンプレート通りの実装」と「`npm run dev` での動作確認」で担保する（`docs/implementation-plan-task-management.md` の Integration/E2E 方針は Phase2 以降で自動テスト基盤を検討する際に見直す）
- Supabase への操作前に対象DBを宣言する（ローカル `127.0.0.1:55422` を対象とする。本番操作はこの plan の範囲外）

---

## タスク一覧と対象ファイル

| #   | タスク                               | 主な成果物                                                      |
| --- | ------------------------------------ | --------------------------------------------------------------- |
| 1   | DBスキーマ・RLS                      | `supabase/migrations/*_create_task_management_tables.sql`       |
| 2   | サービスマスタ登録                   | `supabase/migrations/*_seed_task_management_service_master.sql` |
| 3   | 型・Zodスキーマ                      | `src/features/task-management/types.ts`                         |
| 4   | 進捗ロールアップ計算                 | `src/features/task-management/progress.ts`                      |
| 5   | 役割判定ロジック                     | `src/features/task-management/permissions.ts`                   |
| 6   | ルート定数追加                       | `src/config/routes.ts`                                          |
| 7   | 目標一覧取得 + 作成                  | `queries.ts#getMyObjectives`, `actions.ts#createObjective`      |
| 8   | 目標作成UI・一覧UI                   | `/tasks`, `/tasks/objectives/new`                               |
| 9   | 目標詳細取得 + マイルストーン作成    | `queries.ts#getObjectiveDetail`, `actions.ts#createMilestone`   |
| 10  | 目標詳細UI                           | `/tasks/objectives/[id]`                                        |
| 11  | タスクグループ作成                   | `actions.ts#createTaskGroup` + UI                               |
| 12  | マネージャー/メンバー割当            | `actions.ts#assignManager/assignMember/removeMember` + UI       |
| 13  | タスク作成                           | `actions.ts#createTask` + UI                                    |
| 14  | タスクグループ詳細取得（カンバン用） | `queries.ts#getTaskGroupBoard`                                  |
| 15  | カンバンボードUI                     | `/tasks/groups/[id]`                                            |
| 16  | 進捗更新 + 手動E2E確認               | `actions.ts#updateTaskStatus/updateTaskProgress`                |

---

### Task 1: DBスキーマ・RLSポリシー

**Files:**

- Create: `supabase/migrations/<timestamp>_create_task_management_tables.sql`（`supabase migration new create_task_management_tables` で生成されるファイル名を使う）

**Interfaces:**

- Produces: テーブル `task_objectives`, `task_milestones`, `task_groups`, `task_group_managers`, `task_group_members`, `tasks`。関数 `public.is_task_objective_owner(uuid)`, `public.is_task_group_manager(uuid)`, `public.is_task_group_member(uuid)`, `public.is_task_group_owner(uuid)`, `public.is_task_group_participant(uuid)`（すべて `RETURNS boolean`）。以降の全タスクがこのスキーマ・関数名に依存する。

- [ ] **Step 1: 対象DBを宣言し、ローカルSupabaseが起動していることを確認する**

対象DB: ローカル (`127.0.0.1:55422`)。

Run: `supabase status`
Expected: `DB URL` に `127.0.0.1:55422` を含む出力。起動していなければ `supabase start` を実行する。

- [ ] **Step 2: マイグレーションファイルを新規作成する**

Run: `supabase migration new create_task_management_tables`
Expected: `supabase/migrations/<timestamp>_create_task_management_tables.sql` が作成される。以降このファイルに追記する。

- [ ] **Step 3: テーブル定義を書く**

```sql
-- 目標（責任者が作成）
CREATE TABLE IF NOT EXISTS public.task_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_objectives IS 'タスク管理: 責任者が作成する目標';

-- マイルストーン
CREATE TABLE IF NOT EXISTS public.task_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.task_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_milestones IS 'タスク管理: 目標配下のマイルストーン';

-- タスクグループ
CREATE TABLE IF NOT EXISTS public.task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.task_milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_groups IS 'タスク管理: マイルストーン配下のタスクグループ';

-- タスクグループのマネージャー割当（責任者のみが操作可）
CREATE TABLE IF NOT EXISTS public.task_group_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_group_id, employee_id)
);

COMMENT ON TABLE public.task_group_managers IS 'タスク管理: タスクグループのマネージャー割当（責任者のみ操作可）';

-- タスクグループのメンバー割当（責任者・マネージャーが操作可）
CREATE TABLE IF NOT EXISTS public.task_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_group_id, employee_id)
);

COMMENT ON TABLE public.task_group_members IS 'タスク管理: タスクグループのメンバー割当（責任者・マネージャーが操作可）';

-- タスク
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'タスク管理: タスクグループ配下の個別タスク';

CREATE INDEX IF NOT EXISTS idx_task_milestones_objective_id ON public.task_milestones(objective_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_milestone_id ON public.task_groups(milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_group_managers_task_group_id ON public.task_group_managers(task_group_id);
CREATE INDEX IF NOT EXISTS idx_task_group_members_task_group_id ON public.task_group_members(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_group_id ON public.tasks(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_employee_id ON public.tasks(assignee_employee_id);
```

- [ ] **Step 4: RLSヘルパー関数を書く**

```sql
CREATE OR REPLACE FUNCTION public.is_task_objective_owner(p_objective_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_objectives o
    WHERE o.id = p_objective_id AND o.owner_employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_objective_owner(UUID) IS 'ログインユーザーが指定した目標の責任者かどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_manager(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_managers m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_group_manager(UUID) IS 'ログインユーザーが指定したタスクグループのマネージャーかどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_member(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_members m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_group_member(UUID) IS 'ログインユーザーが指定したタスクグループのメンバーかどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_owner(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_groups g
    JOIN public.task_milestones ms ON ms.id = g.milestone_id
    WHERE g.id = p_task_group_id
      AND public.is_task_objective_owner(ms.objective_id)
  );
$$;

COMMENT ON FUNCTION public.is_task_group_owner(UUID) IS 'ログインユーザーが指定したタスクグループが属する目標の責任者かどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_participant(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_task_group_manager(p_task_group_id)
    OR public.is_task_group_member(p_task_group_id)
    OR public.is_task_group_owner(p_task_group_id);
$$;

COMMENT ON FUNCTION public.is_task_group_participant(UUID) IS 'ログインユーザーが指定したタスクグループの責任者/マネージャー/メンバーのいずれかかどうか';
```

- [ ] **Step 5: RLSを有効化しポリシーを書く**

```sql
ALTER TABLE public.task_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- task_objectives: 責任者本人 / 参加している配下グループがある / テナント管理者 が閲覧可。作成・更新・削除は責任者本人かテナント管理者のみ
CREATE POLICY "task_objectives_select" ON public.task_objectives
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      owner_employee_id = public.current_employee_id()
      OR public.current_employee_app_role() <> 'employee'
      OR EXISTS (
        SELECT 1 FROM public.task_milestones ms
        JOIN public.task_groups g ON g.milestone_id = ms.id
        WHERE ms.objective_id = task_objectives.id
          AND public.is_task_group_participant(g.id)
      )
    )
  );

CREATE POLICY "task_objectives_insert" ON public.task_objectives
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND owner_employee_id = public.current_employee_id()
  );

CREATE POLICY "task_objectives_update" ON public.task_objectives
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (owner_employee_id = public.current_employee_id() OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_objectives_delete" ON public.task_objectives
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (owner_employee_id = public.current_employee_id() OR public.current_employee_app_role() <> 'employee')
  );

-- task_milestones: 目標の責任者のみ作成/更新/削除。閲覧は目標参加者
CREATE POLICY "task_milestones_select" ON public.task_milestones
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_objective_owner(objective_id)
      OR public.current_employee_app_role() <> 'employee'
      OR EXISTS (
        SELECT 1 FROM public.task_groups g
        WHERE g.milestone_id = task_milestones.id
          AND public.is_task_group_participant(g.id)
      )
    )
  );

CREATE POLICY "task_milestones_insert" ON public.task_milestones
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_task_objective_owner(objective_id)
  );

CREATE POLICY "task_milestones_update" ON public.task_milestones
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_objective_owner(objective_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_milestones_delete" ON public.task_milestones
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_objective_owner(objective_id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_groups: 目標の責任者のみ作成/削除。閲覧・更新は参加者
CREATE POLICY "task_groups_select" ON public.task_groups
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_groups_insert" ON public.task_groups
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.task_milestones ms
      WHERE ms.id = milestone_id AND public.is_task_objective_owner(ms.objective_id)
    )
  );

CREATE POLICY "task_groups_update" ON public.task_groups
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_groups_delete" ON public.task_groups
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_group_managers: 責任者のみ割当・解除可
CREATE POLICY "task_group_managers_select" ON public.task_group_managers
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_managers_insert" ON public.task_group_managers
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_managers_delete" ON public.task_group_managers
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_group_members: 責任者またはマネージャーが割当・解除可
CREATE POLICY "task_group_members_select" ON public.task_group_members
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_members_insert" ON public.task_group_members
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "task_group_members_delete" ON public.task_group_members
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- tasks: 責任者/マネージャーが作成・全項目更新・削除可。担当者(assignee)本人はstatus/progress_percentのみ更新可（カラム制限はServer Action側で行う。Task16参照）
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      assignee_employee_id = public.current_employee_id()
      OR public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );
```

- [ ] **Step 6: マイグレーションを適用して確認する**

Run: `supabase migration up`
Expected: エラーなく適用完了。続けて以下で存在確認する。

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "\d task_objectives" -c "\d tasks"`
Expected: 両テーブルのカラム一覧が表示される。

- [ ] **Step 7: 型定義を再生成する**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: `src/lib/supabase/types.ts` に `task_objectives` 等の型が追加される（差分は `git diff src/lib/supabase/types.ts` で確認）。

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/*_create_task_management_tables.sql src/lib/supabase/types.ts
git commit -m "feat: タスク管理の基本テーブルとRLSポリシーを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: サービスマスタ登録

**Files:**

- Create: `supabase/migrations/<timestamp>_seed_task_management_service_master.sql`

**Interfaces:**

- Consumes: `service_class`, `service_category`, `services`, `tenant_service`, `app_role_service` の既存スキーマ（Task 6 でこのサービスの `route_path` を参照する）
- Produces: `services.route_path = '/tasks'` の1レコード。既存の `service_master_uuid_env_drift` の教訓（UUIDを環境間で直書きしない）に従い、`route_path` を軸に既存行の有無を判定してから INSERT する。

- [ ] **Step 1: 既存のサービス登録パターンを確認する**

Run: `grep -n "INSERT INTO public.service_category\|INSERT INTO public.services" supabase/migrations/*.sql | tail -20`
Expected: 直近に追加された機能のマスタ登録INSERT文が見つかる。カラム構成（`service_class_id` の参照方法、`sort_order` の付け方等）をこの出力から確認し、以降のSQLをそれに揃える。

- [ ] **Step 2: マイグレーションファイルを作成する**

Run: `supabase migration new seed_task_management_service_master`

- [ ] **Step 3: `service_category` と `services` を登録する**

Step1で確認した既存パターンに合わせて以下相当のSQLを書く（`service_class_id` の取得方法は実際のカラム名・既存クエリ例に合わせて調整する。`route_path` に重複がなければ挿入するガード節を必ず入れる）:

```sql
DO $$
DECLARE
  v_service_category_id UUID;
BEGIN
  -- 既存の 大分類(service_class) から適切な行を1件取得する（Step1の調査結果に応じて WHERE 条件を調整）
  INSERT INTO public.service_category (id, service_class_id, name, sort_order)
  SELECT gen_random_uuid(), sc.id, 'タスク管理', 100
  FROM public.service_class sc
  WHERE NOT EXISTS (SELECT 1 FROM public.service_category WHERE name = 'タスク管理')
  LIMIT 1
  RETURNING id INTO v_service_category_id;

  IF v_service_category_id IS NULL THEN
    SELECT id INTO v_service_category_id FROM public.service_category WHERE name = 'タスク管理' LIMIT 1;
  END IF;

  INSERT INTO public.services (id, service_category_id, name, route_path, sort_order)
  SELECT gen_random_uuid(), v_service_category_id, 'タスク管理', '/tasks', 100
  WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE route_path = '/tasks');
END $$;
```

- [ ] **Step 4: `app_role_service` を全ロールに登録する**

```sql
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, s.id
FROM public.app_role ar
CROSS JOIN public.services s
WHERE s.route_path = '/tasks'
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service x
    WHERE x.app_role_id = ar.id AND x.service_id = s.id
  );
```

- [ ] **Step 5: `tenant_service` を既存の全契約テナントに登録する**

```sql
INSERT INTO public.tenant_service (id, tenant_id, service_id)
SELECT gen_random_uuid(), t.id, s.id
FROM public.tenants t
CROSS JOIN public.services s
WHERE s.route_path = '/tasks'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_service x
    WHERE x.tenant_id = t.id AND x.service_id = s.id
  );
```

- [ ] **Step 6: 適用して確認する**

Run: `supabase migration up`

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT s.route_path, count(*) FROM public.services s JOIN public.app_role_service ars ON ars.service_id = s.id WHERE s.route_path = '/tasks' GROUP BY s.route_path;"`
Expected: 1行返り、count が既存 `app_role` の総数と一致する。

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_seed_task_management_service_master.sql
git commit -m "feat: タスク管理をサービスマスタに登録

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: 型・Zodスキーマ

**Files:**

- Create: `src/features/task-management/types.ts`
- Test: `src/features/task-management/types.test.ts`

**Interfaces:**

- Produces: `TASK_STATUSES`, `TaskStatus`, `TASK_PRIORITIES`, `TaskPriority`, `createObjectiveSchema`, `CreateObjectiveInput`, `createMilestoneSchema`, `CreateMilestoneInput`, `createTaskGroupSchema`, `CreateTaskGroupInput`, `assignManagerSchema`, `AssignManagerInput`, `assignMemberSchema`, `AssignMemberInput`, `removeMemberSchema`, `RemoveMemberInput`, `createTaskSchema`, `CreateTaskInput`, `updateTaskStatusSchema`, `UpdateTaskStatusInput`, `updateTaskProgressSchema`, `UpdateTaskProgressInput`, インターフェース `TaskObjective`, `TaskMilestone`, `TaskGroup`, `Task`。以降の全タスクがこれらの型・スキーマ名に依存する。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/features/task-management/types.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createObjectiveSchema,
  createTaskSchema,
  updateTaskStatusSchema,
  updateTaskProgressSchema,
} from './types'

test('目標作成: titleのみで成功する', () => {
  const result = createObjectiveSchema.safeParse({ title: '2026年下期の採用強化' })
  assert.equal(result.success, true)
})

test('目標作成: titleが空文字は拒否される', () => {
  const result = createObjectiveSchema.safeParse({ title: '' })
  assert.equal(result.success, false)
})

test('目標作成: dueDateの形式が不正なら拒否される', () => {
  const result = createObjectiveSchema.safeParse({ title: 'x', dueDate: '2026/09/07' })
  assert.equal(result.success, false)
})

test('タスク作成: priorityを省略するとnormalが補完される', () => {
  const result = createTaskSchema.safeParse({
    taskGroupId: '11111111-1111-4111-8111-111111111111',
    title: '要件定義',
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.priority, 'normal')
  }
})

test('タスク作成: taskGroupIdがUUID形式でなければ拒否される', () => {
  const result = createTaskSchema.safeParse({ taskGroupId: 'not-a-uuid', title: '要件定義' })
  assert.equal(result.success, false)
})

test('ステータス更新: 未定義のstatus値は拒否される', () => {
  const result = updateTaskStatusSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    status: 'unknown',
  })
  assert.equal(result.success, false)
})

test('進捗率更新: 101は拒否される', () => {
  const result = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 101,
  })
  assert.equal(result.success, false)
})

test('進捗率更新: 0と100は許容される', () => {
  const min = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 0,
  })
  const max = updateTaskProgressSchema.safeParse({
    taskId: '11111111-1111-4111-8111-111111111111',
    progressPercent: 100,
  })
  assert.equal(min.success, true)
  assert.equal(max.success, true)
})
```

- [ ] **Step 2: テストを実行し失敗を確認する**

Run: `node --import tsx --test src/features/task-management/types.test.ts`
Expected: `Cannot find module './types'` で FAIL

- [ ] **Step 3: 最小実装を書く**

```typescript
// src/features/task-management/types.ts
import { z } from 'zod'

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'blocked'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付はYYYY-MM-DD形式で指定する')

export const createObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>

export const createMilestoneSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: dateStringSchema.optional(),
})
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>

export const createTaskGroupSchema = z.object({
  milestoneId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
})
export type CreateTaskGroupInput = z.infer<typeof createTaskGroupSchema>

export const assignManagerSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AssignManagerInput = z.infer<typeof assignManagerSchema>

export const assignMemberSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type AssignMemberInput = z.infer<typeof assignMemberSchema>

export const removeMemberSchema = z.object({
  taskGroupId: z.string().uuid(),
  employeeId: z.string().uuid(),
})
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>

export const createTaskSchema = z.object({
  taskGroupId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  assigneeEmployeeId: z.string().uuid().optional(),
  priority: z.enum(TASK_PRIORITIES).default('normal'),
  dueDate: dateStringSchema.optional(),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(TASK_STATUSES),
})
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>

export const updateTaskProgressSchema = z.object({
  taskId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
})
export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>

export type TaskLifecycleStatus = 'active' | 'completed' | 'archived'

export interface TaskObjective {
  id: string
  tenantId: string
  ownerEmployeeId: string
  title: string
  description: string | null
  status: TaskLifecycleStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskMilestone {
  id: string
  tenantId: string
  objectiveId: string
  title: string
  description: string | null
  dueDate: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}

export interface TaskGroup {
  id: string
  tenantId: string
  milestoneId: string
  name: string
  description: string | null
  status: TaskLifecycleStatus
  sortOrder: number
}

export interface Task {
  id: string
  tenantId: string
  taskGroupId: string
  title: string
  description: string | null
  assigneeEmployeeId: string | null
  status: TaskStatus
  progressPercent: number
  priority: TaskPriority
  dueDate: string | null
  sortOrder: number
}
```

- [ ] **Step 4: テストを実行し成功を確認する**

Run: `node --import tsx --test src/features/task-management/types.test.ts`
Expected: 全件 PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/types.ts src/features/task-management/types.test.ts
git commit -m "feat: タスク管理の型・Zodスキーマを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 進捗ロールアップ計算

**Files:**

- Create: `src/features/task-management/progress.ts`
- Test: `src/features/task-management/progress.test.ts`

**Interfaces:**

- Consumes: なし（純粋関数、外部依存なし）
- Produces: `calculateAverageProgress(percentages: number[]): number`。Task 9/10/15 のUIがタスクグループ・マイルストーン・目標の進捗率表示に使う。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/features/task-management/progress.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateAverageProgress } from './progress'

test('空配列なら0を返す', () => {
  assert.equal(calculateAverageProgress([]), 0)
})

test('単一要素はその値を返す', () => {
  assert.equal(calculateAverageProgress([40]), 40)
})

test('複数要素は平均値を四捨五入して返す', () => {
  assert.equal(calculateAverageProgress([0, 50, 100]), 50)
})

test('割り切れない平均は四捨五入する', () => {
  assert.equal(calculateAverageProgress([1, 2]), 2)
})
```

- [ ] **Step 2: テストを実行し失敗を確認する**

Run: `node --import tsx --test src/features/task-management/progress.test.ts`
Expected: `Cannot find module './progress'` で FAIL

- [ ] **Step 3: 最小実装を書く**

```typescript
// src/features/task-management/progress.ts
export function calculateAverageProgress(percentages: number[]): number {
  if (percentages.length === 0) return 0
  const sum = percentages.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / percentages.length)
}
```

- [ ] **Step 4: テストを実行し成功を確認する**

Run: `node --import tsx --test src/features/task-management/progress.test.ts`
Expected: 全件 PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/progress.ts src/features/task-management/progress.test.ts
git commit -m "feat: タスク進捗率のロールアップ計算を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: 役割判定ロジック（UI表示制御用）

**Files:**

- Create: `src/features/task-management/permissions.ts`
- Test: `src/features/task-management/permissions.test.ts`

**Interfaces:**

- Consumes: なし（純粋関数）
- Produces: `isObjectiveOwner(ownerEmployeeId: string, currentEmployeeId: string): boolean`, `isTaskGroupManager(managerEmployeeIds: string[], currentEmployeeId: string): boolean`, `isTaskGroupMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean`, `canAssignManager(isOwner: boolean): boolean`, `canAssignMember(isOwner: boolean, isManager: boolean): boolean`。Task 10/12/15 のUIがボタン表示可否の判定に使う（最終防衛はDBのRLS。これはUI表示用の軽量判定）。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/features/task-management/permissions.test.ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isObjectiveOwner,
  isTaskGroupManager,
  isTaskGroupMember,
  canAssignManager,
  canAssignMember,
} from './permissions'

test('責任者本人ならtrue', () => {
  assert.equal(isObjectiveOwner('emp-1', 'emp-1'), true)
})

test('責任者本人でなければfalse', () => {
  assert.equal(isObjectiveOwner('emp-1', 'emp-2'), false)
})

test('マネージャー一覧に含まれればtrue', () => {
  assert.equal(isTaskGroupManager(['emp-1', 'emp-2'], 'emp-2'), true)
})

test('マネージャー一覧に含まれなければfalse', () => {
  assert.equal(isTaskGroupManager(['emp-1'], 'emp-2'), false)
})

test('メンバー一覧に含まれればtrue', () => {
  assert.equal(isTaskGroupMember(['emp-3'], 'emp-3'), true)
})

test('マネージャー割当は責任者のみ可能', () => {
  assert.equal(canAssignManager(true), true)
  assert.equal(canAssignManager(false), false)
})

test('メンバー割当は責任者かマネージャーなら可能', () => {
  assert.equal(canAssignMember(true, false), true)
  assert.equal(canAssignMember(false, true), true)
  assert.equal(canAssignMember(false, false), false)
})
```

- [ ] **Step 2: テストを実行し失敗を確認する**

Run: `node --import tsx --test src/features/task-management/permissions.test.ts`
Expected: `Cannot find module './permissions'` で FAIL

- [ ] **Step 3: 最小実装を書く**

```typescript
// src/features/task-management/permissions.ts
export function isObjectiveOwner(ownerEmployeeId: string, currentEmployeeId: string): boolean {
  return ownerEmployeeId === currentEmployeeId
}

export function isTaskGroupManager(
  managerEmployeeIds: string[],
  currentEmployeeId: string
): boolean {
  return managerEmployeeIds.includes(currentEmployeeId)
}

export function isTaskGroupMember(memberEmployeeIds: string[], currentEmployeeId: string): boolean {
  return memberEmployeeIds.includes(currentEmployeeId)
}

export function canAssignManager(isOwner: boolean): boolean {
  return isOwner
}

export function canAssignMember(isOwner: boolean, isManager: boolean): boolean {
  return isOwner || isManager
}
```

- [ ] **Step 4: テストを実行し成功を確認する**

Run: `node --import tsx --test src/features/task-management/permissions.test.ts`
Expected: 全件 PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/permissions.ts src/features/task-management/permissions.test.ts
git commit -m "feat: タスク管理の役割判定ロジックを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: ルート定数追加

**Files:**

- Modify: `src/config/routes.ts`

**Interfaces:**

- Consumes: 既存 `APP_ROUTES` オブジェクトの構造（`Read` して既存のネスト方法・関数形式ルートの書き方に合わせる）
- Produces: `APP_ROUTES.tasks.root`, `APP_ROUTES.tasks.objectiveNew`, `APP_ROUTES.tasks.objectiveDetail(id: string)`, `APP_ROUTES.tasks.groupDetail(id: string)`。Task 8/10/15 のUIがこれらを使う。

- [ ] **Step 1: 既存ファイルを読み、命名パターンを確認する**

`src/config/routes.ts` を読み、既存の動的ルート（`[id]` を含むもの）がどう関数化されているか（例: `xxxDetail: (id: string) => \`/xxx/${id}\``）を確認する。

- [ ] **Step 2: `tasks` エントリを追加する**

既存の構造に合わせて以下相当を `APP_ROUTES` に追加する:

```typescript
tasks: {
  root: '/tasks',
  objectiveNew: '/tasks/objectives/new',
  objectiveDetail: (id: string) => `/tasks/objectives/${id}`,
  groupDetail: (id: string) => `/tasks/groups/${id}`,
},
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/config/routes.ts
git commit -m "feat: タスク管理のルート定数を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: 目標一覧取得 + 目標作成

**Files:**

- Create: `src/features/task-management/queries.ts`
- Create: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: `TaskObjective`（Task3）, `createObjectiveSchema` / `CreateObjectiveInput`（Task3）, `getServerUser()`（`@/lib/auth/server-user`）, `createClient()`（`@/lib/supabase/server`）
- Produces: `getMyObjectives(supabase: SupabaseClient): Promise<TaskObjective[]>`, `createObjective(input: CreateObjectiveInput): Promise<{ id: string }>`。Task 8 の一覧ページ・作成フォームが使う。

- [ ] **Step 1: `queries.ts` を書く**

```typescript
// src/features/task-management/queries.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TaskObjective } from './types'

function mapObjective(row: Database['public']['Tables']['task_objectives']['Row']): TaskObjective {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerEmployeeId: row.owner_employee_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskObjective['status'],
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getMyObjectives(
  supabase: SupabaseClient<Database>
): Promise<TaskObjective[]> {
  const { data, error } = await supabase
    .from('task_objectives')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapObjective)
}
```

- [ ] **Step 2: `actions.ts` を書く**

Server Action テンプレート（CLAUDE.md）に従う:

```typescript
// src/features/task-management/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { createObjectiveSchema, type CreateObjectiveInput } from './types'

export async function createObjective(input: CreateObjectiveInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = createObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
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

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: data.id }
}
```

- [ ] **Step 2.5: `@/lib/auth/server-user` の `AppUser` に `tenant_id` / `employee_id` が存在することを確認する**

Run: `grep -n "tenant_id\|employee_id" src/lib/auth/server-user.ts`
Expected: 両フィールドが `AppUser` 型に定義されている（CLAUDE.mdの「ユーザー情報」表の通り）。存在しない場合はこのタスクを止め、実際のフィールド名に合わせて Step 2 を書き直す。

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/queries.ts src/features/task-management/actions.ts
git commit -m "feat: 目標の一覧取得と作成アクションを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: 目標作成UI・一覧UI

**Files:**

- Create: `src/features/task-management/components/ObjectiveCard.tsx`
- Create: `src/features/task-management/components/ObjectiveForm.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/error.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/objectives/new/page.tsx`

**Interfaces:**

- Consumes: `getMyObjectives`, `createObjective`（Task7）, `TaskObjective`（Task3）, `APP_ROUTES.tasks`（Task6）, `getServerUser()`
- Produces: 画面 `/tasks`（一覧）, `/tasks/objectives/new`（作成）。Task 10 の目標詳細ページへのリンク元になる。

- [ ] **Step 1: `ObjectiveCard.tsx` を書く**

```tsx
// src/features/task-management/components/ObjectiveCard.tsx
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { TaskObjective } from '../types'

interface ObjectiveCardProps {
  objective: TaskObjective
}

export function ObjectiveCard({ objective }: ObjectiveCardProps) {
  return (
    <Link
      href={APP_ROUTES.tasks.objectiveDetail(objective.id)}
      className="block bg-white rounded-lg border border-slate-200 shadow-xs p-5 hover:bg-[#f6f8fa]"
    >
      <h3 className="text-sm font-semibold text-slate-900">{objective.title}</h3>
      {objective.description && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{objective.description}</p>
      )}
      {objective.dueDate && (
        <p className="mt-2 text-xs text-slate-400">期限: {objective.dueDate}</p>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: `ObjectiveForm.tsx` を書く**

```tsx
// src/features/task-management/components/ObjectiveForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createObjective } from '../actions'
import { APP_ROUTES } from '@/config/routes'

export function ObjectiveForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id } = await createObjective({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        router.push(APP_ROUTES.tasks.objectiveDetail(id))
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xl">
      <label className="text-xs font-medium text-slate-700">
        目標名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        説明
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        期限
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        目標を作成
      </button>
    </form>
  )
}
```

- [ ] **Step 3: 一覧ページ `page.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyObjectives } from '@/features/task-management/queries'
import { ObjectiveCard } from '@/features/task-management/components/ObjectiveCard'
import { APP_ROUTES } from '@/config/routes'

export default async function TasksPage() {
  const supabase = await createClient()
  const objectives = await getMyObjectives(supabase)

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">タスク管理</h1>
        <Link
          href={APP_ROUTES.tasks.objectiveNew}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          新しい目標を作成
        </Link>
      </div>
      {objectives.length === 0 ? (
        <p className="text-xs text-slate-500">関与している目標がまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objectives.map(objective => (
            <ObjectiveCard key={objective.id} objective={objective} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: `loading.tsx` / `error.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/loading.tsx
export default function Loading() {
  return <div className="p-6 text-xs text-slate-500">読み込み中...</div>
}
```

```tsx
// src/app/(tenant)/(tenant-users)/tasks/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-xs text-red-600">タスク管理の読み込みに失敗しました: {error.message}</p>
      <button onClick={reset} className="mt-2 text-xs text-[#FD7601] underline">
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 作成ページ `objectives/new/page.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/new/page.tsx
import { ObjectiveForm } from '@/features/task-management/components/ObjectiveForm'

export default function NewObjectivePage() {
  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">新しい目標を作成</h1>
      <ObjectiveForm />
    </div>
  )
}
```

- [ ] **Step 6: 手動で動作確認する**

Run: `npm run dev`
Expected: ブラウザで `/tasks` にアクセスし、「新しい目標を作成」→フォーム入力→送信後に目標詳細URL（この時点では未実装のため404でよい）へ遷移すること、`/tasks` に戻ると一覧に作成した目標が表示されることを確認する。

- [ ] **Step 7: Commit**

```bash
git add src/features/task-management/components/ObjectiveCard.tsx src/features/task-management/components/ObjectiveForm.tsx src/app/\(tenant\)/\(tenant-users\)/tasks/
git commit -m "feat: 目標の一覧・作成UIを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: 目標詳細取得 + マイルストーン作成

**Files:**

- Modify: `src/features/task-management/queries.ts`
- Modify: `src/features/task-management/actions.ts`

**Interfaces:**

- Consumes: `TaskMilestone`（Task3）, `createMilestoneSchema` / `CreateMilestoneInput`（Task3）, `calculateAverageProgress`（Task4）
- Produces: `getObjectiveDetail(supabase, objectiveId: string): Promise<ObjectiveDetail>`（新規 export 型 `ObjectiveDetail = { objective: TaskObjective; milestones: TaskMilestone[] }`）, `createMilestone(input: CreateMilestoneInput): Promise<{ id: string }>`。Task 10 の詳細ページが使う。

- [ ] **Step 1: `queries.ts` に追記する**

```typescript
// src/features/task-management/queries.ts に追記
import type { TaskMilestone } from './types'

function mapMilestone(row: Database['public']['Tables']['task_milestones']['Row']): TaskMilestone {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    objectiveId: row.objective_id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    status: row.status as TaskMilestone['status'],
    sortOrder: row.sort_order,
  }
}

export interface ObjectiveDetail {
  objective: TaskObjective
  milestones: TaskMilestone[]
}

export async function getObjectiveDetail(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<ObjectiveDetail> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('*')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('*')
    .eq('objective_id', objectiveId)
    .order('sort_order', { ascending: true })

  if (milestoneError) throw milestoneError

  return {
    objective: mapObjective(objectiveRow),
    milestones: (milestoneRows ?? []).map(mapMilestone),
  }
}
```

- [ ] **Step 2: `actions.ts` に追記する**

```typescript
// src/features/task-management/actions.ts に追記
import { createMilestoneSchema, type CreateMilestoneInput } from './types'

export async function createMilestone(input: CreateMilestoneInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = createMilestoneSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_milestones')
    .insert({
      tenant_id: user.tenant_id,
      objective_id: parsed.objectiveId,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(parsed.objectiveId))

  return { id: data.id }
}
```

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/queries.ts src/features/task-management/actions.ts
git commit -m "feat: 目標詳細取得とマイルストーン作成アクションを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: 目標詳細UI

**Files:**

- Create: `src/features/task-management/components/MilestoneList.tsx`
- Create: `src/features/task-management/components/MilestoneForm.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/error.tsx`

**Interfaces:**

- Consumes: `getObjectiveDetail`（Task9）, `createMilestone`（Task9）, `isObjectiveOwner`（Task5）, `getServerUser()`
- Produces: 画面 `/tasks/objectives/[id]`。責任者のみマイルストーン作成フォームが表示される。Task12でこの画面にタスクグループ作成・マネージャー割当UIを追加する。

- [ ] **Step 1: `MilestoneForm.tsx` を書く**（Step2の `ObjectiveForm.tsx` と同型、objectiveId を hidden で保持）

```tsx
// src/features/task-management/components/MilestoneForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMilestone } from '../actions'

interface MilestoneFormProps {
  objectiveId: string
}

export function MilestoneForm({ objectiveId }: MilestoneFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createMilestone({ objectiveId, title, dueDate: dueDate || undefined })
        setTitle('')
        setDueDate('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'マイルストーンの作成に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        マイルストーン名
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="text-xs font-medium text-slate-700">
        期限
        <input
          type="date"
          value={dueDate}
          onChange={e => setDueDate(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
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

- [ ] **Step 2: `MilestoneList.tsx` を書く**

```tsx
// src/features/task-management/components/MilestoneList.tsx
import type { TaskMilestone } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
}

export function MilestoneList({ milestones }: MilestoneListProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-slate-500">マイルストーンがまだありません。</p>
  }

  return (
    <ul className="space-y-2">
      {milestones.map(milestone => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">{milestone.title}</p>
          {milestone.dueDate && <p className="text-xs text-slate-400">期限: {milestone.dueDate}</p>}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: `page.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getObjectiveDetail } from '@/features/task-management/queries'
import { MilestoneList } from '@/features/task-management/components/MilestoneList'
import { MilestoneForm } from '@/features/task-management/components/MilestoneForm'
import { isObjectiveOwner } from '@/features/task-management/permissions'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const { objective, milestones } = await getObjectiveDetail(supabase, id)
  const isOwner = user ? isObjectiveOwner(objective.ownerEmployeeId, user.employee_id) : false

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <h1 className="text-lg font-semibold text-slate-900">{objective.title}</h1>
      {objective.description && <p className="text-xs text-slate-500">{objective.description}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">マイルストーン</h2>
        <MilestoneList milestones={milestones} />
        {isOwner && <MilestoneForm objectiveId={objective.id} />}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: `loading.tsx` / `error.tsx` を書く**（Task8のものと同型。`objectives/[id]/` 配下に配置）

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/loading.tsx
export default function Loading() {
  return <div className="p-6 text-xs text-slate-500">読み込み中...</div>
}
```

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-xs text-red-600">目標の読み込みに失敗しました: {error.message}</p>
      <button onClick={reset} className="mt-2 text-xs text-[#FD7601] underline">
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 手動で動作確認する**

Run: `npm run dev`
Expected: `/tasks` から作成した目標のカードをクリックすると目標詳細ページに遷移し、タイトル・説明が表示される。責任者本人でログインしている場合のみマイルストーン作成フォームが見え、追加すると一覧に反映される。

- [ ] **Step 6: Commit**

```bash
git add src/features/task-management/components/MilestoneList.tsx src/features/task-management/components/MilestoneForm.tsx "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/"
git commit -m "feat: 目標詳細ページとマイルストーン管理UIを追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: タスクグループ作成

**Files:**

- Modify: `src/features/task-management/queries.ts`（`getObjectiveDetail` の戻り値にタスクグループ一覧を含める）
- Modify: `src/features/task-management/actions.ts`
- Create: `src/features/task-management/components/TaskGroupForm.tsx`
- Modify: `src/features/task-management/components/MilestoneList.tsx`（タスクグループ一覧・作成フォームを表示）
- Modify: `src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx`

**Interfaces:**

- Consumes: `TaskGroup`（Task3）, `createTaskGroupSchema` / `CreateTaskGroupInput`（Task3）
- Produces: `createTaskGroup(input: CreateTaskGroupInput): Promise<{ id: string }>`。`ObjectiveDetail` 型に `taskGroupsByMilestoneId: Record<string, TaskGroup[]>` を追加。Task 15 のカンバン画面への導線になる。

- [ ] **Step 1: `queries.ts` を拡張する**

```typescript
// src/features/task-management/queries.ts の ObjectiveDetail / getObjectiveDetail を置き換え
import type { TaskGroup } from './types'

function mapTaskGroup(row: Database['public']['Tables']['task_groups']['Row']): TaskGroup {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    milestoneId: row.milestone_id,
    name: row.name,
    description: row.description,
    status: row.status as TaskGroup['status'],
    sortOrder: row.sort_order,
  }
}

export interface ObjectiveDetail {
  objective: TaskObjective
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
}

export async function getObjectiveDetail(
  supabase: SupabaseClient<Database>,
  objectiveId: string
): Promise<ObjectiveDetail> {
  const { data: objectiveRow, error: objectiveError } = await supabase
    .from('task_objectives')
    .select('*')
    .eq('id', objectiveId)
    .single()

  if (objectiveError) throw objectiveError

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('*')
    .eq('objective_id', objectiveId)
    .order('sort_order', { ascending: true })

  if (milestoneError) throw milestoneError

  const milestones = (milestoneRows ?? []).map(mapMilestone)
  const milestoneIds = milestones.map(m => m.id)

  const taskGroupsByMilestoneId: Record<string, TaskGroup[]> = {}
  if (milestoneIds.length > 0) {
    const { data: groupRows, error: groupError } = await supabase
      .from('task_groups')
      .select('*')
      .in('milestone_id', milestoneIds)
      .order('sort_order', { ascending: true })

    if (groupError) throw groupError

    for (const row of groupRows ?? []) {
      const group = mapTaskGroup(row)
      taskGroupsByMilestoneId[group.milestoneId] ??= []
      taskGroupsByMilestoneId[group.milestoneId].push(group)
    }
  }

  return {
    objective: mapObjective(objectiveRow),
    milestones,
    taskGroupsByMilestoneId,
  }
}
```

- [ ] **Step 2: `actions.ts` に追記する**

```typescript
// src/features/task-management/actions.ts に追記
import { createTaskGroupSchema, type CreateTaskGroupInput } from './types'

export async function createTaskGroup(input: CreateTaskGroupInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = createTaskGroupSchema.parse(input)
  const supabase = await createClient()

  const { data: milestone, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('objective_id')
    .eq('id', parsed.milestoneId)
    .single()

  if (milestoneError) throw milestoneError

  const { data, error } = await supabase
    .from('task_groups')
    .insert({
      tenant_id: user.tenant_id,
      milestone_id: parsed.milestoneId,
      name: parsed.name,
      description: parsed.description ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(milestone.objective_id))

  return { id: data.id }
}
```

- [ ] **Step 3: `TaskGroupForm.tsx` を書く**

```tsx
// src/features/task-management/components/TaskGroupForm.tsx
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
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createTaskGroup({ milestoneId, name })
        setName('')
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

- [ ] **Step 4: `MilestoneList.tsx` を拡張してタスクグループを表示する**

```tsx
// src/features/task-management/components/MilestoneList.tsx を置き換え
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { TaskGroupForm } from './TaskGroupForm'
import type { TaskMilestone, TaskGroup } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  canCreateTaskGroup: boolean
}

export function MilestoneList({
  milestones,
  taskGroupsByMilestoneId,
  canCreateTaskGroup,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-slate-500">マイルストーンがまだありません。</p>
  }

  return (
    <ul className="space-y-3">
      {milestones.map(milestone => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">{milestone.title}</p>
          {milestone.dueDate && <p className="text-xs text-slate-400">期限: {milestone.dueDate}</p>}
          <ul className="mt-2 space-y-1">
            {(taskGroupsByMilestoneId[milestone.id] ?? []).map(group => (
              <li key={group.id}>
                <Link
                  href={APP_ROUTES.tasks.groupDetail(group.id)}
                  className="text-xs text-[#FD7601] underline"
                >
                  {group.name}
                </Link>
              </li>
            ))}
          </ul>
          {canCreateTaskGroup && <TaskGroupForm milestoneId={milestone.id} />}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: `objectives/[id]/page.tsx` を更新する**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx の該当箇所を置き換え
const { objective, milestones, taskGroupsByMilestoneId } = await getObjectiveDetail(supabase, id)
// ...
<MilestoneList
  milestones={milestones}
  taskGroupsByMilestoneId={taskGroupsByMilestoneId}
  canCreateTaskGroup={isOwner}
/>
```

- [ ] **Step 6: 手動で動作確認する**

Run: `npm run dev`
Expected: 責任者としてマイルストーンの下に「タスクグループ名」を入力して追加すると、そのマイルストーンの下にリンクとして表示される。

- [ ] **Step 7: Commit**

```bash
git add src/features/task-management/
git add "src/app/(tenant)/(tenant-users)/tasks/objectives/[id]/page.tsx"
git commit -m "feat: タスクグループ作成機能を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: マネージャー/メンバー割当

**Files:**

- Modify: `src/features/task-management/queries.ts`（`getTaskGroupBoard` の前段として `getTaskGroupSummary` を追加）
- Modify: `src/features/task-management/actions.ts`
- Create: `src/features/task-management/components/ManagerAssignForm.tsx`
- Create: `src/features/task-management/components/MemberAssignForm.tsx`

**Interfaces:**

- Consumes: `assignManagerSchema`/`assignMemberSchema`/`removeMemberSchema`（Task3）, `canAssignManager`/`canAssignMember`（Task5）
- Produces: `assignManager(input: AssignManagerInput): Promise<void>`, `assignMember(input: AssignMemberInput): Promise<void>`, `removeMember(input: RemoveMemberInput): Promise<void>`, `getTaskGroupSummary(supabase, taskGroupId): Promise<TaskGroupSummary>`（`TaskGroupSummary = { group: TaskGroup; managerEmployeeIds: string[]; memberEmployeeIds: string[] }`）。Task14/15がこれを拡張してカンバン画面を作る。

- [ ] **Step 1: `queries.ts` に `getTaskGroupSummary` を追記する**

```typescript
// src/features/task-management/queries.ts に追記
export interface TaskGroupSummary {
  group: TaskGroup
  managerEmployeeIds: string[]
  memberEmployeeIds: string[]
}

export async function getTaskGroupSummary(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<TaskGroupSummary> {
  const { data: groupRow, error: groupError } = await supabase
    .from('task_groups')
    .select('*')
    .eq('id', taskGroupId)
    .single()

  if (groupError) throw groupError

  const { data: managerRows, error: managerError } = await supabase
    .from('task_group_managers')
    .select('employee_id')
    .eq('task_group_id', taskGroupId)

  if (managerError) throw managerError

  const { data: memberRows, error: memberError } = await supabase
    .from('task_group_members')
    .select('employee_id')
    .eq('task_group_id', taskGroupId)

  if (memberError) throw memberError

  return {
    group: mapTaskGroup(groupRow),
    managerEmployeeIds: (managerRows ?? []).map(r => r.employee_id),
    memberEmployeeIds: (memberRows ?? []).map(r => r.employee_id),
  }
}
```

- [ ] **Step 2: `actions.ts` に割当系アクションを追記する**

```typescript
// src/features/task-management/actions.ts に追記
import {
  assignManagerSchema,
  assignMemberSchema,
  removeMemberSchema,
  type AssignManagerInput,
  type AssignMemberInput,
  type RemoveMemberInput,
} from './types'

export async function assignManager(input: AssignManagerInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = assignManagerSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('task_group_managers').insert({
    tenant_id: user.tenant_id,
    task_group_id: parsed.taskGroupId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

export async function assignMember(input: AssignMemberInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = assignMemberSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('task_group_members').insert({
    tenant_id: user.tenant_id,
    task_group_id: parsed.taskGroupId,
    employee_id: parsed.employeeId,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}

export async function removeMember(input: RemoveMemberInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = removeMemberSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('task_group_members')
    .delete()
    .eq('task_group_id', parsed.taskGroupId)
    .eq('employee_id', parsed.employeeId)

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))
}
```

- [ ] **Step 3: 割当フォームを書く**（メンバー選択は Phase1 では employeeId のテキスト入力とする。社員検索UIは既存の従業員選択コンポーネントがあれば Task13 着手前に調査し流用する）

```tsx
// src/features/task-management/components/ManagerAssignForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignManager } from '../actions'

interface ManagerAssignFormProps {
  taskGroupId: string
}

export function ManagerAssignForm({ taskGroupId }: ManagerAssignFormProps) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await assignManager({ taskGroupId, employeeId })
        setEmployeeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'マネージャーの割当に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        マネージャーの従業員ID
        <input
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        割り当てる
      </button>
    </form>
  )
}
```

```tsx
// src/features/task-management/components/MemberAssignForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignMember, removeMember } from '../actions'

interface MemberAssignFormProps {
  taskGroupId: string
  memberEmployeeIds: string[]
}

export function MemberAssignForm({ taskGroupId, memberEmployeeIds }: MemberAssignFormProps) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await assignMember({ taskGroupId, employeeId })
        setEmployeeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'メンバーの追加に失敗しました')
      }
    })
  }

  function handleRemove(targetEmployeeId: string) {
    startTransition(async () => {
      await removeMember({ taskGroupId, employeeId: targetEmployeeId })
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {memberEmployeeIds.map(id => (
          <li
            key={id}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs"
          >
            {id}
            <button onClick={() => handleRemove(id)} className="text-slate-400 hover:text-red-600">
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="text-xs font-medium text-slate-700">
          追加するメンバーの従業員ID
          <input
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            required
            className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
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
    </div>
  )
}
```

- [ ] **Step 4: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/
git commit -m "feat: タスクグループへのマネージャー/メンバー割当機能を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: タスク作成

**Files:**

- Modify: `src/features/task-management/actions.ts`
- Create: `src/features/task-management/components/TaskForm.tsx`

**Interfaces:**

- Consumes: `createTaskSchema` / `CreateTaskInput`（Task3）
- Produces: `createTask(input: CreateTaskInput): Promise<{ id: string }>`。Task15のカンバン画面がこのフォームを埋め込む。

- [ ] **Step 1: `actions.ts` に追記する**

```typescript
// src/features/task-management/actions.ts に追記
import { createTaskSchema, type CreateTaskInput } from './types'

export async function createTask(input: CreateTaskInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = createTaskSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      tenant_id: user.tenant_id,
      task_group_id: parsed.taskGroupId,
      title: parsed.title,
      description: parsed.description ?? null,
      assignee_employee_id: parsed.assigneeEmployeeId ?? null,
      priority: parsed.priority,
      due_date: parsed.dueDate ?? null,
      created_by_employee_id: user.employee_id,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(parsed.taskGroupId))

  return { id: data.id }
}
```

- [ ] **Step 2: `TaskForm.tsx` を書く**

```tsx
// src/features/task-management/components/TaskForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '../actions'
import { TASK_PRIORITIES, type TaskPriority } from '../types'

interface TaskFormProps {
  taskGroupId: string
}

export function TaskForm({ taskGroupId }: TaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [assigneeEmployeeId, setAssigneeEmployeeId] = useState('')
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
          assigneeEmployeeId: assigneeEmployeeId || undefined,
          priority,
        })
        setTitle('')
        setAssigneeEmployeeId('')
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
        担当者の従業員ID
        <input
          value={assigneeEmployeeId}
          onChange={e => setAssigneeEmployeeId(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
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

- [ ] **Step 3: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/features/task-management/actions.ts src/features/task-management/components/TaskForm.tsx
git commit -m "feat: タスク作成機能を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: タスクグループ詳細取得（カンバン用）

**Files:**

- Modify: `src/features/task-management/queries.ts`

**Interfaces:**

- Consumes: `Task`（Task3）, `TaskGroupSummary`（Task12）, `calculateAverageProgress`（Task4）
- Produces: `getTaskGroupBoard(supabase, taskGroupId): Promise<TaskGroupBoard>`（`TaskGroupBoard = TaskGroupSummary & { tasks: Task[]; averageProgress: number }`）。Task15のカンバン画面が使う。

- [ ] **Step 1: `queries.ts` に追記する**

```typescript
// src/features/task-management/queries.ts に追記
import { calculateAverageProgress } from './progress'

function mapTask(row: Database['public']['Tables']['tasks']['Row']): Task {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    taskGroupId: row.task_group_id,
    title: row.title,
    description: row.description,
    assigneeEmployeeId: row.assignee_employee_id,
    status: row.status as Task['status'],
    progressPercent: row.progress_percent,
    priority: row.priority as Task['priority'],
    dueDate: row.due_date,
    sortOrder: row.sort_order,
  }
}

export interface TaskGroupBoard extends TaskGroupSummary {
  tasks: Task[]
  averageProgress: number
}

export async function getTaskGroupBoard(
  supabase: SupabaseClient<Database>,
  taskGroupId: string
): Promise<TaskGroupBoard> {
  const summary = await getTaskGroupSummary(supabase, taskGroupId)

  const { data: taskRows, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_group_id', taskGroupId)
    .order('sort_order', { ascending: true })

  if (taskError) throw taskError

  const tasks = (taskRows ?? []).map(mapTask)

  return {
    ...summary,
    tasks,
    averageProgress: calculateAverageProgress(tasks.map(t => t.progressPercent)),
  }
}
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/task-management/queries.ts
git commit -m "feat: タスクグループのカンバン用データ取得を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: カンバンボードUI

**Files:**

- Create: `src/features/task-management/components/KanbanBoard.tsx`
- Create: `src/features/task-management/components/TaskCard.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tasks/groups/[id]/error.tsx`

**Interfaces:**

- Consumes: `getTaskGroupBoard`（Task14）, `TASK_STATUSES`（Task3）, `isTaskGroupManager`/`isTaskGroupMember`/`canAssignMember`（Task5）, `ManagerAssignForm`/`MemberAssignForm`（Task12）, `TaskForm`（Task13）
- Produces: 画面 `/tasks/groups/[id]`。ステータス列ごとにタスクをグルーピングして表示する（ドラッグ&ドロップはPhase1では実装せず、Task16でステータス変更ボタンを追加する）。

- [ ] **Step 1: `TaskCard.tsx` を書く**

```tsx
// src/features/task-management/components/TaskCard.tsx
import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-[#FD7601]"
          style={{ width: `${task.progressPercent}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
    </div>
  )
}
```

- [ ] **Step 2: `KanbanBoard.tsx` を書く**

```tsx
// src/features/task-management/components/KanbanBoard.tsx
import { TASK_STATUSES, type Task } from '../types'
import { TaskCard } from './TaskCard'

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface KanbanBoardProps {
  tasks: Task[]
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {TASK_STATUSES.map(status => (
        <div key={status} className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700">{STATUS_LABEL[status]}</h3>
          <div className="space-y-2">
            {tasks
              .filter(task => task.status === status)
              .map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `page.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/groups/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getTaskGroupBoard } from '@/features/task-management/queries'
import { KanbanBoard } from '@/features/task-management/components/KanbanBoard'
import { TaskForm } from '@/features/task-management/components/TaskForm'
import { ManagerAssignForm } from '@/features/task-management/components/ManagerAssignForm'
import { MemberAssignForm } from '@/features/task-management/components/MemberAssignForm'
import { isTaskGroupManager, canAssignMember } from '@/features/task-management/permissions'

export default async function TaskGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const board = await getTaskGroupBoard(supabase, id)

  const isManager = user ? isTaskGroupManager(board.managerEmployeeIds, user.employee_id) : false
  const canManageMembers = canAssignMember(false, isManager)

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full max-w-[1920px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{board.group.name}</h1>
        <p className="text-xs text-slate-500">平均進捗: {board.averageProgress}%</p>
      </div>

      {isManager && (
        <section className="space-y-2">
          <TaskForm taskGroupId={board.group.id} />
        </section>
      )}

      <KanbanBoard tasks={board.tasks} />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <h2 className="text-xs font-semibold text-slate-900 mb-2">マネージャー割当</h2>
          <ManagerAssignForm taskGroupId={board.group.id} />
        </div>
        {canManageMembers && (
          <div className="rounded-lg border border-slate-200 p-3">
            <h2 className="text-xs font-semibold text-slate-900 mb-2">メンバー</h2>
            <MemberAssignForm
              taskGroupId={board.group.id}
              memberEmployeeIds={board.memberEmployeeIds}
            />
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: `loading.tsx` / `error.tsx` を書く**

```tsx
// src/app/(tenant)/(tenant-users)/tasks/groups/[id]/loading.tsx
export default function Loading() {
  return <div className="p-6 text-xs text-slate-500">読み込み中...</div>
}
```

```tsx
// src/app/(tenant)/(tenant-users)/tasks/groups/[id]/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-xs text-red-600">
        タスクグループの読み込みに失敗しました: {error.message}
      </p>
      <button onClick={reset} className="mt-2 text-xs text-[#FD7601] underline">
        再読み込み
      </button>
    </div>
  )
}
```

- [ ] **Step 5: 手動で動作確認する**

Run: `npm run dev`
Expected: タスクグループ詳細ページでカンバンボード（未着手/進行中/レビュー/完了/保留の5列）が表示される。責任者がマネージャーを割り当て、そのマネージャーとしてログインし直すとタスク作成フォームとメンバー追加フォームが表示される。

- [ ] **Step 6: Commit**

```bash
git add src/features/task-management/components/KanbanBoard.tsx src/features/task-management/components/TaskCard.tsx "src/app/(tenant)/(tenant-users)/tasks/groups/"
git commit -m "feat: タスクグループのカンバンボード画面を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: 進捗更新（ステータス・進捗率） + 手動E2E確認

**Files:**

- Modify: `src/features/task-management/actions.ts`
- Modify: `src/features/task-management/components/TaskCard.tsx`

**Interfaces:**

- Consumes: `updateTaskStatusSchema`/`UpdateTaskStatusInput`, `updateTaskProgressSchema`/`UpdateTaskProgressInput`（Task3）, `TASK_STATUSES`（Task3）
- Produces: `updateTaskStatus(input: UpdateTaskStatusInput): Promise<void>`, `updateTaskProgress(input: UpdateTaskProgressInput): Promise<void>`。カラム制限（statusとprogress_percentのみ更新、他カラムは触らない）をこのアクション内で徹底する。

- [ ] **Step 1: `actions.ts` に追記する**

```typescript
// src/features/task-management/actions.ts に追記
import {
  updateTaskStatusSchema,
  updateTaskProgressSchema,
  type UpdateTaskStatusInput,
  type UpdateTaskProgressInput,
} from './types'

export async function updateTaskStatus(input: UpdateTaskStatusInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskStatusSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('tasks')
    .update({ status: parsed.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}

export async function updateTaskProgress(input: UpdateTaskProgressInput): Promise<void> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')

  const parsed = updateTaskProgressSchema.parse(input)
  const supabase = await createClient()

  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('task_group_id')
    .eq('id', parsed.taskId)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('tasks')
    .update({ progress_percent: parsed.progressPercent, updated_at: new Date().toISOString() })
    .eq('id', parsed.taskId)

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.groupDetail(task.task_group_id))
}
```

- [ ] **Step 2: `TaskCard.tsx` を拡張してステータス変更・進捗率入力を可能にする**

```tsx
// src/features/task-management/components/TaskCard.tsx を置き換え
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskStatus, updateTaskProgress } from '../actions'
import { TASK_STATUSES, type Task } from '../types'

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

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Task['status']
    startTransition(async () => {
      await updateTaskStatus({ taskId: task.id, status })
      router.refresh()
    })
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const progressPercent = Number(e.target.value)
    startTransition(async () => {
      await updateTaskProgress({ taskId: task.id, progressPercent })
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
      <select
        value={task.status}
        onChange={handleStatusChange}
        disabled={isPending}
        className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px]"
      >
        {TASK_STATUSES.map(status => (
          <option key={status} value={status}>
            {STATUS_LABEL[status]}
          </option>
        ))}
      </select>
      <input
        type="range"
        min={0}
        max={100}
        value={task.progressPercent}
        onChange={handleProgressChange}
        disabled={isPending}
        className="mt-2 w-full"
      />
      <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
    </div>
  )
}
```

- [ ] **Step 3: 型チェックとlintを実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし

- [ ] **Step 4: 手動E2E確認（一連のフロー）**

対象DB: ローカル (`127.0.0.1:55422`)。`npm run dev` を起動し、以下を通しで確認する。

1. 責任者アカウントでログイン → `/tasks/objectives/new` から目標を作成
2. 目標詳細ページでマイルストーンを作成
3. マイルストーン内でタスクグループを作成し、そのタスクグループ詳細ページに遷移
4. 「マネージャー割当」フォームで別の従業員IDを入力しマネージャーに割り当てる
5. マネージャーとして再ログインし、タスクグループ詳細ページで「メンバー」フォームからメンバーを追加できることを確認
6. マネージャーとしてタスクを作成し、担当者にメンバーを指定
7. メンバーとして再ログインし、同じタスクグループ詳細ページでカンバンボードに自分のタスクが表示されること、ステータスと進捗率(%)を更新できることを確認
8. 別のメンバー（同じグループの他メンバー）としてログインし、他人が更新した進捗が見えること（透明性要件）を確認
9. グループに関与しない第三の従業員でログインし、`/tasks/groups/[id]` に直接アクセスしても表示されない（RLSにより空/エラー）ことを確認

Expected: 上記すべてが設計通りに動作する。ズレがあれば該当タスクに戻って修正する。

- [ ] **Step 5: Commit**

```bash
git add src/features/task-management/actions.ts src/features/task-management/components/TaskCard.tsx
git commit -m "feat: タスクのステータス・進捗率更新機能を追加

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review メモ（このplan作成時点での確認結果）

- **Spec coverage**: PRD（`docs/implementation-plan-task-management.md`）の Phase1 要件（Must 1〜6）はTask1〜16でカバーしている。Phase2/3（工数入力・コメント・組織ツリー・進捗サマリ・通知）は本planの対象外であり、別plan として改めて作成する。
- **既知の簡略化点**（オープンクエスチョンとして次plan作成時に見直す）:
  - 従業員選択が全てテキスト入力の従業員ID直打ちになっている（既存の従業員選択コンポーネントがあれば、次のUI改善タスクで置き換える）
  - タスクの担当者変更・タイトル編集など「作成後の全項目編集」はPhase1のスコープ外（PRDのMustにも含まれていない）
  - カンバンのドラッグ&ドロップはPhase1では見送り、セレクトボックスでのステータス変更に代替している
