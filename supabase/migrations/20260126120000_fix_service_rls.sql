-- Create a function to check if the current user is a developer
create or replace function is_developer()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from employees
    where id = auth.uid()
    and app_role = 'developer'
  );
$$;

comment on function is_developer is 'Check if the current user has the developer role';

-- Policies for service_category
create policy "Developers can manage service_category"
  on service_category
  for all
  to authenticated
  using (is_developer())
  with check (is_developer());

-- Policies for service
create policy "Developers can manage service"
  on service
  for all
  to authenticated
  using (is_developer())
  with check (is_developer());
