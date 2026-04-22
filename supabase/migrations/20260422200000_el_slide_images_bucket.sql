-- =============================================================================
-- eラーニング スライド画像用 Supabase Storage バケット
-- =============================================================================

-- バケット作成（公開読み取り可・5MB上限・画像のみ許可）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'el-slide-images',
  'el-slide-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- developer / hr はアップロード・更新・削除が可能
CREATE POLICY "el_slide_images_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'el-slide-images'
    AND (
      (auth.jwt() ->> 'app_role') = 'developer'
      OR (
        (auth.jwt() ->> 'app_role') = 'hr'
        AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'el-slide-images'
    AND (
      (auth.jwt() ->> 'app_role') = 'developer'
      OR (
        (auth.jwt() ->> 'app_role') = 'hr'
        AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
      )
    )
  );

-- 全認証ユーザーが画像を参照できる（受講者向け）
CREATE POLICY "el_slide_images_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'el-slide-images');
