set local row_security = on;
set local role authenticated;
select set_config('request.jwt.claim.sub', '467befb4-ee25-433c-be40-886ba3871d97', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select id, name from tenants;
select id, tenant_id, name from divisions;
select id, tenant_id, name from employees;
select id, tenant_id, service_id, status from tenant_service;