-- ユニーク制約を追加
ALTER TABLE "public"."pulse_configs" 
ADD CONSTRAINT "pulse_configs_tenant_id_key" UNIQUE ("tenant_id");
