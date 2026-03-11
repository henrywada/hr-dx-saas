-- Supabase Studio SQL Editor で実行
CREATE OR REPLACE FUNCTION public.get_auth_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = p_user_id);
END;
$$;
