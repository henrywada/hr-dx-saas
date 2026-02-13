
  create table "public"."app_role" (
    "id" uuid not null default gen_random_uuid(),
    "app_role" text,
    "name" text
      );


alter table "public"."app_role" enable row level security;


  create table "public"."app_role_service" (
    "id" uuid not null default gen_random_uuid(),
    "app_role_id" uuid,
    "service_id" uuid
      );


alter table "public"."app_role_service" enable row level security;


  create table "public"."divisions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "name" text,
    "parent_id" uuid,
    "layer" integer,
    "code" text
      );


alter table "public"."divisions" enable row level security;


  create table "public"."employees" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "division_id" uuid,
    "active_status" text,
    "name" text,
    "is_manager" boolean,
    "app_role_id" uuid,
    "employee_no" text,
    "job_title" text,
    "sex" text,
    "start_date" date,
    "is_contacted_person" boolean,
    "contacted_date" date,
    "user_id" uuid
      );


alter table "public"."employees" enable row level security;


  create table "public"."service" (
    "id" uuid not null default gen_random_uuid(),
    "service_category_id" uuid,
    "name" text,
    "category" text,
    "title" text,
    "description" text,
    "sort_order" integer,
    "route_path" text,
    "app_role_group_id" uuid,
    "app_role_group_uuid" uuid,
    "target_audience" text,
    "release_status" text
      );


alter table "public"."service" enable row level security;


  create table "public"."service_category" (
    "id" uuid not null default gen_random_uuid(),
    "sort_order" integer,
    "name" text,
    "description" text,
    "release_status" text
      );


alter table "public"."service_category" enable row level security;


  create table "public"."tenant_service" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid,
    "service_id" uuid,
    "start_date" date,
    "status" text
      );


alter table "public"."tenant_service" enable row level security;


  create table "public"."tenants" (
    "id" uuid not null default gen_random_uuid(),
    "name" text,
    "contact_date" date,
    "paid_amount" integer,
    "employee_count" integer,
    "paid_date" date,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."tenants" enable row level security;

CREATE UNIQUE INDEX app_role_pkey ON public.app_role USING btree (id);

CREATE UNIQUE INDEX app_role_service_pkey ON public.app_role_service USING btree (id);

CREATE UNIQUE INDEX divisions_pkey ON public.divisions USING btree (id);

CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id);

CREATE UNIQUE INDEX service_category_pkey ON public.service_category USING btree (id);

CREATE UNIQUE INDEX service_pkey ON public.service USING btree (id);

CREATE UNIQUE INDEX tenant_service_pkey ON public.tenant_service USING btree (id);

CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id);

alter table "public"."app_role" add constraint "app_role_pkey" PRIMARY KEY using index "app_role_pkey";

alter table "public"."app_role_service" add constraint "app_role_service_pkey" PRIMARY KEY using index "app_role_service_pkey";

alter table "public"."divisions" add constraint "divisions_pkey" PRIMARY KEY using index "divisions_pkey";

alter table "public"."employees" add constraint "employees_pkey" PRIMARY KEY using index "employees_pkey";

alter table "public"."service" add constraint "service_pkey" PRIMARY KEY using index "service_pkey";

alter table "public"."service_category" add constraint "service_category_pkey" PRIMARY KEY using index "service_category_pkey";

alter table "public"."tenant_service" add constraint "tenant_service_pkey" PRIMARY KEY using index "tenant_service_pkey";

alter table "public"."tenants" add constraint "tenants_pkey" PRIMARY KEY using index "tenants_pkey";

alter table "public"."app_role_service" add constraint "app_role_service_app_role_id_fkey" FOREIGN KEY (app_role_id) REFERENCES public.app_role(id) ON DELETE CASCADE not valid;

alter table "public"."app_role_service" validate constraint "app_role_service_app_role_id_fkey";

alter table "public"."app_role_service" add constraint "app_role_service_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.service(id) ON DELETE CASCADE not valid;

alter table "public"."app_role_service" validate constraint "app_role_service_service_id_fkey";

alter table "public"."divisions" add constraint "divisions_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.divisions(id) ON DELETE SET NULL not valid;

alter table "public"."divisions" validate constraint "divisions_parent_id_fkey";

alter table "public"."divisions" add constraint "divisions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."divisions" validate constraint "divisions_tenant_id_fkey";

alter table "public"."employees" add constraint "employees_app_role_id_fkey" FOREIGN KEY (app_role_id) REFERENCES public.app_role(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_app_role_id_fkey";

alter table "public"."employees" add constraint "employees_division_id_fkey" FOREIGN KEY (division_id) REFERENCES public.divisions(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_division_id_fkey";

alter table "public"."employees" add constraint "employees_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."employees" validate constraint "employees_tenant_id_fkey";

alter table "public"."employees" add constraint "employees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."employees" validate constraint "employees_user_id_fkey";

alter table "public"."service" add constraint "service_service_category_id_fkey" FOREIGN KEY (service_category_id) REFERENCES public.service_category(id) ON DELETE SET NULL not valid;

alter table "public"."service" validate constraint "service_service_category_id_fkey";

alter table "public"."tenant_service" add constraint "tenant_service_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.service(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_service" validate constraint "tenant_service_service_id_fkey";

alter table "public"."tenant_service" add constraint "tenant_service_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE not valid;

alter table "public"."tenant_service" validate constraint "tenant_service_tenant_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.tenant_id
  from public.employees e
  where e.user_id = auth.uid()
  limit 1
$function$
;

grant delete on table "public"."app_role" to "anon";

grant insert on table "public"."app_role" to "anon";

grant references on table "public"."app_role" to "anon";

grant select on table "public"."app_role" to "anon";

grant trigger on table "public"."app_role" to "anon";

grant truncate on table "public"."app_role" to "anon";

grant update on table "public"."app_role" to "anon";

grant delete on table "public"."app_role" to "authenticated";

grant insert on table "public"."app_role" to "authenticated";

grant references on table "public"."app_role" to "authenticated";

grant select on table "public"."app_role" to "authenticated";

grant trigger on table "public"."app_role" to "authenticated";

grant truncate on table "public"."app_role" to "authenticated";

grant update on table "public"."app_role" to "authenticated";

grant delete on table "public"."app_role" to "postgres";

grant insert on table "public"."app_role" to "postgres";

grant references on table "public"."app_role" to "postgres";

grant select on table "public"."app_role" to "postgres";

grant trigger on table "public"."app_role" to "postgres";

grant truncate on table "public"."app_role" to "postgres";

grant update on table "public"."app_role" to "postgres";

grant delete on table "public"."app_role" to "service_role";

grant insert on table "public"."app_role" to "service_role";

grant references on table "public"."app_role" to "service_role";

grant select on table "public"."app_role" to "service_role";

grant trigger on table "public"."app_role" to "service_role";

grant truncate on table "public"."app_role" to "service_role";

grant update on table "public"."app_role" to "service_role";

grant delete on table "public"."app_role_service" to "anon";

grant insert on table "public"."app_role_service" to "anon";

grant references on table "public"."app_role_service" to "anon";

grant select on table "public"."app_role_service" to "anon";

grant trigger on table "public"."app_role_service" to "anon";

grant truncate on table "public"."app_role_service" to "anon";

grant update on table "public"."app_role_service" to "anon";

grant delete on table "public"."app_role_service" to "authenticated";

grant insert on table "public"."app_role_service" to "authenticated";

grant references on table "public"."app_role_service" to "authenticated";

grant select on table "public"."app_role_service" to "authenticated";

grant trigger on table "public"."app_role_service" to "authenticated";

grant truncate on table "public"."app_role_service" to "authenticated";

grant update on table "public"."app_role_service" to "authenticated";

grant delete on table "public"."app_role_service" to "postgres";

grant insert on table "public"."app_role_service" to "postgres";

grant references on table "public"."app_role_service" to "postgres";

grant select on table "public"."app_role_service" to "postgres";

grant trigger on table "public"."app_role_service" to "postgres";

grant truncate on table "public"."app_role_service" to "postgres";

grant update on table "public"."app_role_service" to "postgres";

grant delete on table "public"."app_role_service" to "service_role";

grant insert on table "public"."app_role_service" to "service_role";

grant references on table "public"."app_role_service" to "service_role";

grant select on table "public"."app_role_service" to "service_role";

grant trigger on table "public"."app_role_service" to "service_role";

grant truncate on table "public"."app_role_service" to "service_role";

grant update on table "public"."app_role_service" to "service_role";

grant delete on table "public"."divisions" to "anon";

grant insert on table "public"."divisions" to "anon";

grant references on table "public"."divisions" to "anon";

grant select on table "public"."divisions" to "anon";

grant trigger on table "public"."divisions" to "anon";

grant truncate on table "public"."divisions" to "anon";

grant update on table "public"."divisions" to "anon";

grant delete on table "public"."divisions" to "authenticated";

grant insert on table "public"."divisions" to "authenticated";

grant references on table "public"."divisions" to "authenticated";

grant select on table "public"."divisions" to "authenticated";

grant trigger on table "public"."divisions" to "authenticated";

grant truncate on table "public"."divisions" to "authenticated";

grant update on table "public"."divisions" to "authenticated";

grant delete on table "public"."divisions" to "postgres";

grant insert on table "public"."divisions" to "postgres";

grant references on table "public"."divisions" to "postgres";

grant select on table "public"."divisions" to "postgres";

grant trigger on table "public"."divisions" to "postgres";

grant truncate on table "public"."divisions" to "postgres";

grant update on table "public"."divisions" to "postgres";

grant delete on table "public"."divisions" to "service_role";

grant insert on table "public"."divisions" to "service_role";

grant references on table "public"."divisions" to "service_role";

grant select on table "public"."divisions" to "service_role";

grant trigger on table "public"."divisions" to "service_role";

grant truncate on table "public"."divisions" to "service_role";

grant update on table "public"."divisions" to "service_role";

grant delete on table "public"."employees" to "anon";

grant insert on table "public"."employees" to "anon";

grant references on table "public"."employees" to "anon";

grant select on table "public"."employees" to "anon";

grant trigger on table "public"."employees" to "anon";

grant truncate on table "public"."employees" to "anon";

grant update on table "public"."employees" to "anon";

grant delete on table "public"."employees" to "authenticated";

grant insert on table "public"."employees" to "authenticated";

grant references on table "public"."employees" to "authenticated";

grant select on table "public"."employees" to "authenticated";

grant trigger on table "public"."employees" to "authenticated";

grant truncate on table "public"."employees" to "authenticated";

grant update on table "public"."employees" to "authenticated";

grant delete on table "public"."employees" to "postgres";

grant insert on table "public"."employees" to "postgres";

grant references on table "public"."employees" to "postgres";

grant select on table "public"."employees" to "postgres";

grant trigger on table "public"."employees" to "postgres";

grant truncate on table "public"."employees" to "postgres";

grant update on table "public"."employees" to "postgres";

grant delete on table "public"."employees" to "service_role";

grant insert on table "public"."employees" to "service_role";

grant references on table "public"."employees" to "service_role";

grant select on table "public"."employees" to "service_role";

grant trigger on table "public"."employees" to "service_role";

grant truncate on table "public"."employees" to "service_role";

grant update on table "public"."employees" to "service_role";

grant delete on table "public"."service" to "anon";

grant insert on table "public"."service" to "anon";

grant references on table "public"."service" to "anon";

grant select on table "public"."service" to "anon";

grant trigger on table "public"."service" to "anon";

grant truncate on table "public"."service" to "anon";

grant update on table "public"."service" to "anon";

grant delete on table "public"."service" to "authenticated";

grant insert on table "public"."service" to "authenticated";

grant references on table "public"."service" to "authenticated";

grant select on table "public"."service" to "authenticated";

grant trigger on table "public"."service" to "authenticated";

grant truncate on table "public"."service" to "authenticated";

grant update on table "public"."service" to "authenticated";

grant delete on table "public"."service" to "postgres";

grant insert on table "public"."service" to "postgres";

grant references on table "public"."service" to "postgres";

grant select on table "public"."service" to "postgres";

grant trigger on table "public"."service" to "postgres";

grant truncate on table "public"."service" to "postgres";

grant update on table "public"."service" to "postgres";

grant delete on table "public"."service" to "service_role";

grant insert on table "public"."service" to "service_role";

grant references on table "public"."service" to "service_role";

grant select on table "public"."service" to "service_role";

grant trigger on table "public"."service" to "service_role";

grant truncate on table "public"."service" to "service_role";

grant update on table "public"."service" to "service_role";

grant delete on table "public"."service_category" to "anon";

grant insert on table "public"."service_category" to "anon";

grant references on table "public"."service_category" to "anon";

grant select on table "public"."service_category" to "anon";

grant trigger on table "public"."service_category" to "anon";

grant truncate on table "public"."service_category" to "anon";

grant update on table "public"."service_category" to "anon";

grant delete on table "public"."service_category" to "authenticated";

grant insert on table "public"."service_category" to "authenticated";

grant references on table "public"."service_category" to "authenticated";

grant select on table "public"."service_category" to "authenticated";

grant trigger on table "public"."service_category" to "authenticated";

grant truncate on table "public"."service_category" to "authenticated";

grant update on table "public"."service_category" to "authenticated";

grant delete on table "public"."service_category" to "postgres";

grant insert on table "public"."service_category" to "postgres";

grant references on table "public"."service_category" to "postgres";

grant select on table "public"."service_category" to "postgres";

grant trigger on table "public"."service_category" to "postgres";

grant truncate on table "public"."service_category" to "postgres";

grant update on table "public"."service_category" to "postgres";

grant delete on table "public"."service_category" to "service_role";

grant insert on table "public"."service_category" to "service_role";

grant references on table "public"."service_category" to "service_role";

grant select on table "public"."service_category" to "service_role";

grant trigger on table "public"."service_category" to "service_role";

grant truncate on table "public"."service_category" to "service_role";

grant update on table "public"."service_category" to "service_role";

grant delete on table "public"."tenant_service" to "anon";

grant insert on table "public"."tenant_service" to "anon";

grant references on table "public"."tenant_service" to "anon";

grant select on table "public"."tenant_service" to "anon";

grant trigger on table "public"."tenant_service" to "anon";

grant truncate on table "public"."tenant_service" to "anon";

grant update on table "public"."tenant_service" to "anon";

grant delete on table "public"."tenant_service" to "authenticated";

grant insert on table "public"."tenant_service" to "authenticated";

grant references on table "public"."tenant_service" to "authenticated";

grant select on table "public"."tenant_service" to "authenticated";

grant trigger on table "public"."tenant_service" to "authenticated";

grant truncate on table "public"."tenant_service" to "authenticated";

grant update on table "public"."tenant_service" to "authenticated";

grant delete on table "public"."tenant_service" to "postgres";

grant insert on table "public"."tenant_service" to "postgres";

grant references on table "public"."tenant_service" to "postgres";

grant select on table "public"."tenant_service" to "postgres";

grant trigger on table "public"."tenant_service" to "postgres";

grant truncate on table "public"."tenant_service" to "postgres";

grant update on table "public"."tenant_service" to "postgres";

grant delete on table "public"."tenant_service" to "service_role";

grant insert on table "public"."tenant_service" to "service_role";

grant references on table "public"."tenant_service" to "service_role";

grant select on table "public"."tenant_service" to "service_role";

grant trigger on table "public"."tenant_service" to "service_role";

grant truncate on table "public"."tenant_service" to "service_role";

grant update on table "public"."tenant_service" to "service_role";

grant delete on table "public"."tenants" to "anon";

grant insert on table "public"."tenants" to "anon";

grant references on table "public"."tenants" to "anon";

grant select on table "public"."tenants" to "anon";

grant trigger on table "public"."tenants" to "anon";

grant truncate on table "public"."tenants" to "anon";

grant update on table "public"."tenants" to "anon";

grant delete on table "public"."tenants" to "authenticated";

grant insert on table "public"."tenants" to "authenticated";

grant references on table "public"."tenants" to "authenticated";

grant select on table "public"."tenants" to "authenticated";

grant trigger on table "public"."tenants" to "authenticated";

grant truncate on table "public"."tenants" to "authenticated";

grant update on table "public"."tenants" to "authenticated";

grant delete on table "public"."tenants" to "postgres";

grant insert on table "public"."tenants" to "postgres";

grant references on table "public"."tenants" to "postgres";

grant select on table "public"."tenants" to "postgres";

grant trigger on table "public"."tenants" to "postgres";

grant truncate on table "public"."tenants" to "postgres";

grant update on table "public"."tenants" to "postgres";

grant delete on table "public"."tenants" to "service_role";

grant insert on table "public"."tenants" to "service_role";

grant references on table "public"."tenants" to "service_role";

grant select on table "public"."tenants" to "service_role";

grant trigger on table "public"."tenants" to "service_role";

grant truncate on table "public"."tenants" to "service_role";

grant update on table "public"."tenants" to "service_role";


  create policy "global_select_app_role"
  on "public"."app_role"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "global_write_app_role"
  on "public"."app_role"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "supa_write_app_role"
  on "public"."app_role"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "global_select_app_role_service"
  on "public"."app_role_service"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "global_write_app_role_service"
  on "public"."app_role_service"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "supa_write_app_role_service"
  on "public"."app_role_service"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "divisions_delete_same_tenant"
  on "public"."divisions"
  as permissive
  for delete
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "divisions_insert_same_tenant"
  on "public"."divisions"
  as permissive
  for insert
  to public
with check ((tenant_id = public.current_tenant_id()));



  create policy "divisions_select_same_tenant"
  on "public"."divisions"
  as permissive
  for select
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "divisions_update_same_tenant"
  on "public"."divisions"
  as permissive
  for update
  to public
using ((tenant_id = public.current_tenant_id()))
with check ((tenant_id = public.current_tenant_id()));



  create policy "supa_divisions_all"
  on "public"."divisions"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "employees_delete_same_tenant"
  on "public"."employees"
  as permissive
  for delete
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "employees_insert_same_tenant"
  on "public"."employees"
  as permissive
  for insert
  to public
with check ((tenant_id = public.current_tenant_id()));



  create policy "employees_select_same_tenant"
  on "public"."employees"
  as permissive
  for select
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "employees_update_same_tenant"
  on "public"."employees"
  as permissive
  for update
  to public
using ((tenant_id = public.current_tenant_id()))
with check ((tenant_id = public.current_tenant_id()));



  create policy "supa_employees_all"
  on "public"."employees"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "global_select_service"
  on "public"."service"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "global_write_service"
  on "public"."service"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "supa_write_service"
  on "public"."service"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "global_select_service_category"
  on "public"."service_category"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "global_write_service_category"
  on "public"."service_category"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text))
with check ((auth.role() = 'service_role'::text));



  create policy "supa_write_service_category"
  on "public"."service_category"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "supa_tenant_service_all"
  on "public"."tenant_service"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "tenant_service_delete_same_tenant"
  on "public"."tenant_service"
  as permissive
  for delete
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "tenant_service_insert_same_tenant"
  on "public"."tenant_service"
  as permissive
  for insert
  to public
with check ((tenant_id = public.current_tenant_id()));



  create policy "tenant_service_select_same_tenant"
  on "public"."tenant_service"
  as permissive
  for select
  to public
using ((tenant_id = public.current_tenant_id()));



  create policy "tenant_service_update_same_tenant"
  on "public"."tenant_service"
  as permissive
  for update
  to public
using ((tenant_id = public.current_tenant_id()))
with check ((tenant_id = public.current_tenant_id()));



  create policy "supa_tenants_all"
  on "public"."tenants"
  as permissive
  for all
  to public
using ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid))
with check ((auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid));



  create policy "tenants_select_same_tenant"
  on "public"."tenants"
  as permissive
  for select
  to public
using ((id = public.current_tenant_id()));



  create policy "tenants_update_same_tenant"
  on "public"."tenants"
  as permissive
  for update
  to public
using ((id = public.current_tenant_id()))
with check ((id = public.current_tenant_id()));



