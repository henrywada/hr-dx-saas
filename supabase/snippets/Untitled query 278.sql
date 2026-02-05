-- ▼ 下記の '1cea...' の部分をコピーした正しいUUIDに書き換えてください ▼
DO $$
DECLARE
  v_new_user_id uuid := '1cea6f8f-0f7b-45b6-9b03-7df84eca4b4e'; 
BEGIN
  INSERT INTO public.employees (
      id,
      tenant_id,
      name,
      app_role,
      is_manager
  ) 
  SELECT
      v_new_user_id,
      id, -- SaaS Admin OrgのID
      pgp_sym_encrypt('Supa User', 'dev-secret-key'),
      'saas_adm',
      true
  FROM public.tenants 
  WHERE name = 'SaaS Admin Org'
  LIMIT 1;
END $$;