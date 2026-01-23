-- Enable pgcrypto extension for UUID generation and encryption
create extension if not exists "pgcrypto";

-- User defined function to get current user's tenant_id
-- SECURITY DEFINER is crucial to bypass RLS when fetching the tenant_id, preventing infinite recursion
create or replace function get_auth_tenant_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select tenant_id
  from employees
  where id = auth.uid()
  limit 1;
$$;

comment on function get_auth_tenant_id is '現在ログイン中のユーザーのtenant_idを取得するセキュリティ定義関数';

----------------------------------------------------------------
-- 1. Shared Master Tables (Global Access)
----------------------------------------------------------------

-- service_category (サービスカテゴリ)
create table service_category (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);

comment on table service_category is 'サービスカテゴリマスタ';
comment on column service_category.name is 'カテゴリ名';
comment on column service_category.description is '説明';

-- service (サービスマスタ)
create table service (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_category_id uuid not null references service_category(id),
  category text,
  description text
);

comment on table service is 'サービスマスタ';
comment on column service.name is 'サービス名';
comment on column service.service_category_id is 'カテゴリID';
comment on column service.category is 'カテゴリ分類テキスト';
comment on column service.description is '説明';

----------------------------------------------------------------
-- 2. Tenant Isolated Tables (Strict RLS)
----------------------------------------------------------------

-- tenants (テナント)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_date date,
  paid_amount int4,
  employee_count int4,
  paied_date date,
  created_at timestamptz default now()
);

comment on table tenants is 'テナント管理テーブル';
comment on column tenants.name is 'テナント名';
comment on column tenants.contact_date is '連絡日';
comment on column tenants.paid_amount is '支払金額';
comment on column tenants.employee_count is '従業員数';
comment on column tenants.paied_date is '支払日';

-- divisions (部署)
create table divisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  parent_id uuid references divisions(id),
  layer int4,
  code text
);

comment on table divisions is '部署マスタ';
comment on column divisions.tenant_id is 'テナントID';
comment on column divisions.name is '部署名';
comment on column divisions.parent_id is '親部署ID';
comment on column divisions.layer is '階層';
comment on column divisions.code is '部署コード';

-- employees (従業員)
-- id is linked to auth.users.id
create table employees (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id),
  division_id uuid references divisions(id),
  name text, -- Encrypted
  app_role text,
  is_contacted_person bool default false,
  contacted_date text, -- Encrypted (date stored as text/encrypted)
  constraint check_app_role check (app_role in ('employee', 'hr_manager', 'hr', 'boss', 'company_doctor', 'company_nurse', 'hsc', 'developer', 'test'))
);

comment on table employees is '従業員マスタ';
comment on column employees.tenant_id is 'テナントID';
comment on column employees.division_id is '所属部署ID';
comment on column employees.name is '氏名（暗号化）';
comment on column employees.app_role is 'アプリケーションロール';
comment on column employees.is_contacted_person is '連絡窓口担当者フラグ';
comment on column employees.contacted_date is '連絡日（暗号化）';

-- tenant_service (テナント契約サービス)
create table tenant_service (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  service_id uuid not null references service(id),
  start_date date,
  status text
);

comment on table tenant_service is 'テナント契約サービス状況';
comment on column tenant_service.tenant_id is 'テナントID';
comment on column tenant_service.service_id is '契約サービスID';
comment on column tenant_service.start_date is '利用開始日';
comment on column tenant_service.status is 'ステータス';


----------------------------------------------------------------
-- 3. RLS Policies
----------------------------------------------------------------

-- Enable RLS on all tables
alter table service_category enable row level security;
alter table service enable row level security;
alter table tenants enable row level security;
alter table divisions enable row level security;
alter table employees enable row level security;
alter table tenant_service enable row level security;

-- Global Tables: Everyone can read, no one can write (via API)
create policy "Global read access for service_category"
  on service_category for select
  to authenticated
  using (true);

create policy "Global read access for service"
  on service for select
  to authenticated
  using (true);

-- Tenant Tables: Strict Isolation
-- Users can only access rows where tenant_id matches their own tenant_id

-- tenants
create policy "Tenant isolation for tenants"
  on tenants
  to authenticated
  using (id = get_auth_tenant_id());

-- divisions
create policy "Tenant isolation for divisions"
  on divisions
  to authenticated
  using (tenant_id = get_auth_tenant_id());

-- employees
-- Users can see employees in their own tenant.
-- Note: get_auth_tenant_id uses employees table but is SECURITY DEFINER, preventing recursion.
create policy "Tenant isolation for employees"
  on employees
  to authenticated
  using (tenant_id = get_auth_tenant_id());

-- Also allow users to Insert/Update themselves if needed? 
-- Specification implies strict isolation. Usually "admin" roles might update others.
-- For now, we apply the base isolation filter for all operations.
-- If insert is required, we need 'with check'.
-- IMPORTANT: For INSERT, get_auth_tenant_id() might fail if the user is not yet in employees.
-- However, typically the first employee (admin) is created via system/dashboard functions (service_role) or sign-up triggers.
-- If this is a pure app logic, we assume valid users exist.
-- Changing policy to include `with check` (implicit in `using` for PG, but typical for updates).

-- tenant_service
create policy "Tenant isolation for tenant_service"
  on tenant_service
  to authenticated
  using (tenant_id = get_auth_tenant_id());
