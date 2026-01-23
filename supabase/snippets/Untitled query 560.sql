-- 1. ユーザーに superuser 権限を付与
-- ※ 'admin@hr-dx.jp' の部分は、手順1で登録した実際のメールアドレスに変えてください
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "superuser"}'
WHERE email = 'wada007@gmail.com';

-- -------------------------------------------------------
-- 2. 既存のRLSポリシーを「スーパーユーザー対応版」に書き換える
-- -------------------------------------------------------

-- (1) tenants テーブル
DROP POLICY IF EXISTS "Tenant isolation for tenants" ON public.tenants;
CREATE POLICY "Tenant isolation for tenants" ON public.tenants
FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superuser' -- スーパーユーザーなら全許可
    OR
    id = get_auth_tenant_id() -- 通常ユーザーは自分のテナントのみ
);

-- (2) divisions テーブル
DROP POLICY IF EXISTS "Tenant isolation for divisions" ON public.divisions;
CREATE POLICY "Tenant isolation for divisions" ON public.divisions
FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superuser'
    OR
    tenant_id = get_auth_tenant_id()
);

-- (3) employees テーブル
DROP POLICY IF EXISTS "Tenant isolation for employees" ON public.employees;
CREATE POLICY "Tenant isolation for employees" ON public.employees
FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superuser'
    OR
    tenant_id = get_auth_tenant_id()
);

-- (4) tenant_service テーブル
DROP POLICY IF EXISTS "Tenant isolation for tenant_service" ON public.tenant_service;
CREATE POLICY "Tenant isolation for tenant_service" ON public.tenant_service
FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superuser'
    OR
    tenant_id = get_auth_tenant_id()
);