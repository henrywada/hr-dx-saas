set local row_security = on;
set local role authenticated;
select set_config('request.jwt.claim.sub', '467befb4-ee25-433c-be40-886ba3871d97', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select 'tenants' as tbl, jsonb_agg(t) as rows from tenants t
union all
select 'divisions' as tbl, jsonb_agg(d) as rows from divisions d
union all
select 'employees' as tbl, jsonb_agg(e) as rows from employees e
union all
select 'tenant_service' as tbl, jsonb_agg(ts) as rows from tenant_service ts;