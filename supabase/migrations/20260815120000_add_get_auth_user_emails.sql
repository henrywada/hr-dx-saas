-- 複数 user_id のメールを1回のRPCで取得する（N+1回避）
-- SaaS管理者のテナント一覧が Next.js 16 開発ランタイムで
-- Promise 連鎖のスタックオーバーフローを起こすのを防ぐ
CREATE OR REPLACE FUNCTION public.get_auth_user_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'auth', 'public'
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY (p_user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_emails(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_emails(uuid[]) TO service_role;
