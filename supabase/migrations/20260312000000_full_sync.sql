-- 旧内容は pg_dump 全量であり 20260307000000_init_schema 等と重複していた。
-- 主キー・UNIQUE・INDEX の二重定義で「multiple primary keys」等のエラーになるため、
-- 先行マイグレーションに無い差分のみ適用する。

-- myou_delivery_logs: 同一シリアルへの二重納品登録を防ぐ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'myou_delivery_logs'
      AND c.conname = 'unique_product_delivery'
  ) THEN
    ALTER TABLE ONLY public.myou_delivery_logs
      ADD CONSTRAINT unique_product_delivery UNIQUE (serial_number);
  END IF;
END $$;
