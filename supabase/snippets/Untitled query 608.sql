set local role authenticated;
select set_config('request.jwt.claim.sub', '<USER_A_UUID>', true);
select set_config('request.jwt.claim.role', 'authenticated', true);