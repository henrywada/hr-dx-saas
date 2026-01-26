alter table "public"."divisions" drop constraint if exists "divisions_layer_check";

drop index if exists "public"."idx_divisions_tenant_code";

drop index if exists "public"."idx_divisions_tenant_layer";

drop index if exists "public"."idx_divisions_tenant_parent";

alter table "public"."divisions" drop column if exists "description";

alter table "public"."employees" drop column if exists "is_setup_complete";



