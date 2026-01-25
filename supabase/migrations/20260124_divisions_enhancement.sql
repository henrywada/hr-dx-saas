-- 組織管理機能強化のためのマイグレーション
-- このファイルは任意（Optional）です。現在の構造でも十分機能しますが、
-- 将来的な拡張性を考慮した改善案です。

-- 1. display_order カラムの追加（同階層内での表示順序）
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
COMMENT ON COLUMN divisions.display_order IS '同階層内での表示順序';

-- 2. is_active カラムの追加（論理削除対応）
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
COMMENT ON COLUMN divisions.is_active IS '有効フラグ（論理削除用）';

-- 3. description カラムの追加（部署説明）
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS description TEXT;
COMMENT ON COLUMN divisions.description IS '部署の説明・役割';

-- 4. パフォーマンス向上のためのインデックス
CREATE INDEX IF NOT EXISTS idx_divisions_tenant_parent ON divisions(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_divisions_tenant_layer ON divisions(tenant_id, layer);
CREATE INDEX IF NOT EXISTS idx_divisions_active ON divisions(tenant_id, is_active) WHERE is_active = true;

-- 5. 制約の追加（データ整合性の向上）
-- レイヤーは1〜10の範囲
ALTER TABLE divisions ADD CONSTRAINT IF NOT EXISTS check_layer_range 
    CHECK (layer >= 1 AND layer <= 10);

-- コードのユニーク性（テナント内で一意）
CREATE UNIQUE INDEX IF NOT EXISTS idx_divisions_tenant_code 
    ON divisions(tenant_id, code) 
    WHERE code IS NOT NULL AND code != '';

COMMENT ON TABLE divisions IS '部署マスタ（階層構造）- レイヤー1:全社/本部, レイヤー2:事業所/工場, レイヤー3:部門/課';
