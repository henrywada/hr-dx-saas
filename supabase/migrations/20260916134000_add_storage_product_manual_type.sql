-- =============================================================================
-- 取扱説明書種別に「物置・収納スペース用」を追加する
-- 既存行は削除しない。許可値の追加のみ。
-- =============================================================================

ALTER TABLE public.myou_product_manuals
  DROP CONSTRAINT IF EXISTS myou_product_manuals_manual_type_check;

ALTER TABLE public.myou_product_manuals
  ADD CONSTRAINT myou_product_manuals_manual_type_check
  CHECK (manual_type IN ('aircon', 'bathroom', 'storage'));

COMMENT ON COLUMN public.myou_product_manuals.manual_type IS
  'aircon=エアコン用 / bathroom=浴室用 / storage=物置・収納スペース用';
