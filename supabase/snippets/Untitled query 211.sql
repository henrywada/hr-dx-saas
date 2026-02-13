set
  local row_security = on;

set
  local role authenticated;

do $$
begin
  perform set_config('request.jwt.claim.sub', '610ac6ac-395b-436a-b7f3-8a6d83cb073c', true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end $$;

select
  'tenants' as tbl,
  to_jsonb(t) as row
from
  tenants t
union all
select
  'divisions' as tbl,
  to_jsonb(d) as row
from
  divisions d
union all
select
  'employees' as tbl,
  to_jsonb(e) as row
from
  employees e
union all
select
  'tenant_service' as tbl,
  to_jsonb(ts) as row
from
  tenant_service ts;