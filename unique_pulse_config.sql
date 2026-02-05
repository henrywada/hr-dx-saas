-- 重複データの削除（最新の1件を残して削除）
DELETE FROM "public"."pulse_configs"
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at DESC) as rn
    FROM "public"."pulse_configs"
  ) t
  WHERE t.rn = 1
);

-- ユニーク制約の追加
ALTER TABLE "public"."pulse_configs" 
ADD CONSTRAINT "pulse_configs_tenant_id_key" UNIQUE ("tenant_id");
