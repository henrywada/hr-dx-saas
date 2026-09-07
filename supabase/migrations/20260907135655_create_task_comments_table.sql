-- タスクコメント（task_comments）: タスク/タスクグループ単位のコメント機能
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- current_tenant_id() / current_employee_id() / current_employee_app_role() /
-- is_task_group_owner() / is_task_group_manager() / is_task_group_participant()

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  task_group_id UUID REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  comment_type TEXT NOT NULL DEFAULT 'general' CHECK (comment_type IN ('report', 'advice', 'suggestion', 'general')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_comments_target_check CHECK ((task_id IS NOT NULL) <> (task_group_id IS NOT NULL))
);

COMMENT ON TABLE public.task_comments IS 'タスク管理: タスクまたはタスクグループ単位のコメント（報告・助言・進言）。task_id/task_group_id のどちらか一方のみが設定される';
COMMENT ON CONSTRAINT task_comments_target_check ON public.task_comments IS 'task_id と task_group_id は排他的に片方だけが必須（XOR）';

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_group_id ON public.task_comments(task_group_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent_comment_id ON public.task_comments(parent_comment_id);

-- タスクへのコメント投稿権限: 責任者・マネージャーは全タスク、メンバーは自分の担当タスクのみ
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
        OR t.assignee_employee_id = public.current_employee_id()
      )
  );
$$;

COMMENT ON FUNCTION public.can_comment_on_task(UUID) IS 'ログインユーザーが指定したタスクにコメント投稿できるか（責任者/マネージャー/担当者本人）';

-- タスクグループへのコメント投稿権限: 責任者・マネージャーのみ
CREATE OR REPLACE FUNCTION public.can_comment_on_task_group(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_task_group_owner(p_task_group_id) OR public.is_task_group_manager(p_task_group_id);
$$;

COMMENT ON FUNCTION public.can_comment_on_task_group(UUID) IS 'ログインユーザーが指定したタスクグループにコメント投稿できるか（責任者/マネージャーのみ）';

-- タスクのコメントスレッドを閲覧できるか: グループ参加者（owner/manager/member）または担当者本人
-- （投稿権限 can_comment_on_task とは異なり、担当者でも非マネージャーでもない一般メンバーも
-- 透明性要件により閲覧はできる必要があるため、意図的に別関数にしている）
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
        OR t.assignee_employee_id = public.current_employee_id()
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_task(UUID) IS 'ログインユーザーが指定したタスクのコメントスレッドを閲覧できるか（グループ参加者または担当者本人）';

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: グループ参加者全員、またはテナント管理者。task_comments 自身は参照しない
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      (task_group_id IS NOT NULL AND public.is_task_group_participant(task_group_id))
      OR (task_id IS NOT NULL AND public.can_view_task(task_id))
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- INSERT: 投稿者は自分自身。対象に応じた権限チェック
CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
  );

-- UPDATE: 投稿者本人のみ（本文編集）
CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );

-- DELETE: 投稿者本人、または責任者・マネージャー
CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND (
          public.is_task_group_owner(t.task_group_id) OR public.is_task_group_manager(t.task_group_id)
        )
      ))
    )
  );
