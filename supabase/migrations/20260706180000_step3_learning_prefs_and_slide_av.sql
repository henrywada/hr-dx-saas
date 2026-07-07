-- ===== (A) el_slides: 音声・字幕(強化層) =====
alter table public.el_slides
  add column if not exists audio_url  text,
  add column if not exists transcript text;

-- ===== (B) el_learning_preferences: 従業員別 音声/字幕プリファレンス =====
create table if not exists public.el_learning_preferences (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id)   on delete cascade,
  employee_id      uuid not null references public.employees(id) on delete cascade,
  audio_enabled    boolean not null default false,
  captions_enabled boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (employee_id)
);

alter table public.el_learning_preferences enable row level security;

create policy el_learning_preferences_select_self
  on public.el_learning_preferences for select
  using (tenant_id = public.current_tenant_id()
     and employee_id = public.current_employee_id());

create policy el_learning_preferences_insert_self
  on public.el_learning_preferences for insert
  with check (tenant_id = public.current_tenant_id()
          and employee_id = public.current_employee_id());

create policy el_learning_preferences_update_self
  on public.el_learning_preferences for update
  using (tenant_id = public.current_tenant_id()
     and employee_id = public.current_employee_id())
  with check (tenant_id = public.current_tenant_id()
          and employee_id = public.current_employee_id());

create trigger set_el_learning_preferences_updated_at
  before update on public.el_learning_preferences
  for each row execute function public.set_updated_at();
