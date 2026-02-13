insert into service_category (id, sort_order, name, description, release_status)
values
  ('20000000-0000-0000-0000-000000000001', 1, '基本', '基本サービス', 'released');

insert into service (id, service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'hr-agent', 'hr', 'HR Agent', 'HR支援', 1, '/hr-agent', 'all_users', 'released');