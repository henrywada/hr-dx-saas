-- =============================================================
-- mYou トレーサビリティ改善: データモデル修正
--
-- 仕様書（製品トレーサビリティと有効期限管理システム概要）との
-- 差分を解消するためのスキーマ変更。
--   1. 複数ホップ配送の許可（1シリアル1配送しか記録できない制約を撤廃）
--   2. 製品ステータスのライフサイクル統一
--      issued（ラベル発行済） → in_stock（入荷済・在庫） → delivered（出荷済）
--   3. 入荷日（仕入納入日）・ラベル発行日カラムの追加
--   4. 参照性能のためのインデックス追加
-- ※ 既存データは status の正規化（UPDATE）のみ。削除は行わない。
-- =============================================================

-- 1. 複数ホップ配送を可能にする
--    unique_product_delivery（serial_number 単独 UNIQUE）は流通履歴の
--    タイムライン表示（複数配送）と矛盾するため撤廃する
ALTER TABLE public.myou_delivery_logs
  DROP CONSTRAINT IF EXISTS unique_product_delivery;

CREATE INDEX IF NOT EXISTS idx_myou_delivery_logs_serial
  ON public.myou_delivery_logs (serial_number);

-- 2. status ライフサイクルの統一
--    既存値（'active' デフォルト / 'delivered' / その他）を正規化してから
--    CHECK 制約を付与する
UPDATE public.myou_products
SET status = 'delivered'
WHERE status NOT IN ('issued', 'in_stock', 'delivered');

ALTER TABLE public.myou_products
  ALTER COLUMN status SET DEFAULT 'issued';

ALTER TABLE public.myou_products
  DROP CONSTRAINT IF EXISTS myou_products_status_check;

ALTER TABLE public.myou_products
  ADD CONSTRAINT myou_products_status_check
  CHECK (status IN ('issued', 'in_stock', 'delivered'));

-- 3. 入荷日（仕入納入日）・ラベル発行日
ALTER TABLE public.myou_products
  ADD COLUMN IF NOT EXISTS received_at date;

ALTER TABLE public.myou_products
  ADD COLUMN IF NOT EXISTS issued_at timestamp with time zone;

COMMENT ON COLUMN public.myou_products.received_at IS '（株）ミューへの入荷日（仕入納入日）';
COMMENT ON COLUMN public.myou_products.issued_at IS 'QRラベル発行日時（システムで採番した場合のみ）';

-- 4. 有効期限監視・在庫一覧のためのインデックス
CREATE INDEX IF NOT EXISTS idx_myou_products_tenant_status_exp
  ON public.myou_products (tenant_id, status, expiration_date);
