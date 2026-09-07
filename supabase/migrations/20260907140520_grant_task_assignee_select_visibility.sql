-- tasks_select ポリシーの隙間を修正: 担当者（assignee）本人が自分のタスクを閲覧できるようにする
-- 背景: task_comments テーブル（20260907135655_create_task_comments_table.sql）の
-- task_comments_select ポリシーは task_id 経由で tasks を素の EXISTS で参照するため、
-- tasks_select RLS のスコープに入る。担当者はタスクグループのメンバーとして
-- 登録されているとは限らない（DB/RLS双方で assignee⊆group_members は強制されていない）ため、
-- 非メンバーの担当者は自分のタスク行が見えず、結果として task_comments への
-- INSERT ... RETURNING が RLS 違反で失敗する不具合が実際に確認された。
-- 修正方針: task_comments_select 側で迂回するのではなく、根本原因である tasks_select
-- そのものに担当者本人の可視性を付与する（既存条件を広げるのみで、狭める変更はない）。

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_participant(task_group_id)
      OR assignee_employee_id = public.current_employee_id()
      OR public.current_employee_app_role() <> 'employee'
    )
  );

COMMENT ON POLICY "tasks_select" ON public.tasks IS
  '担当者（assignee）本人が自分のタスクを閲覧できるよう、is_task_group_participant/テナント管理者に加えて
   assignee_employee_id = current_employee_id() を許可条件に追加。
   担当者はタスクグループのメンバーとして登録されているとは限らない（DB/RLS双方で
   assignee⊆group_membersは強制されていない）ため、この条件が無いと担当者本人が
   自分のタスク行を見られないケースが実在する。task_comments テーブルの
   task_comments_select ポリシーが task_id 経由でこのテーブルを素の EXISTS で参照する際、
   この隙間により担当者のコメント投稿（INSERT ... RETURNING）がRLS違反で失敗する
   不具合が実際に発見・再現されたため追加した。';
