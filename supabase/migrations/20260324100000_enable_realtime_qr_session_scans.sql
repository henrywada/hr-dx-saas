-- Realtime: qr_session_scans の変更をクライアントで購読可能にする（既存 publication へ追加のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'qr_session_scans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_session_scans;
  END IF;
END $$;
