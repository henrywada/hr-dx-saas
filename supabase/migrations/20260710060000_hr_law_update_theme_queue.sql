-- =============================================================================
-- 人事アップデート改善: theme / expires_at / expired status / crawl queue
-- =============================================================================

-- テーマ・有効期限・失効ステータス
ALTER TABLE public.hr_law_documents
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS expires_at date;

ALTER TABLE public.hr_law_documents
  DROP CONSTRAINT IF EXISTS hr_law_documents_status_check;

ALTER TABLE public.hr_law_documents
  ADD CONSTRAINT hr_law_documents_status_check
  CHECK (status IN ('published', 'disabled', 'expired'));

CREATE INDEX IF NOT EXISTS hr_law_documents_theme_idx
  ON public.hr_law_documents(theme);

CREATE INDEX IF NOT EXISTS hr_law_documents_fetched_at_idx
  ON public.hr_law_documents(fetched_at DESC);

-- テナント一覧: published と expired を表示（disabled は除外）
DROP POLICY IF EXISTS "hr_law_documents_select" ON public.hr_law_documents;
CREATE POLICY "hr_law_documents_select" ON public.hr_law_documents
  FOR SELECT TO authenticated
  USING (status IN ('published', 'expired'));

-- クロールキュー（未処理 URL を次回へ持ち越し）
CREATE TABLE IF NOT EXISTS public.hr_law_crawl_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  topic          text NOT NULL,
  url            text NOT NULL,
  title          text,
  priority       int NOT NULL DEFAULT 100,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'done', 'skipped')),
  discovered_at  timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  error_message  text,
  UNIQUE (url)
);

CREATE INDEX IF NOT EXISTS hr_law_crawl_queue_status_idx
  ON public.hr_law_crawl_queue(status, priority DESC, discovered_at ASC);

ALTER TABLE public.hr_law_crawl_queue ENABLE ROW LEVEL SECURITY;
-- 書き込み・読み取りとも service_role のみ（ポリシー未定義 = authenticated 拒否）

-- 失効済み文書を一括更新するヘルパー（週次ジョブから呼び出し）
CREATE OR REPLACE FUNCTION public.expire_hr_law_documents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.hr_law_documents
  SET status = 'expired'
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Tokyo')::date;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_hr_law_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_hr_law_documents() TO service_role;

-- 既存トピックに theme 相当の初期値を documents へは付けない（収集時に付与）
COMMENT ON COLUMN public.hr_law_documents.theme IS '賃金 / 社会保険 / ストレスチェック / ハラスメント 等';
COMMENT ON COLUMN public.hr_law_documents.expires_at IS '施行終了・経過措置終了日（判別できた場合）';
