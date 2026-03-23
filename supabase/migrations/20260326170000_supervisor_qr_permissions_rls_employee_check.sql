-- ブラウザは RPC なしで upsert/update 可能にする（PostgREST schema cache に載らない環境の回避）
-- employee は同一 tenant の employees に存在することを WITH CHECK で保証

DROP POLICY IF EXISTS "supervisor_qr_permissions_supervisor_insert" ON public.supervisor_qr_permissions;

CREATE POLICY "supervisor_qr_permissions_supervisor_insert"
  ON public.supervisor_qr_permissions FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
    AND employee_user_id IS DISTINCT FROM auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = employee_user_id
        AND e.tenant_id = tenant_id
    )
  );

DROP POLICY IF EXISTS "supervisor_qr_permissions_supervisor_update" ON public.supervisor_qr_permissions;

CREATE POLICY "supervisor_qr_permissions_supervisor_update"
  ON public.supervisor_qr_permissions FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND supervisor_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.user_id = employee_user_id
        AND e.tenant_id = tenant_id
    )
  );
