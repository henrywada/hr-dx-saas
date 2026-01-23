drop policy "Tenant isolation for divisions" on "public"."divisions";

drop policy "Tenant isolation for employees" on "public"."employees";

drop policy "Tenant isolation for tenant_service" on "public"."tenant_service";

drop policy "Tenant isolation for tenants" on "public"."tenants";


  create policy "Tenant isolation for divisions"
  on "public"."divisions"
  as permissive
  for all
  to public
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superuser'::text) OR (tenant_id = public.get_auth_tenant_id())));



  create policy "Tenant isolation for employees"
  on "public"."employees"
  as permissive
  for all
  to public
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superuser'::text) OR (tenant_id = public.get_auth_tenant_id())));



  create policy "Tenant isolation for tenant_service"
  on "public"."tenant_service"
  as permissive
  for all
  to public
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superuser'::text) OR (tenant_id = public.get_auth_tenant_id())));



  create policy "Tenant isolation for tenants"
  on "public"."tenants"
  as permissive
  for all
  to public
using (((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superuser'::text) OR (id = public.get_auth_tenant_id())));



