-- 1) employees に user_id を追加（未追加の場合）
alter table employees
  add column if not exists user_id uuid;

-- auth.users との外部キー（任意）
alter table employees
  add constraint if not exists employees_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- 同一ユーザーが複数社員に紐づかない想定なら
create unique index if not exists employees_user_id_uidx
  on employees(user_id);

-- 2) current tenant を取得する関数
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.tenant_id
  from public.employees e
  where e.user_id = auth.uid()
  limit 1
$$;

-- 3) RLS 有効化（マルチテナント対象）
alter table tenants enable row level security;
alter table divisions enable row level security;
alter table employees enable row level security;
alter table tenant_service enable row level security;

-- 4) マルチテナント用ポリシー（同一テナントのみアクセス）
-- tenants
create policy "tenants_select_same_tenant"
on tenants for select
using (id = current_tenant_id());

create policy "tenants_update_same_tenant"
on tenants for update
using (id = current_tenant_id())
with check (id = current_tenant_id());

-- divisions
create policy "divisions_select_same_tenant"
on divisions for select
using (tenant_id = current_tenant_id());

create policy "divisions_insert_same_tenant"
on divisions for insert
with check (tenant_id = current_tenant_id());

create policy "divisions_update_same_tenant"
on divisions for update
using (tenant_id = current_tenant_id())
with check (tenant_id = current_tenant_id());

create policy "divisions_delete_same_tenant"
on divisions for delete
using (tenant_id = current_tenant_id());

-- employees
create policy "employees_select_same_tenant"
on employees for select
using (tenant_id = current_tenant_id());

create policy "employees_insert_same_tenant"
on employees for insert
with check (tenant_id = current_tenant_id());

create policy "employees_update_same_tenant"
on employees for update
using (tenant_id = current_tenant_id())
with check (tenant_id = current_tenant_id());

create policy "employees_delete_same_tenant"
on employees for delete
using (tenant_id = current_tenant_id());

-- tenant_service
create policy "tenant_service_select_same_tenant"
on tenant_service for select
using (tenant_id = current_tenant_id());

create policy "tenant_service_insert_same_tenant"
on tenant_service for insert
with check (tenant_id = current_tenant_id());

create policy "tenant_service_update_same_tenant"
on tenant_service for update
using (tenant_id = current_tenant_id())
with check (tenant_id = current_tenant_id());

create policy "tenant_service_delete_same_tenant"
on tenant_service for delete
using (tenant_id = current_tenant_id());

-- 5) グローバル・アクセス（全テナント共通）
-- 読み取りのみ許可、書き込みは service_role のみ
alter table service_category enable row level security;
alter table service enable row level security;
alter table app_role enable row level security;
alter table app_role_service enable row level security;

-- 全認証ユーザーに SELECT を許可
create policy "global_select_service_category"
on service_category for select
using (auth.role() = 'authenticated');

create policy "global_select_service"
on service for select
using (auth.role() = 'authenticated');

create policy "global_select_app_role"
on app_role for select
using (auth.role() = 'authenticated');

create policy "global_select_app_role_service"
on app_role_service for select
using (auth.role() = 'authenticated');

-- 書き込みは service_role のみに限定（管理用途）
create policy "global_write_service_category"
on service_category for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "global_write_service"
on service for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "global_write_app_role"
on app_role for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "global_write_app_role_service"
on app_role_service for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');