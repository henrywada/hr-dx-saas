insert into tenant_service (id, tenant_id, service_id, start_date, status)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active');