-- 関連するemployeesデータを先に削除（念の為）
DELETE FROM public.employees WHERE id IN (SELECT id FROM auth.users WHERE email = 'wada007@gmail.com');

-- auth.users からユーザーを削除
DELETE FROM auth.users WHERE email = 'wada007@gmail.com';