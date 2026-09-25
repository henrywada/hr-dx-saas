-- ログイン履歴一覧画面用の SECURITY DEFINER 関数
--
-- access_logs（action='LOGIN_SUCCESS'）に employees.name / auth.users.email を
-- JOIN して返す。auth.users は PostgREST から直接参照できないため、
-- 既存の get_tenant_employee_auth_email と同様に SECURITY DEFINER で橋渡しする。
--
-- tenant_id / 管理者判定は引数で受け取らず、public.current_tenant_id() /
-- public.current_employee_app_role()（grant_notifier 等の既存RLSで実際に使われている
-- ヘルパー関数。auth.uid() → employees を引いて求める）から取得する。
-- 呼び出し側が他テナントの tenant_id を渡してなりすます余地を作らないため。
--
-- 注意: access_logs の既存RLSポリシー "Tenant admins can view their tenant's logs" は
-- auth.jwt()->user_metadata->>role='admin' を見ているが、この値は実データでは
-- 一切セットされていない（テナント管理者は raw_user_meta_data.role が空、
-- 'supaUser' は SaaS管理者専用）ため、そのポリシーは事実上機能していない。
-- 本関数では同じ判定を使わず、実際に有効な current_employee_app_role() を用いる。
CREATE OR REPLACE FUNCTION public.get_tenant_login_logs(p_year_month text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  logged_in_at timestamptz,
  employee_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    al.id,
    al.created_at AS logged_in_at,
    e.name AS employee_name,
    u.email
  FROM public.access_logs al
  JOIN public.employees e ON e.user_id = al.user_id
  JOIN auth.users u ON u.id = al.user_id
  WHERE al.action = 'LOGIN_SUCCESS'
    AND al.tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
    AND (
      p_year_month IS NULL
      OR to_char(al.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') = p_year_month
    )
  ORDER BY al.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_login_logs(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_login_logs(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_login_logs(text) TO service_role;
