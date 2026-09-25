-- SaaS管理者向けログイン履歴: テナント絞り込み用の選択肢を返す SECURITY DEFINER 関数
-- tenants の RLS は自テナントしか読めない（特定 UID を除く）ため、関数側で全件を返す。
-- ガードは get_all_tenant_login_logs と同じ（developer または JWT user_metadata.role='supaUser'）。
-- NULL 三値論理で誤って許可しないよう COALESCE(..., false) で fail-closed にする。
CREATE OR REPLACE FUNCTION public.get_login_log_tenant_options()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT t.id, COALESCE(t.name, t.company_name) AS name
  FROM public.tenants t
  WHERE COALESCE(
    public.current_employee_app_role() = 'developer'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'supaUser',
    false
  )
  ORDER BY COALESCE(t.name, t.company_name) ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_login_log_tenant_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_login_log_tenant_options() TO authenticated;
