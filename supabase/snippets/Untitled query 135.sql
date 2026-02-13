set local row_security = on;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e97488f9-02be-4b0b-9dc9-ddb0c2902999', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select id, name from tenants;
select id, tenant_id, name from employees;
select id, tenant_id, service_id, status from tenant_service;