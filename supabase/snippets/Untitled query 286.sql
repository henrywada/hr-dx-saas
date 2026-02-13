-- 1) テナント作成
insert into tenants (id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'Tenant A'),
  ('22222222-2222-2222-2222-222222222222', 'Tenant B');

-- 2) 部署作成
insert into divisions (id, tenant_id, name, layer, code)
values
  ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', '東京本社', 1, 'A-HQ'),
  ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222222', '大阪本社', 1, 'B-HQ');

-- 3) app_role（グローバル）
insert into app_role (id, app_role, name)
values
  ('r0000000-0000-0000-0000-000000000001', 'employee', '従業員'),
  ('r0000000-0000-0000-0000-000000000002', 'hr_manager', '人事マネージャー');

-- 4) service_category / service（グローバル）
insert into service_category (id, sort_order, name, description, release_status)
values
  ('c0000000-0000-0000-0000-000000000001', 1, '基本', '基本サービス', 'released');

insert into service (id, service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
values
  ('s0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'hr-agent', 'hr', 'HR Agent', 'HR支援', 1, '/hr-agent', 'all_users', 'released');

-- 5) employees（各テナント1名ずつ）
insert into employees (
  id, tenant_id, division_id, active_status, name, is_manager, app_role_id, employee_no, job_title, sex, start_date, is_contacted_person, contacted_date
) values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
   'active', 'A太郎', true,  'r0000000-0000-0000-0000-000000000002', 'A-001', 'HR', 'M', '2024-01-01', true, '2024-01-02'),
  ('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
   'active', 'B花子', false, 'r0000000-0000-0000-0000-000000000001', 'B-001', 'Sales', 'F', '2024-01-01', false, null);

-- 6) tenant_service（各テナント）
insert into tenant_service (id, tenant_id, service_id, start_date, status)
values
  ('ts111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 's0000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
  ('ts222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 's0000000-0000-0000-0000-000000000001', '2024-01-01', 'active');

-- 7) employees.user_id を紐づけ（AuthユーザーUUIDに置換）
update employees
set user_id = '<USER_A_UUID>'
where id = 'e1111111-1111-1111-1111-111111111111';

update employees
set user_id = '<USER_B_UUID>'
where id = 'e2222222-2222-2222-2222-222222222222';