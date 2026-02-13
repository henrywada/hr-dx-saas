select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in (
  'tenants','divisions','employees','tenant_service',
  'service_category','service','app_role','app_role_service'
);