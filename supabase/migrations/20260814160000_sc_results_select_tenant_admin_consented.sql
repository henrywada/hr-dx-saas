-- /adm/high-stress で高ストレス者が 1 名だけになる問題の修正。
-- /adm は app_role <> 'employee' で入れるが、結果 SELECT は hr/hr_manager のみだったため
-- developer 等は sc_results_select_own（本人のみ）に落ち、抽出数が過小になる。
-- 個人結果は法令上「事業者への結果提供同意」がある行に限る。

DROP POLICY IF EXISTS "sc_results_select_hr_consented" ON public.stress_check_results;

CREATE POLICY "sc_results_select_tenant_admin_consented" ON public.stress_check_results
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
    AND EXISTS (
      SELECT 1
      FROM public.stress_check_submissions s
      WHERE s.period_id = stress_check_results.period_id
        AND s.employee_id = stress_check_results.employee_id
        AND s.consent_to_employer = true
    )
  );

COMMENT ON POLICY "sc_results_select_tenant_admin_consented" ON public.stress_check_results IS
  'テナント管理者（employee 以外）は同一テナントの同意済み個人結果を参照可（高ストレス者一覧用）';

DROP POLICY IF EXISTS "sc_interviews_select_hr_consented" ON public.stress_check_interviews;

CREATE POLICY "sc_interviews_select_tenant_admin_consented" ON public.stress_check_interviews
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
    AND EXISTS (
      SELECT 1
      FROM public.stress_check_submissions s
      WHERE s.period_id = stress_check_interviews.period_id
        AND s.employee_id = stress_check_interviews.employee_id
        AND s.consent_to_employer = true
    )
  );

COMMENT ON POLICY "sc_interviews_select_tenant_admin_consented" ON public.stress_check_interviews IS
  'テナント管理者（employee 以外）は同一テナントの同意済み面談記録を参照可';

DROP POLICY IF EXISTS "stress_interview_records_hr_select_consented" ON public.stress_interview_records;

CREATE POLICY "stress_interview_records_tenant_admin_select_consented"
  ON public.stress_interview_records
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
    AND EXISTS (
      SELECT 1
      FROM public.stress_check_results sr
      JOIN public.stress_check_submissions s
        ON s.period_id = sr.period_id
       AND s.employee_id = sr.employee_id
       AND s.consent_to_employer = true
      WHERE sr.id = stress_interview_records.stress_result_id
    )
  );

COMMENT ON POLICY "stress_interview_records_tenant_admin_select_consented"
  ON public.stress_interview_records IS
  'テナント管理者（employee 以外）は同一テナントの同意済み面接指導記録を参照可';
