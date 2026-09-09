-- =============================================================================
-- mYou 製品取扱説明書（画像）メタデータ + Storage バケット
-- ローカル / 本番は別 Supabase のため、ローカル検証画像は本番に出ない
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.myou_product_manuals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- aircon | bathroom
  manual_type   TEXT NOT NULL,
  -- 保存表示名（エアコン用取扱説明書 / 浴室用取扱説明書）
  label         TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  content_type  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  uploaded_by   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT myou_product_manuals_manual_type_check
    CHECK (manual_type IN ('aircon', 'bathroom'))
);

-- テナント内で種別ごとに1件（再アップロードは上書き）
CREATE UNIQUE INDEX IF NOT EXISTS myou_product_manuals_tenant_type_uidx
  ON public.myou_product_manuals (tenant_id, manual_type);

CREATE INDEX IF NOT EXISTS myou_product_manuals_tenant_id_idx
  ON public.myou_product_manuals (tenant_id);

COMMENT ON TABLE public.myou_product_manuals IS
  '製品ラベル QR 向け取扱説明書画像のメタデータ（実体は Storage）';
COMMENT ON COLUMN public.myou_product_manuals.manual_type IS
  'aircon=エアコン用 / bathroom=浴室用';
COMMENT ON COLUMN public.myou_product_manuals.label IS
  '保存名称（エアコン用取扱説明書 / 浴室用取扱説明書）';

ALTER TABLE public.myou_product_manuals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.myou_product_manuals;
CREATE POLICY "tenant_isolation" ON public.myou_product_manuals
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.set_myou_product_manuals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_myou_product_manuals_updated_at ON public.myou_product_manuals;
CREATE TRIGGER set_myou_product_manuals_updated_at
  BEFORE UPDATE ON public.myou_product_manuals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_myou_product_manuals_updated_at();

-- -----------------------------------------------------------------------------
-- Storage バケット（公開読み取り・画像のみ）
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'myou-product-manuals',
  'myou-product-manuals',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 認証ユーザー: 自テナント配下のみ書き込み可
DROP POLICY IF EXISTS "myou_product_manuals_storage_write" ON storage.objects;
CREATE POLICY "myou_product_manuals_storage_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'myou-product-manuals'
    AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  )
  WITH CHECK (
    bucket_id = 'myou-product-manuals'
    AND (storage.foldername(name))[1] = (public.current_tenant_id())::text
  );

-- 公開読み取り（購入客の QR 閲覧用）
DROP POLICY IF EXISTS "myou_product_manuals_storage_public_read" ON storage.objects;
CREATE POLICY "myou_product_manuals_storage_public_read" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'myou-product-manuals');
