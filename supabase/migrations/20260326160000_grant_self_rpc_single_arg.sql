-- 既に (uuid, text) で作成済みの DB 向け: そのシグネチャを削除し (uuid) のみに統一（PostgREST schema cache 対策）
DROP FUNCTION IF EXISTS public.fn_supervisor_qr_permission_grant_self(uuid, text);

CREATE OR REPLACE FUNCTION public.fn_supervisor_qr_permission_grant_self(p_employee_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_supervisor uuid;
  v_before jsonb;
  v_row public.supervisor_qr_permissions%ROWTYPE;
BEGIN
  v_supervisor := auth.uid();
  IF v_supervisor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found_for_user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = v_supervisor AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'supervisor_not_in_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_employee_user_id AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'employee_not_in_tenant';
  END IF;

  IF p_employee_user_id = v_supervisor THEN
    RAISE EXCEPTION 'cannot_grant_self';
  END IF;

  SELECT to_jsonb(s.*) INTO v_before
  FROM public.supervisor_qr_permissions s
  WHERE s.tenant_id = v_tenant
    AND s.supervisor_user_id = v_supervisor
    AND s.employee_user_id = p_employee_user_id
  LIMIT 1;

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    v_tenant,
    v_supervisor,
    p_employee_user_id,
    true,
    'all'
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = true,
    scope = COALESCE(EXCLUDED.scope, supervisor_qr_permissions.scope),
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.qr_audit_logs (
    tenant_id,
    related_table,
    related_id,
    action,
    actor_user_id,
    payload
  )
  VALUES (
    v_tenant,
    'supervisor_qr_permissions',
    v_row.id,
    'grant',
    v_supervisor,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION public.fn_supervisor_qr_permission_grant_self(uuid)
  IS 'ログイン監督者が同一テナント従業員への QR 表示許可を付与（scope=all 固定・監査ログ付き）。ブラウザ用。';

REVOKE ALL ON FUNCTION public.fn_supervisor_qr_permission_grant_self(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_supervisor_qr_permission_grant_self(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_supervisor_qr_permission_grant_self(uuid) TO service_role;
