-- task_milestones_insert / task_groups_insert にテナント管理者フォールバックを追加する
--
-- 最終レビュー Finding 6: PRD（docs/implementation-plan-task-management.md 5節、
-- 権限モデル表）は「目標・マイルストーン作成/編集」「タスクグループ作成」を
-- 責任者だけでなくテナント管理者にも許可している。しかし Task1 の初期マイグレーション
-- （20260907032410_create_task_management_tables.sql）の task_milestones_insert /
-- task_groups_insert ポリシーはこのフォールバックを書き落としており、
-- tasks_insert / task_group_managers_insert / task_group_members_insert 等の
-- 他の INSERT ポリシーとの整合が取れていなかった。PRDを正としてRLSを修正する。

DROP POLICY IF EXISTS "task_milestones_insert" ON public.task_milestones;

CREATE POLICY "task_milestones_insert" ON public.task_milestones
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_objective_owner(objective_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

DROP POLICY IF EXISTS "task_groups_insert" ON public.task_groups;

CREATE POLICY "task_groups_insert" ON public.task_groups
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.task_milestones ms
        WHERE ms.id = milestone_id AND public.is_task_objective_owner(ms.objective_id)
      )
      OR public.current_employee_app_role() <> 'employee'
    )
  );

COMMENT ON POLICY "task_milestones_insert" ON public.task_milestones IS
  'spec (docs/implementation-plan-task-management.md 5節) はマイルストーン作成をテナント管理者にも許可しているが、
   Task1の初期実装はこの管理者フォールバックを書き落としていた（tasks_insert等の他ポリシーとの不整合）。
   最終レビューで発見・修正。';

COMMENT ON POLICY "task_groups_insert" ON public.task_groups IS
  '同上。タスクグループ作成のテナント管理者フォールバックを追加。';
