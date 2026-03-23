-- supervisor_qr_permissions の upsert と qr_audit_logs 挿入を同一トランザクションで実行（service_role の RPC のみ実行可）
-- 既存データを削除しない（DROP/TRUNCATE なし）

CREATE OR REPLACE FUNCTION public.fn_supervisor_qr_permission_apply(
  p_tenant_id uuid,
  p_supervisor_user_id uuid,
  p_employee_user_id uuid,
  p_can_display boolean,
  p_scope text,
  p_actor_user_id uuid,
  p_audit_action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_row public.supervisor_qr_permissions%ROWTYPE;
  v_scope text;
BEGIN
  IF p_audit_action IS NULL OR p_audit_action NOT IN ('grant', 'revoke') THEN
    RAISE EXCEPTION 'invalid_audit_action';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_supervisor_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'supervisor_not_in_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_employee_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'employee_not_in_tenant';
  END IF;

  SELECT to_jsonb(s.*) INTO v_before
  FROM public.supervisor_qr_permissions s
  WHERE s.tenant_id = p_tenant_id
    AND s.supervisor_user_id = p_supervisor_user_id
    AND s.employee_user_id = p_employee_user_id
  LIMIT 1;

  v_scope := CASE
    WHEN p_scope IS NULL THEN NULL
    ELSE NULLIF(TRIM(p_scope), '')
  END;

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    p_tenant_id,
    p_supervisor_user_id,
    p_employee_user_id,
    p_can_display,
    v_scope
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = EXCLUDED.can_display,
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
    p_tenant_id,
    'supervisor_qr_permissions',
    v_row.id,
    p_audit_action,
    p_actor_user_id,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION public.fn_supervisor_qr_permission_apply(uuid, uuid, uuid, boolean, text, uuid, text)
  IS 'QR 監督者権限の upsert と監査ログを原子的に記録（Edge Functions の service_role のみ実行想定）';

REVOKE ALL ON FUNCTION public.fn_supervisor_qr_permission_apply(uuid, uuid, uuid, boolean, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_supervisor_qr_permission_apply(uuid, uuid, uuid, boolean, text, uuid, text) TO service_role;
