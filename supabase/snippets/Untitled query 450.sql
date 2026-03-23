UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    confirmed_at = NOW(),
    last_sign_in_at = NOW()
WHERE email = 'wada007@gmail.com';