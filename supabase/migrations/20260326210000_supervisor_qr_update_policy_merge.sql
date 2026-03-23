-- UPDATE の USING / WITH CHECK が複数ポリシーで AND 扱いになり、人事が他監督者の行を更新できない環境への対応
-- 1 本の permissive ポリシーに統合（監督者は自分の行、人事はテナント内の任意行）

DROP POLICY IF EXISTS "supervisor_qr_permissions_hr_manager_update" ON public.supervisor_qr_permissions;
DROP POLICY IF EXISTS "supervisor_qr_permissions_supervisor_update" ON public.supervisor_qr_permissions;

CREATE POLICY "supervisor_qr_permissions_supervisor_update"
  ON public.supervisor_qr_permissions FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (
      supervisor_user_id = auth.uid()
      OR public.current_employee_app_role() IN ('hr', 'hr_manager')
    )
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = employee_user_id
        AND e.tenant_id = tenant_id
    )
    AND (
      supervisor_user_id = auth.uid()
      OR public.current_employee_app_role() IN ('hr', 'hr_manager')
    )
  );
