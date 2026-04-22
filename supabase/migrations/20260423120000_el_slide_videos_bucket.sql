-- =============================================================================
-- eラーニング ミニ講座スライド用動画 Storage バケット
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'el-slide-videos',
  'el-slide-videos',
  true,
  52428800,
  ARRAY['video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "el_slide_videos_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'el-slide-videos'
    AND (
      (auth.jwt() ->> 'app_role') = 'developer'
      OR (
        (auth.jwt() ->> 'app_role') = 'hr'
        AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
      )
    )
  )
  WITH CHECK (
    bucket_id = 'el-slide-videos'
    AND (
      (auth.jwt() ->> 'app_role') = 'developer'
      OR (
        (auth.jwt() ->> 'app_role') = 'hr'
        AND (storage.foldername(name))[1] = (auth.jwt() ->> 'tenant_id')
      )
    )
  );

CREATE POLICY "el_slide_videos_read" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'el-slide-videos');
