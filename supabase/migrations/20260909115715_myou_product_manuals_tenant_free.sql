-- =============================================================================
-- 製品取扱説明書をテナントフリー化（公開 QR /p/myou/product-manuals 向け）
-- 環境（ローカル / 本番）ごとに種別1件。tenant_id は最終アップロード元の監査用
-- =============================================================================

-- 種別ごとに最新1件以外を削除（UNIQUE(manual_type) 導入前の重複解消）
DELETE FROM public.myou_product_manuals a
USING public.myou_product_manuals b
WHERE a.manual_type = b.manual_type
  AND (
    a.updated_at < b.updated_at
    OR (a.updated_at = b.updated_at AND a.id::text < b.id::text)
  );

DROP INDEX IF EXISTS public.myou_product_manuals_tenant_type_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS myou_product_manuals_manual_type_uidx
  ON public.myou_product_manuals (manual_type);

-- RLS: 公開読み取り + 認証ユーザーによる書き込み（テナント横断で種別1件を更新可）
DROP POLICY IF EXISTS "tenant_isolation" ON public.myou_product_manuals;

DROP POLICY IF EXISTS "myou_product_manuals_public_read" ON public.myou_product_manuals;
CREATE POLICY "myou_product_manuals_public_read" ON public.myou_product_manuals
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "myou_product_manuals_authenticated_write" ON public.myou_product_manuals;
CREATE POLICY "myou_product_manuals_authenticated_write" ON public.myou_product_manuals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage: テナントフォルダ必須をやめ、認証ユーザーがバケットへ書き込み可
DROP POLICY IF EXISTS "myou_product_manuals_storage_write" ON storage.objects;
CREATE POLICY "myou_product_manuals_storage_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'myou-product-manuals')
  WITH CHECK (bucket_id = 'myou-product-manuals');

COMMENT ON TABLE public.myou_product_manuals IS
  '製品ラベル QR 向け取扱説明書（環境ごとに種別1件・テナント非依存。tenant_id は監査用）';
