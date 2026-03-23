-- 人事・人事マネージャーがテナント内の任意の supervisor_qr_permissions を更新できるようにする
-- （/adm 画面で他監督者が付与した行の「削除」＝ can_display=false を可能にする）
-- 既存ポリシー（監督者本人のみ）と OR で評価される

CREATE POLICY "supervisor_qr_permissions_hr_manager_update"
  ON public.supervisor_qr_permissions FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IN ('hr', 'hr_manager')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = employee_user_id
        AND e.tenant_id = tenant_id
    )
  );
