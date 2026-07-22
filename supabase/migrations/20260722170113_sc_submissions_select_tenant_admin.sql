-- 進捗管理（/adm/stress-check/progress）で受検完了が 0 になる問題の修正。
-- /adm は app_role <> 'employee' で入れるが、提出 SELECT は hr/hr_manager のみだったため
-- テナント管理者ロールでは stress_check_submissions が読めず受検完了が常に 0 になっていた。

DROP POLICY IF EXISTS "sc_submissions_select_hr" ON public.stress_check_submissions;

CREATE POLICY "sc_submissions_select_tenant_admin" ON public.stress_check_submissions
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  );

COMMENT ON POLICY "sc_submissions_select_tenant_admin" ON public.stress_check_submissions IS
  'テナント管理者（employee 以外）は同一テナントの提出状況を参照可（進捗・未受検一覧用）';
