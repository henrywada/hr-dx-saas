-- 1. まず、既存のポリシーをすべてクリーンアップします
drop policy if exists "Tenant isolation policy" on tenants;
drop policy if exists "Tenant isolation policy" on divisions;
drop policy if exists "Tenant isolation policy" on employees;
drop policy if exists "Tenant isolation policy" on tenant_service;

-- 2. tenantsテーブル (修正: tenant_idではなく id を見る)
create policy "Tenant isolation policy" on tenants
  using (
    id = get_auth_tenant_id() 
    or 
    is_app_admin()
  );

-- 3. divisionsテーブル
create policy "Tenant isolation policy" on divisions
  using (
    tenant_id = get_auth_tenant_id() 
    or 
    is_app_admin()
  );

-- 4. employeesテーブル (重要: 自分のデータが見えるようにする)
create policy "Tenant isolation policy" on employees
  using (
    tenant_id = get_auth_tenant_id() 
    or 
    is_app_admin()
  )
  with check (
    tenant_id = get_auth_tenant_id() 
    or 
    is_app_admin()
  );

-- 5. tenant_serviceテーブル
create policy "Tenant isolation policy" on tenant_service
  using (
    tenant_id = get_auth_tenant_id() 
    or 
    is_app_admin()
  );