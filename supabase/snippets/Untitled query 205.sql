select
  id,
  user_id,
  provider,
  provider_id,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
from auth.identities
where user_id = '09bb82d5-210a-4685-83bb-ea03608521d3';