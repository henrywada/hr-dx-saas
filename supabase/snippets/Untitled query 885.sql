-- wada007@gmail.com の内部データ(metadata)に、特権フラグを書き込む
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_super_admin}',
  'true'
)
WHERE email = 'wada007@gmail.com';

-- 確認: 正しく true になったか見る
SELECT email, raw_app_meta_data FROM auth.users WHERE email = 'wada007@gmail.com';