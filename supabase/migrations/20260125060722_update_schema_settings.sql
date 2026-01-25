alter table "public"."divisions" drop constraint "divisions_layer_check";

drop index if exists "public"."idx_divisions_tenant_code";

drop index if exists "public"."idx_divisions_tenant_layer";

drop index if exists "public"."idx_divisions_tenant_parent";

alter table "public"."divisions" drop column "description";

alter table "public"."employees" drop column "is_setup_complete";


