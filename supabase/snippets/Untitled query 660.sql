create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.tenant_id
  from public.employees e
  where e.user_id = auth.uid()
  limit 1
$$;