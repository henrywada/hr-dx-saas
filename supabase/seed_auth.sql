-- ローカル開発用: seed.sql に含まれる employees.user_id と同じ UUID で auth.users / auth.identities を作成する。
-- supabase db reset 後は Authentication > Users が空に見えるが、これは正常（seed が auth を触らないため）。
-- 本ファイルは db reset 時に seed.sql の次に自動実行される（config.toml の sql_paths）。
--
-- 全アカウント共通の開発用パスワード: LocalDev#2026
-- メールは example.test ドメイン（実運用メール送信を避けるため）。変更は Studio または auth.users / auth.identities を直接 UPDATE。
-- パスワード変更 RPC: public.update_user_password（定義は migrations の add_auth_helper_functions）

SET session_replication_role = replica;

-- 既存の create_auth_user と同じ列セット（supabase/migrations の定義に合わせる）
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token,
  reauthentication_token,
  is_super_admin, raw_app_meta_data, raw_user_meta_data
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  x.id,
  'authenticated',
  'authenticated',
  x.email,
  crypt('LocalDev#2026', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb
FROM (
  VALUES
    ('e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid, 'saas-admin@example.test'),
    ('f4101af9-d662-40a4-bb4f-a4bf9cf49881'::uuid, 'test1@example.test'),
    ('fd7f841d-ae34-42c0-9b77-da98e950c31d'::uuid, 'sample@example.test'),
    ('f1cba1e7-be83-432a-8d2a-1cb96ed72223'::uuid, 'sample1@example.test'),
    ('4c996fb1-6f11-46c4-bfc8-dfd2793f830b'::uuid, 'sample2@example.test'),
    ('f7d8843b-059a-41e9-9e89-38b78b2ff85b'::uuid, 'sample3@example.test'),
    ('3895d2b7-7f40-45c4-a47d-47b51128ffde'::uuid, 'sample4@example.test'),
    ('3ff3aac1-ab94-4bb6-88d0-1e5502c8e5e7'::uuid, 'sample5@example.test')
) AS x(id, email)
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
)
SELECT
  gen_random_uuid(),
  u.id,
  u.email,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'provider', 'email'
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE u.id IN (
  'e97488f9-02be-4b0b-9dc9-ddb0c2902999',
  'f4101af9-d662-40a4-bb4f-a4bf9cf49881',
  'fd7f841d-ae34-42c0-9b77-da98e950c31d',
  'f1cba1e7-be83-432a-8d2a-1cb96ed72223',
  '4c996fb1-6f11-46c4-bfc8-dfd2793f830b',
  'f7d8843b-059a-41e9-9e89-38b78b2ff85b',
  '3895d2b7-7f40-45c4-a47d-47b51128ffde',
  '3ff3aac1-ab94-4bb6-88d0-1e5502c8e5e7'
)
AND NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
);

SET session_replication_role = DEFAULT;
