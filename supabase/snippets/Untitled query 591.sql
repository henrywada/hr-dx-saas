-- 必要なら拡張（Supabaseでは既に有効なことが多い）
create extension if not exists "pgcrypto";

-- tenants
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text,
  contact_date date,
  paid_amount int4,
  employee_count int4,
  paid_date date,
  created_at timestamptz default now()
);

-- divisions
create table if not exists divisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text,
  parent_id uuid references divisions(id) on delete set null,
  layer int4,
  code text
);

-- employees
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  division_id uuid references divisions(id) on delete set null,
  active_status text,          -- active / off / secondment / doctor / system など
  name text,
  is_manager bool,
  app_role_id uuid references app_role(id) on delete set null,
  employee_no text,
  job_title text,
  sex text,
  start_date date,
  is_contacted_person bool,
  contacted_date date
);

-- tenant_service
create table if not exists tenant_service (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  service_id uuid references service(id) on delete cascade,
  start_date date,
  status text
);

-- service_category (Global Access)
create table if not exists service_category (
  id uuid primary key default gen_random_uuid(),
  sort_order int4,
  name text,
  description text,
  release_status text
);

-- service (hr-dx AI Agent service モジュール)
create table if not exists service (
  id uuid primary key default gen_random_uuid(),
  service_category_id uuid references service_category(id) on delete set null,
  name text,
  category text,
  title text,
  description text,
  sort_order int4,
  route_path text,
  app_role_group_id uuid,
  app_role_group_uuid uuid,
  target_audience text,
  release_status text
);

-- app_role
create table if not exists app_role (
  id uuid primary key default gen_random_uuid(),
  app_role text,
  name text
);

-- app_role_service
create table if not exists app_role_service (
  id uuid primary key default gen_random_uuid(),
  app_role_id uuid references app_role(id) on delete cascade,
  service_id uuid references service(id) on delete cascade
);