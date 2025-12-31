-- Create organizations table
create table "public"."organizations" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  constraint "organizations_pkey" primary key ("id")
);

-- Create profiles table
create table "public"."profiles" (
  "id" uuid not null,
  "organization_id" uuid,
  "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
  constraint "profiles_pkey" primary key ("id"),
  constraint "profiles_id_fkey" foreign key ("id") references "auth"."users"("id") on delete cascade,
  constraint "profiles_organization_id_fkey" foreign key ("organization_id") references "public"."organizations"("id") on delete set null
);

-- Enable RLS
alter table "public"."organizations" enable row level security;
alter table "public"."profiles" enable row level security;

-- RLS Policies

-- Profiles: Users can view/edit their own profile
create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));

create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));

create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));

-- Organizations: Users can view their own organization
create policy "Users can view own organization"
on "public"."organizations"
as permissive
for select
to public
using ((id in (select profiles.organization_id from profiles where profiles.id = auth.uid())));
