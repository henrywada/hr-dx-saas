-- 1. wada007ユーザーを従業員テーブルに登録
-- (もし既に成功していた場合は何もしない設定にしています)
INSERT INTO employees (id, tenant_id, division_id, name, app_role, is_contacted_person, contacted_date)
VALUES (
  'ab9a1201-d34b-452b-a6cc-9985275f1b18', -- Supabase AuthのUUID
  'a0000000-0000-0000-0000-000000000001', -- 株式会社HRテック
  'd0000000-0000-0000-0000-000000000001', -- 開発部
  'SaaS管理者 (和田)',
  'developer',
  false,
  null
) ON CONFLICT (id) DO NOTHING;


-- 2. 特権管理者判定関数の作成
CREATE OR REPLACE FUNCTION is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    auth.uid() = 'ab9a1201-d34b-452b-a6cc-9985275f1b18'::uuid
    OR
    (select auth.jwt() ->> 'email') = 'wada007@gmail.com';
$$;


-- 3. RLSポリシーを更新 (修正版)

-- A. tenantsテーブル 【修正箇所】tenant_id ではなく id を使用します
DROP POLICY IF EXISTS "Tenant isolation policy" ON tenants;
CREATE POLICY "Tenant isolation policy" ON tenants
  USING (id = get_auth_tenant_id() OR is_app_admin());

-- B. divisionsテーブル
DROP POLICY IF EXISTS "Tenant isolation policy" ON divisions;
CREATE POLICY "Tenant isolation policy" ON divisions
  USING (tenant_id = get_auth_tenant_id() OR is_app_admin());

-- C. employeesテーブル
DROP POLICY IF EXISTS "Tenant isolation policy" ON employees;
CREATE POLICY "Tenant isolation policy" ON employees
  USING (tenant_id = get_auth_tenant_id() OR is_app_admin())
  WITH CHECK (tenant_id = get_auth_tenant_id() OR is_app_admin());

-- D. tenant_serviceテーブル
DROP POLICY IF EXISTS "Tenant isolation policy" ON tenant_service;
CREATE POLICY "Tenant isolation policy" ON tenant_service
  USING (tenant_id = get_auth_tenant_id() OR is_app_admin());