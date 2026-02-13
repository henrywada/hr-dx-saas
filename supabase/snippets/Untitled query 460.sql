insert into tenant_service (id, tenant_id, service_id, start_date, status)
values
  ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active'),
  ('40000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-000000000001', '2024-01-01', 'active')
on conflict (id) do update
set tenant_id = excluded.tenant_id,
    service_id = excluded.service_id,
    start_date = excluded.start_date,
    status = excluded.status;