-- 1. employees からの削除 (user_id で紐づいているものを削除)
DELETE FROM public.employees 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'wada007@gmail.com');

-- 2. auth.identities からの削除
DELETE FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'wada007@gmail.com');

-- 3. auth.users 本体の削除
DELETE FROM auth.users 
WHERE email = 'wada007@gmail.com';

-- 4. 削除確認（何も表示されなければ成功）
SELECT id, email FROM auth.users WHERE email = 'wada007@gmail.com';