-- RLSが有効かどうか
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in (
  'tenants','divisions','employees','tenant_service',
  'service_category','service','app_role','app_role_service'
);

-- ポリシー一覧
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where tablename in (
  'tenants','divisions','employees','tenant_service',
  'service_category','service','app_role','app_role_service'
)
order by tablename, policyname;