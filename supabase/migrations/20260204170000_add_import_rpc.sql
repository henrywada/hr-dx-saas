
-- 従業員を一括インポート（暗号化対応）するための関数
-- Supabase Admin Clientから呼び出す想定
create or replace function import_employee_encrypted(
  p_id uuid,
  p_tenant_id uuid,
  p_division_id uuid,
  p_name text,
  p_app_role text,
  p_encryption_key text
)
returns void
language sql
security definer
as $$
  insert into employees (
    id,
    tenant_id,
    division_id,
    name,
    app_role,
    is_contacted_person
  ) values (
    p_id,
    p_tenant_id,
    p_division_id,
    pgp_sym_encrypt(p_name, p_encryption_key), -- DB側で暗号化
    p_app_role,
    false
  );
$$;
