-- ログイン履歴一覧に「最終操作時刻」を出すための SECURITY DEFINER 関数
--
-- 既存の get_tenant_login_logs は戻り値型を変えられないため（DROP しない方針）、新規関数として追加する。
-- 既存関数・テーブルには一切手を入れない（読み取り専用）。
--
-- 最終操作時刻の定義:
--   LOGIN_SUCCESS を 1 セッションの開始とし、同一ユーザーの次の LOGIN_SUCCESS の直前までの
--   access_logs（PAGE_VIEW / LOGOUT / 操作ログ）のうち、直前のログとの間隔が
--   30 分を超えない範囲で連続している最後の時刻。
--   ただし LOGOUT が記録されていれば、間隔に関わらずその時刻を最終操作（終了）とする。
--   ログアウトしない場合は最後の画面表示が最終操作となり、滞在時間は「推定値（下限）」になる。
--
-- tenant_id / 管理者判定は get_tenant_login_logs と同様、セッション（current_tenant_id() /
-- current_employee_app_role()）から取得し、引数では受け取らない。
CREATE OR REPLACE FUNCTION public.get_tenant_login_sessions(p_year_month text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  logged_in_at timestamptz,
  last_activity_at timestamptz,
  employee_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH logins AS (
    SELECT
      al.id,
      al.user_id,
      al.created_at AS logged_in_at,
      LEAD(al.created_at) OVER (PARTITION BY al.user_id ORDER BY al.created_at) AS next_login_at
    FROM public.access_logs al
    WHERE al.action = 'LOGIN_SUCCESS'
      AND al.tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  ),
  target_logins AS (
    SELECT *
    FROM logins l
    WHERE p_year_month IS NULL
      OR to_char(l.logged_in_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') = p_year_month
  ),
  -- ログイン行そのもの + セッション内の他ログを時系列に並べ、直前との間隔を出す
  activity AS (
    SELECT
      tl.id AS login_id,
      a.created_at,
      a.action,
      a.created_at - LAG(a.created_at) OVER (PARTITION BY tl.id ORDER BY a.created_at) AS gap
    FROM target_logins tl
    JOIN public.access_logs a
      ON a.user_id = tl.user_id
     AND a.created_at >= tl.logged_in_at
     AND (tl.next_login_at IS NULL OR a.created_at < tl.next_login_at)
  ),
  -- セッションごとに「30 分超の空白が最初に現れた時刻」と「LOGOUT 時刻」を 1 回だけ集計する
  breaks AS (
    SELECT
      login_id,
      MIN(created_at) FILTER (WHERE gap > interval '30 minutes') AS break_at,
      MIN(created_at) FILTER (WHERE action = 'LOGOUT') AS logout_at
    FROM activity
    GROUP BY login_id
  ),
  -- LOGOUT があればそれを最優先。無ければ空白で区切られる手前の最後の時刻
  session_end AS (
    SELECT
      a.login_id,
      COALESCE(
        b.logout_at,
        MAX(a.created_at) FILTER (WHERE b.break_at IS NULL OR a.created_at < b.break_at)
      ) AS last_activity_at
    FROM activity a
    JOIN breaks b ON b.login_id = a.login_id
    GROUP BY a.login_id, b.logout_at, b.break_at
  )
  SELECT
    tl.id,
    tl.logged_in_at,
    COALESCE(se.last_activity_at, tl.logged_in_at) AS last_activity_at,
    e.name AS employee_name,
    u.email::text AS email
  FROM target_logins tl
  JOIN public.employees e ON e.user_id = tl.user_id
  JOIN auth.users u ON u.id = tl.user_id
  LEFT JOIN session_end se ON se.login_id = tl.id
  ORDER BY tl.logged_in_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_login_sessions(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_login_sessions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_login_sessions(text) TO service_role;
