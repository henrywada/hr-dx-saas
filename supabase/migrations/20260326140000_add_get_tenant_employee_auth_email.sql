-- テナント所属従業員に限り auth.users のメールを返す（ブラウザからの一覧表示用）
CREATE OR REPLACE FUNCTION public.get_tenant_employee_auth_email(p_tenant_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.email
  FROM auth.users u
  WHERE u.id = p_user_id
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.tenant_id = p_tenant_id
        AND e.user_id = p_user_id
    );
$$;

REVOKE ALL ON FUNCTION public.get_tenant_employee_auth_email(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_employee_auth_email(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_employee_auth_email(uuid, uuid) TO service_role;
