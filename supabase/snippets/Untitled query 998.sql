set local row_security = on;
set local role authenticated;
select set_config('request.jwt.claim.sub', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select 'tenants' as tbl, jsonb_agg(t) as rows from tenants t
union all
select 'divisions' as tbl, jsonb_agg(d) as rows from divisions d
union all
select 'employees' as tbl, jsonb_agg(e) as rows from employees e
union all
select 'tenant_service' as tbl, jsonb_agg(ts) as rows from tenant_service ts;