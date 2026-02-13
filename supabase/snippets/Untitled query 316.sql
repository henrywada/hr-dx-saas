set local row_security = on;
set local role authenticated;
select set_config('request.jwt.claim.sub', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.current_tenant_id() as current_tenant_id;
select id, name from tenants;
select id, tenant_id, name from divisions;
select id, tenant_id, name from employees;
select id, tenant_id, service_id, status from tenant_service;