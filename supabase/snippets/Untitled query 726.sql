-- app_role
insert into app_role (id, app_role, name)
values
  ('10000000-0000-0000-0000-000000000001', 'employee', '従業員'),
  ('10000000-0000-0000-0000-000000000002', 'hr_manager', '人事マネージャー');

-- service_category
insert into service_category (id, sort_order, name, description, release_status)
values
  ('20000000-0000-0000-0000-000000000001', 1, '基本', '基本サービス', 'released');

-- service
insert into service (id, service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'hr-agent', 'hr', 'HR Agent', 'HR支援', 1, '/hr-agent', 'all_users', 'released');

-- tenant_service
insert into tenant_service (id, tenant_id, service_id, start_date, status)
values
  ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
  ('40000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active');