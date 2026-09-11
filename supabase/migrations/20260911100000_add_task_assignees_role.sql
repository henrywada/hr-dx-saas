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
