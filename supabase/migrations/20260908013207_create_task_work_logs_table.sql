-- タスク工数記録（task_work_logs）: タスク単位の自由入力形式の工数（作業日・時間・メモ）
-- 依存: supabase/migrations/20260907032410_create_task_management_tables.sql の
-- current_tenant_id() / current_employee_id() / current_employee_app_role() / is_task_group_participant()
-- 依存: supabase/migrations/20260907135655_create_task_comments_table.sql の can_view_task()

CREATE TABLE IF NOT EXISTS public.task_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours NUMERIC(5, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_work_logs IS 'タスク管理: タスク単位の自由入力形式の工数記録（作業日・時間・メモ）。要求7に対応';
COMMENT ON COLUMN public.task_work_logs.hours IS '1日あたりの作業時間。0より大きく24以下';

CREATE INDEX IF NOT EXISTS idx_task_work_logs_task_id ON public.task_work_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_work_logs_employee_id ON public.task_work_logs(employee_id);

-- 工数記録の登録権限: そのタスクが属するタスクグループの参加者（責任者/マネージャー/メンバー）、
-- または担当者本人であれば自分の工数を記録できる（担当者以外でも助け合い作業を許容するため、
-- can_comment_on_task のような担当者限定にはしない。セクション14.2）
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
        OR t.assignee_employee_id = public.current_employee_id()
      )
  );
$$;

COMMENT ON FUNCTION public.can_log_work_on_task(UUID) IS 'ログインユーザーが指定したタスクに自分の工数を記録できるか（グループ参加者または担当者本人）';

ALTER TABLE public.task_work_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: そのタスクを閲覧できる人（グループ参加者・担当者本人）全員、またはテナント管理者
-- task_work_logs 自身は参照しない（tasks 経由の can_view_task のみを使う）
CREATE POLICY "task_work_logs_select" ON public.task_work_logs
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.can_view_task(task_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- INSERT: 投稿者は自分自身の工数のみ。対象タスクへの記録権限が必要
CREATE POLICY "task_work_logs_insert" ON public.task_work_logs
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND public.can_log_work_on_task(task_id)
  );

-- UPDATE: 投稿者本人のみ（役割に関わらず代理編集は不可）。
-- USING と WITH CHECK の両方に同じ条件を付ける
-- （task_comments_update で WITH CHECK 漏れによる認可バイパスが発見された教訓）
CREATE POLICY "task_work_logs_update" ON public.task_work_logs
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
    AND public.can_log_work_on_task(task_id)
  );

-- DELETE: 投稿者本人のみ（責任者・マネージャーによる代理削除は対象外）
CREATE POLICY "task_work_logs_delete" ON public.task_work_logs
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND employee_id = public.current_employee_id()
  );
