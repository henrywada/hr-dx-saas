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
