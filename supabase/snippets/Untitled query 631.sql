select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tenants','divisions','employees','tenant_service',
    'service_category','service','app_role','app_role_service'
  )
order by tablename, policyname;