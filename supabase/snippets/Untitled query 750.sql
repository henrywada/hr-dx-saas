-- RLS有効化（念のため）
alter table tenants enable row level security;
alter table divisions enable row level security;
alter table employees enable row level security;
alter table tenant_service enable row level security;

alter table service_category enable row level security;
alter table service enable row level security;
alter table app_role enable row level security;
alter table app_role_service enable row level security;

-- マルチテナント：同一テナントのみ
create policy "tenants_select_same_tenant"
on tenants for select
using (id = public.current_tenant_id());

create policy "tenants_update_same_tenant"
on tenants for update
using (id = public.current_tenant_id())
with check (id = public.current_tenant_id());

create policy "divisions_select_same_tenant"
on divisions for select
using (tenant_id = public.current_tenant_id());

create policy "divisions_insert_same_tenant"
on divisions for insert
with check (tenant_id = public.current_tenant_id());

create policy "divisions_update_same_tenant"
on divisions for update
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "divisions_delete_same_tenant"
on divisions for delete
using (tenant_id = public.current_tenant_id());

create policy "employees_select_same_tenant"
on employees for select
using (tenant_id = public.current_tenant_id());

create policy "employees_insert_same_tenant"
on employees for insert
with check (tenant_id = public.current_tenant_id());

create policy "employees_update_same_tenant"
on employees for update
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "employees_delete_same_tenant"
on employees for delete
using (tenant_id = public.current_tenant_id());

create policy "tenant_service_select_same_tenant"
on tenant_service for select
using (tenant_id = public.current_tenant_id());

create policy "tenant_service_insert_same_tenant"
on tenant_service for insert
with check (tenant_id = public.current_tenant_id());

create policy "tenant_service_update_same_tenant"
on tenant_service for update
using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create policy "tenant_service_delete_same_tenant"
on tenant_service for delete
using (tenant_id = public.current_tenant_id());

-- グローバル：全認証ユーザーは閲覧のみ
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

-- 書き込みは service_role のみ
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