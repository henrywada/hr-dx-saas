-- Add explicit WITH CHECK clause to consultations_update_staff policy
-- for consistency with other UPDATE policies in the codebase

DROP POLICY "consultations_update_staff" ON public.consultations;

CREATE POLICY "consultations_update_staff" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );
