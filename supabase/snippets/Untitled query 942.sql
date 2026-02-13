do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_user_id_fkey'
  ) then
    alter table employees
      add constraint employees_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;