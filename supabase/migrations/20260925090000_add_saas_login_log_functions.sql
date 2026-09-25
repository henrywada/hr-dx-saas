-- SaaS管理者向けログイン履歴（全テナント横断）用の SECURITY DEFINER 関数
--
-- アクセス権:
--   一覧（読み取り）: developer または JWT user_metadata.role='supaUser'
--     （既存RLS「SaaS admins can view all access logs」と同等）
--   件数プレビュー・削除: current_employee_app_role()='developer' のみ
--     理由: user_metadata はユーザー自身が書き換え可能なため、破壊的操作の根拠にしない。
--     DB 由来の app_role のみを信頼する。
-- 権限判定は引数ではなくセッション（auth.uid() / JWT）から行う。
-- access_logs には DELETE ポリシーが無いが、関数オーナー権限（SECURITY DEFINER）で削除する。

-- 1. 一覧（全テナント。年月・テナントで絞り込み可、新しい順、件数上限あり）
CREATE OR REPLACE FUNCTION public.get_all_tenant_login_logs(
  p_year_month text DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_limit int DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  logged_in_at timestamptz,
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
    al.created_at AS logged_in_at,
    e.name AS employee_name,
    u.email::text AS email,
    al.tenant_id,
    COALESCE(t.name, t.company_name) AS tenant_name
  FROM public.access_logs al
  LEFT JOIN public.employees e ON e.user_id = al.user_id
  JOIN auth.users u ON u.id = al.user_id
  LEFT JOIN public.tenants t ON t.id = al.tenant_id
  WHERE al.action = 'LOGIN_SUCCESS'
    AND (
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

REVOKE ALL ON FUNCTION public.get_all_tenant_login_logs(text, uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_tenant_login_logs(text, uuid, int) TO authenticated;

-- 2. 削除対象件数のプレビュー（指定月の1日 0:00 JST より前の LOGIN_SUCCESS）
CREATE OR REPLACE FUNCTION public.count_login_logs_before(p_year_month text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- user_metadata.role はユーザー自身が書き換え可能なため、破壊的/件数系の操作の根拠にしない。
  -- DB 由来の app_role（developer）のみ許可する。NULL（employees 行なし等）も拒否。
  IF NOT COALESCE(public.current_employee_app_role() = 'developer', false) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_year_month IS NULL OR p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'invalid year_month format: %', p_year_month;
  END IF;

  IF p_year_month >= to_char(now() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') THEN
    RAISE EXCEPTION 'year_month must be before the current month: %', p_year_month;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.access_logs al
  WHERE al.action = 'LOGIN_SUCCESS'
    AND al.created_at < (p_year_month || '-01 00:00:00+09')::timestamptz;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.count_login_logs_before(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_login_logs_before(text) TO authenticated;

-- 3. 削除（削除件数を返し、実行記録 LOGIN_LOGS_PURGED を同一トランザクションで残す）
CREATE OR REPLACE FUNCTION public.delete_login_logs_before(p_year_month text)
RETURNS bigint
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- user_metadata.role はユーザー自身が書き換え可能なため、破壊的/件数系の操作の根拠にしない。
  -- DB 由来の app_role（developer）のみ許可する。NULL（employees 行なし等）も拒否。
  IF NOT COALESCE(public.current_employee_app_role() = 'developer', false) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  IF p_year_month IS NULL OR p_year_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'invalid year_month format: %', p_year_month;
  END IF;

  IF p_year_month >= to_char(now() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') THEN
    RAISE EXCEPTION 'year_month must be before the current month: %', p_year_month;
  END IF;

  WITH deleted AS (
    DELETE FROM public.access_logs al
    WHERE al.action = 'LOGIN_SUCCESS'
      AND al.created_at < (p_year_month || '-01 00:00:00+09')::timestamptz
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;

  INSERT INTO public.access_logs (action, path, method, user_id, tenant_id, details)
  VALUES (
    'LOGIN_LOGS_PURGED',
    '/saas_adm/login-logs',
    'POST',
    auth.uid(),
    NULL,
    json_build_object('before_year_month', p_year_month, 'deleted_count', v_count)
  );

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_login_logs_before(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_login_logs_before(text) TO authenticated;
