select n.nspname as schema, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'tenants','divisions','employees','tenant_service',
    'service_category','service','app_role','app_role_service'
  )
order by c.relname;