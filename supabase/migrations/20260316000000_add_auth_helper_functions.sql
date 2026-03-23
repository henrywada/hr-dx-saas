-- 認証補助 RPC 6 関数
-- テナント作成・従業員作成・招待メール・パスワード再設定で使用
-- createAdminClient() 経由で呼び出すため service_role に GRANT

-- 1. create_auth_user
CREATE OR REPLACE FUNCTION public.create_auth_user(p_email text, p_password text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    is_super_admin, raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    p_email, v_encrypted_password,
    NOW(), NOW(), NOW(),
    '', '', '', '', '', '', '', '',
    false,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
  VALUES (gen_random_uuid(), v_user_id, p_email,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'provider', 'email'),
    'email', NOW(), NOW(), NOW());
  RETURN v_user_id;
END;
$$;

-- 2. delete_auth_user
CREATE OR REPLACE FUNCTION public.delete_auth_user(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public'
AS $$
BEGIN
  DELETE FROM public.employees WHERE user_id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- 3. generate_recovery_token
CREATE OR REPLACE FUNCTION public.generate_recovery_token(p_user_id uuid, p_expiry_hours integer DEFAULT 168) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public', 'extensions'
AS $$
DECLARE v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE auth.users SET recovery_token = v_token, recovery_sent_at = NOW() WHERE id = p_user_id;
  RETURN v_token;
END;
$$;

-- 4. get_auth_user_email
CREATE OR REPLACE FUNCTION public.get_auth_user_email(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public'
AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;

-- 5. update_user_password
CREATE OR REPLACE FUNCTION public.update_user_password(p_user_id uuid, p_new_password text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public', 'extensions'
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      recovery_token = '', updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 6. verify_recovery_token
CREATE OR REPLACE FUNCTION public.verify_recovery_token(p_email text, p_token text, p_expiry_hours integer DEFAULT 336) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'auth', 'public', 'extensions'
AS $$
DECLARE v_user_id UUID; v_stored_token TEXT; v_sent_at TIMESTAMPTZ;
BEGIN
  SELECT id, recovery_token, recovery_sent_at INTO v_user_id, v_stored_token, v_sent_at
  FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'ユーザーが見つかりません'; END IF;
  IF v_stored_token IS NULL OR v_stored_token = '' THEN RAISE EXCEPTION 'リカバリートークンが設定されていません'; END IF;
  IF v_sent_at IS NULL OR v_sent_at + (p_expiry_hours || ' hours')::interval < NOW() THEN RAISE EXCEPTION 'トークンの有効期限が切れています'; END IF;
  IF v_stored_token != p_token THEN RAISE EXCEPTION 'トークンが一致しません'; END IF;
  UPDATE auth.users SET recovery_token = '', recovery_sent_at = NULL WHERE id = v_user_id;
  RETURN v_user_id;
END;
$$;

-- service_role に実行権限を付与（createAdminClient が使用）
GRANT EXECUTE ON FUNCTION public.create_auth_user(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_auth_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_recovery_token(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_user_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_recovery_token(text, text, integer) TO service_role;
