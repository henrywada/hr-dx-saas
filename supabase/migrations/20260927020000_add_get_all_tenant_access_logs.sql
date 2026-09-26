-- SaaS管理者向けアクセスログ一覧（全テナント横断・全 action）用の SECURITY DEFINER 関数
--
-- ログイン履歴画面の「ページ閲覧」表示で、LOGIN_SUCCESS / LOGOUT / PAGE_VIEW / 重要操作を
-- 時系列に並べるために access_logs を返す。読み取り専用（既存関数・テーブルは変更しない）。
-- アクセス権は get_all_tenant_login_logs と同じ（developer または JWT user_metadata.role='supaUser'）。
-- 認証済みユーザー（auth.users に存在する user_id）のログのみ対象。
CREATE OR REPLACE FUNCTION public.get_all_tenant_access_logs(
  p_year_month text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  action text,
  path text,
  employee_name text,
  email text,
  tenant_id uuid,
  tenant_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    al.id,
    al.created_at,
    al.action::text,
    al.path::text,
    e.name AS employee_name,
    u.email::text AS email,
    al.tenant_id,
    COALESCE(t.name, t.company_name) AS tenant_name
  FROM public.access_logs al
  LEFT JOIN public.employees e ON e.user_id = al.user_id
  JOIN auth.users u ON u.id = al.user_id
  LEFT JOIN public.tenants t ON t.id = al.tenant_id
  WHERE (
      public.current_employee_app_role() = 'developer'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'supaUser'
    )
    AND (p_tenant_id IS NULL OR al.tenant_id = p_tenant_id)
    AND (
      p_year_month IS NULL
      OR to_char(al.created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') = p_year_month
    )
  ORDER BY al.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 5000), 5000);
$$;

REVOKE ALL ON FUNCTION public.get_all_tenant_access_logs(text, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_tenant_access_logs(text, uuid, int) TO authenticated;
