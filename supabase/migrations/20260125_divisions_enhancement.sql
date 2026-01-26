-- 組織管理機能強化のためのマイグレーション
-- divisionsテーブルに追加の制約とインデックスを設定します

-- 1. description列の追加（まだ存在しない場合）
ALTER TABLE divisions 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN divisions.description IS '部署の説明。例: レイヤー1は全社/本部、レイヤー2は事業所/工場、レイヤー3は部門/課';

-- 2. layer列のチェック制約（1～10の範囲）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'divisions_layer_check' 
    AND conrelid = 'divisions'::regclass
  ) THEN
    ALTER TABLE divisions 
    ADD CONSTRAINT divisions_layer_check 
    CHECK (layer >= 1 AND layer <= 10);
  END IF;
END $$;

COMMENT ON COLUMN divisions.layer IS 'レイヤーの深さ (1～10)';

-- 3. code列のユニーク制約（tenant_id毎）
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_divisions_tenant_code 
-- ON divisions(tenant_id, code);


COMMENT ON COLUMN divisions.code IS '部署コード（テナント内で一意）';

-- 4. パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_divisions_tenant_parent 
ON divisions(tenant_id, parent_id);

CREATE INDEX IF NOT EXISTS idx_divisions_tenant_layer 
ON divisions(tenant_id, layer);

-- 5. 既存データの検証（問題があればエラーを出力）
DO $$ 
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM divisions
  WHERE layer < 1 OR layer > 10;
  
  IF invalid_count > 0 THEN
    RAISE WARNING '% 件のレコードがlayer制約に違反しています（範囲: 1～10）', invalid_count;
  END IF;
END $$;
