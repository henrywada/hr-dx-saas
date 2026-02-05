-- トランザクション開始
BEGIN;

-- 所有者を一時的に変更
ALTER TABLE "public"."pulse_configs" OWNER TO postgres;

-- ユニーク制約を追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pulse_configs_tenant_id_key'
  ) THEN
    ALTER TABLE "public"."pulse_configs" 
    ADD CONSTRAINT "pulse_configs_tenant_id_key" UNIQUE ("tenant_id");
  END IF;
END $$;

-- 所有者を元に戻す
ALTER TABLE "public"."pulse_configs" OWNER TO supabase_admin;

COMMIT;
