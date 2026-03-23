-- 勤怠テーブル SELECT: developer も人事と同様にテナント内の全行を参照可能にする
-- （アプリ側 canAccessHrAttendanceDashboard と整合）

DROP POLICY IF EXISTS "work_time_records_select_employee_or_hr" ON public.work_time_records;
CREATE POLICY "work_time_records_select_employee_or_hr"
  ON public.work_time_records FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text, 'developer'::text])
    )
  );

DROP POLICY IF EXISTS "overtime_monthly_stats_select_employee_or_hr" ON public.overtime_monthly_stats;
CREATE POLICY "overtime_monthly_stats_select_employee_or_hr"
  ON public.overtime_monthly_stats FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text, 'developer'::text])
    )
  );

DROP POLICY IF EXISTS "overtime_alerts_select_employee_or_hr" ON public.overtime_alerts;
CREATE POLICY "overtime_alerts_select_employee_or_hr"
  ON public.overtime_alerts FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      employee_id = public.current_employee_id()
      OR public.current_employee_app_role() = ANY (ARRAY['hr'::text, 'hr_manager'::text, 'developer'::text])
    )
  );
