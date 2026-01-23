-- 1. 拡張機能の有効化 (Extensions)
create extension if not exists "pgcrypto";

-- 2. テーブル作成 (Tables) - 親テーブルから順に作成

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

-- divisions (部署)
create table divisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  name text not null,
  parent_id uuid references divisions(id),
  layer int4,
  code text
);
comment on table divisions is '部署マスタ（階層構造）';

-- employees (従業員)
create table employees (
  id uuid primary key default gen_random_uuid(), -- 実際の運用では auth.users.id と紐づけることが多い
  tenant_id uuid references tenants(id) not null,
  division_id uuid references divisions(id),
  name text, -- 暗号化対象
  app_role text check (app_role in ('employee', 'hr_manager', 'hr', 'boss', 'company_doctor', 'company_nurse', 'hsc', 'developer', 'test')),
  is_contacted_person bool default false,
  contacted_date date -- 暗号化対象
);
comment on table employees is '従業員マスタ';

-- service_category (サービスカテゴリ - グローバルマスタ)
create table service_category (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text
);
comment on table service_category is 'サービスカテゴリ（システム共通）';

-- service (サービス - グローバルマスタ)
create table service (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  service_category_id uuid references service_category(id),
  category text,
  description text
);
comment on table service is 'サービスマスタ（システム共通）';

-- tenant_service (テナント契約サービス)
create table tenant_service (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) not null,
  service_id uuid references service(id) not null,
  start_date date,
  status text
);
comment on table tenant_service is 'テナントごとの契約機能管理';


-- 3. ヘルパー関数の作成 (Functions) 
-- ※ここなら既に employees テーブルがあるのでエラーになりません

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


-- 4. RLSの有効化 (Enable RLS)

alter table tenants enable row level security;
alter table divisions enable row level security;
alter table employees enable row level security;
alter table service_category enable row level security;
alter table service enable row level security;
alter table tenant_service enable row level security;


-- 5. RLSポリシーの作成 (Policies)

-- A. グローバルマスタ (全ユーザー参照可能、書き込み不可)
create policy "Allow select for authenticated users" on service_category
  for select using (auth.role() = 'authenticated');

create policy "Allow select for authenticated users" on service
  for select using (auth.role() = 'authenticated');

-- B. テナント分離テーブル (自分のテナントのみ参照・操作可能)

-- tenants
create policy "Tenant isolation policy" on tenants
  using (id = get_auth_tenant_id());

-- divisions
create policy "Tenant isolation policy" on divisions
  using (tenant_id = get_auth_tenant_id());

-- employees
-- ※ employees自身のポリシーは無限ループを避けるため、自身のIDチェックまたは関数利用で慎重に行う
-- ここではシンプルに get_auth_tenant_id (自分自身を検索する関数) を利用しますが、
-- 新規登録(INSERT)時は tenant_id の整合性チェックが必要になります。
create policy "Tenant isolation policy" on employees
  using (tenant_id = get_auth_tenant_id())
  with check (tenant_id = get_auth_tenant_id());

-- tenant_service
create policy "Tenant isolation policy" on tenant_service
  using (tenant_id = get_auth_tenant_id());