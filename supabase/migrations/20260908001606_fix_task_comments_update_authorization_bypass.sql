-- 最終レビュー Finding C1（Critical）/ I6（Important）の修正
-- 対象テーブル: public.task_comments

-- ============================================================
-- C1: task_comments_update に WITH CHECK が無く、認可バイパスが可能だった
-- ============================================================
-- USING のみだと新行にも USING が流用されるため、tenant_id/employee_id しか
-- 拘束されず、投稿者が自分のコメントの task_id/task_group_id を
-- 投稿権限の無い対象に書き換えられてしまっていた。

DROP POLICY IF EXISTS "task_comments_update" ON public.task_comments;

CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND (
      (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_comment_on_task(task_id))
    )
  );

COMMENT ON POLICY "task_comments_update" ON public.task_comments IS
  '最終レビューで発見された認可バイパスの修正: WITH CHECK が無いと USING が新行にも
   流用されるため、tenant_id/employee_id しか拘束されず、投稿者が自分のコメントの
   task_id/task_group_id を投稿権限の無い対象に書き換えられてしまっていた。
   新行が can_comment_on_task/can_comment_on_task_group を満たすことを WITH CHECK
   で要求することで、更新後も投稿権限マトリクスの範囲内に留まることを保証する。';

-- ============================================================
-- I6: task_comments_delete の task_id 分岐が tasks への素の EXISTS サブクエリで
--     tasks_select RLS に暗黙依存する構造的に脆い実装だった
-- ============================================================
-- Task 1 で can_view_task() として切り出したのと同じ理由（SECURITY DEFINER の
-- ヘルパーに切り出すことで tasks_select の将来変更から独立させる）で、
-- モデレーション削除可否判定専用のヘルパーを新設する。

CREATE OR REPLACE FUNCTION public.can_moderate_task_comment(p_task_id UUID)
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
      )
  );
$$;

COMMENT ON FUNCTION public.can_moderate_task_comment(UUID) IS
  'ログインユーザーが指定したタスクのコメントをモデレーション削除できるか（責任者/マネージャーのみ）。
   task_comments_delete の task_id 分岐が tasks への素の EXISTS サブクエリだったため、
   tasks_select RLS に暗黙依存する構造的に脆い実装になっていた（can_view_task と同じ理由）。
   このヘルパーに切り出すことで、tasks_select が将来変更されても独立して動作する。';

DROP POLICY IF EXISTS "task_comments_delete" ON public.task_comments;

CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR (task_group_id IS NOT NULL AND public.can_comment_on_task_group(task_group_id))
      OR (task_id IS NOT NULL AND public.can_moderate_task_comment(task_id))
    )
  );

COMMENT ON POLICY "task_comments_delete" ON public.task_comments IS
  '投稿者本人、または責任者・マネージャーが削除可能。task_id 分岐は
   can_moderate_task_comment()（SECURITY DEFINER）を使用し、tasks_select RLS への
   暗黙依存を排除している（最終レビュー Finding I6）。';
