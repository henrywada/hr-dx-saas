revoke delete on table "public"."divisions" from "anon";

revoke insert on table "public"."divisions" from "anon";

revoke references on table "public"."divisions" from "anon";

revoke select on table "public"."divisions" from "anon";

revoke trigger on table "public"."divisions" from "anon";

revoke truncate on table "public"."divisions" from "anon";

revoke update on table "public"."divisions" from "anon";

revoke delete on table "public"."divisions" from "authenticated";

revoke insert on table "public"."divisions" from "authenticated";

revoke references on table "public"."divisions" from "authenticated";

revoke select on table "public"."divisions" from "authenticated";

revoke trigger on table "public"."divisions" from "authenticated";

revoke truncate on table "public"."divisions" from "authenticated";

revoke update on table "public"."divisions" from "authenticated";

revoke delete on table "public"."divisions" from "service_role";

revoke insert on table "public"."divisions" from "service_role";

revoke references on table "public"."divisions" from "service_role";

revoke select on table "public"."divisions" from "service_role";

revoke trigger on table "public"."divisions" from "service_role";

revoke truncate on table "public"."divisions" from "service_role";

revoke update on table "public"."divisions" from "service_role";

revoke delete on table "public"."employees" from "anon";

revoke insert on table "public"."employees" from "anon";

revoke references on table "public"."employees" from "anon";

revoke select on table "public"."employees" from "anon";

revoke trigger on table "public"."employees" from "anon";

revoke truncate on table "public"."employees" from "anon";

revoke update on table "public"."employees" from "anon";

revoke delete on table "public"."employees" from "authenticated";

revoke insert on table "public"."employees" from "authenticated";

revoke references on table "public"."employees" from "authenticated";

revoke select on table "public"."employees" from "authenticated";

revoke trigger on table "public"."employees" from "authenticated";

revoke truncate on table "public"."employees" from "authenticated";

revoke update on table "public"."employees" from "authenticated";

revoke delete on table "public"."employees" from "service_role";

revoke insert on table "public"."employees" from "service_role";

revoke references on table "public"."employees" from "service_role";

revoke select on table "public"."employees" from "service_role";

revoke trigger on table "public"."employees" from "service_role";

revoke truncate on table "public"."employees" from "service_role";

revoke update on table "public"."employees" from "service_role";

revoke delete on table "public"."services" from "anon";

revoke insert on table "public"."services" from "anon";

revoke references on table "public"."services" from "anon";

revoke select on table "public"."services" from "anon";

revoke trigger on table "public"."services" from "anon";

revoke truncate on table "public"."services" from "anon";

revoke update on table "public"."services" from "anon";

revoke delete on table "public"."services" from "authenticated";

revoke insert on table "public"."services" from "authenticated";

revoke references on table "public"."services" from "authenticated";

revoke select on table "public"."services" from "authenticated";

revoke trigger on table "public"."services" from "authenticated";

revoke truncate on table "public"."services" from "authenticated";

revoke update on table "public"."services" from "authenticated";

revoke delete on table "public"."services" from "service_role";

revoke insert on table "public"."services" from "service_role";

revoke references on table "public"."services" from "service_role";

revoke select on table "public"."services" from "service_role";

revoke trigger on table "public"."services" from "service_role";

revoke truncate on table "public"."services" from "service_role";

revoke update on table "public"."services" from "service_role";

revoke delete on table "public"."tenant_services" from "anon";

revoke insert on table "public"."tenant_services" from "anon";

revoke references on table "public"."tenant_services" from "anon";

revoke select on table "public"."tenant_services" from "anon";

revoke trigger on table "public"."tenant_services" from "anon";

revoke truncate on table "public"."tenant_services" from "anon";

revoke update on table "public"."tenant_services" from "anon";

revoke delete on table "public"."tenant_services" from "authenticated";

revoke insert on table "public"."tenant_services" from "authenticated";

revoke references on table "public"."tenant_services" from "authenticated";

revoke select on table "public"."tenant_services" from "authenticated";

revoke trigger on table "public"."tenant_services" from "authenticated";

revoke truncate on table "public"."tenant_services" from "authenticated";

revoke update on table "public"."tenant_services" from "authenticated";

revoke delete on table "public"."tenant_services" from "service_role";

revoke insert on table "public"."tenant_services" from "service_role";

revoke references on table "public"."tenant_services" from "service_role";

revoke select on table "public"."tenant_services" from "service_role";

revoke trigger on table "public"."tenant_services" from "service_role";

revoke truncate on table "public"."tenant_services" from "service_role";

revoke update on table "public"."tenant_services" from "service_role";

revoke delete on table "public"."tenants" from "anon";

revoke insert on table "public"."tenants" from "anon";

revoke references on table "public"."tenants" from "anon";

revoke select on table "public"."tenants" from "anon";

revoke trigger on table "public"."tenants" from "anon";

revoke truncate on table "public"."tenants" from "anon";

revoke update on table "public"."tenants" from "anon";

revoke delete on table "public"."tenants" from "authenticated";

revoke insert on table "public"."tenants" from "authenticated";

revoke references on table "public"."tenants" from "authenticated";

revoke select on table "public"."tenants" from "authenticated";

revoke trigger on table "public"."tenants" from "authenticated";

revoke truncate on table "public"."tenants" from "authenticated";

revoke update on table "public"."tenants" from "authenticated";

revoke delete on table "public"."tenants" from "service_role";

revoke insert on table "public"."tenants" from "service_role";

revoke references on table "public"."tenants" from "service_role";

revoke select on table "public"."tenants" from "service_role";

revoke trigger on table "public"."tenants" from "service_role";

revoke truncate on table "public"."tenants" from "service_role";

revoke update on table "public"."tenants" from "service_role";

alter table "public"."divisions" drop constraint "divisions_tenant_id_fkey";

alter table "public"."employees" drop constraint "employees_division_id_fkey";

alter table "public"."employees" drop constraint "employees_id_fkey";

alter table "public"."employees" drop constraint "employees_role_check";

alter table "public"."employees" drop constraint "employees_tenant_id_fkey";

alter table "public"."tenant_services" drop constraint "tenant_services_service_id_fkey";

alter table "public"."tenant_services" drop constraint "tenant_services_tenant_id_fkey";

alter table "public"."divisions" drop constraint "divisions_pkey";

alter table "public"."employees" drop constraint "employees_pkey";

alter table "public"."services" drop constraint "services_pkey";

alter table "public"."tenant_services" drop constraint "tenant_services_pkey";

alter table "public"."tenants" drop constraint "tenants_pkey";

drop index if exists "public"."divisions_pkey";

drop index if exists "public"."employees_pkey";

drop index if exists "public"."services_pkey";

drop index if exists "public"."tenant_services_pkey";

drop index if exists "public"."tenants_pkey";

drop table "public"."divisions";

drop table "public"."employees";

drop table "public"."services";

drop table "public"."tenant_services";

drop table "public"."tenants";


