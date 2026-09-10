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

-- ログインユーザーが指定タスクのtask_assignees経由の担当者かどうかを判定する関数
-- SECURITY DEFINERで tasks ⇔ task_assignees のRLS相互再帰を回避
CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_assignees a
    WHERE a.task_id = p_task_id AND a.employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_assignee(UUID) IS 'ログインユーザーが指定タスクのtask_assignees経由の担当者かどうか（SECURITY DEFINERでtasks⇔task_assigneesのRLS相互再帰を回避）';

-- ここから: assignee_employee_id を参照していた既存のRLSポリシー・関数を task_assignees ベースに更新する。
-- バックフィルが完了しているため、以降は task_assignees を正として扱う。

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_participant(task_group_id)
      OR public.is_task_assignee(tasks.id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_assignee(tasks.id)
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
        OR public.is_task_assignee(t.id)
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
        OR public.is_task_assignee(t.id)
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
        OR public.is_task_assignee(t.id)
      )
  );
$$;

COMMENT ON FUNCTION public.can_comment_on_task(UUID) IS 'ログインユーザーが指定したタスクにコメント投稿できるか（責任者/マネージャー/task_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
COMMENT ON FUNCTION public.can_view_task(UUID) IS 'ログインユーザーが指定したタスクのコメントスレッドを閲覧できるか（グループ参加者またはtask_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
COMMENT ON FUNCTION public.can_log_work_on_task(UUID) IS 'ログインユーザーが指定したタスクに自分の工数を記録できるか（グループ参加者またはtask_assignees経由の担当者）。Phase4でassignee_employee_id参照からtask_assignees参照に更新';
