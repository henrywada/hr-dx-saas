-- 監視トピック閉ループ + 文書鮮度列
-- Spec: docs/superpowers/specs/2026-07-10-hr-law-topic-closed-loop-design.md

-- ---------------------------------------------------------------------------
-- hr_law_sources 拡張（論理削除・出自）
-- ---------------------------------------------------------------------------
ALTER TABLE public.hr_law_sources
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'seed';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hr_law_sources_origin_check'
  ) THEN
    ALTER TABLE public.hr_law_sources
      ADD CONSTRAINT hr_law_sources_origin_check
      CHECK (origin IN ('seed', 'manual', 'proposal'));
  END IF;
END $$;

COMMENT ON COLUMN public.hr_law_sources.origin IS 'seed / manual / proposal';
COMMENT ON COLUMN public.hr_law_sources.disabled_at IS '論理削除時刻（enabled=false 時）';

-- ---------------------------------------------------------------------------
-- hr_law_documents 鮮度列
-- ---------------------------------------------------------------------------
ALTER TABLE public.hr_law_documents
  ADD COLUMN IF NOT EXISTS http_etag text,
  ADD COLUMN IF NOT EXISTS http_last_modified text,
  ADD COLUMN IF NOT EXISTS content_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS hr_law_documents_content_checked_at_idx
  ON public.hr_law_documents (content_checked_at ASC NULLS FIRST)
  WHERE status = 'published';

COMMENT ON COLUMN public.hr_law_documents.http_etag IS '前回 HTTP ETag';
COMMENT ON COLUMN public.hr_law_documents.http_last_modified IS '前回 HTTP Last-Modified 生値';
COMMENT ON COLUMN public.hr_law_documents.content_checked_at IS '最後に鮮度チェックした時刻';

-- ---------------------------------------------------------------------------
-- hr_law_refresh_logs 拡張
-- ---------------------------------------------------------------------------
ALTER TABLE public.hr_law_refresh_logs
  ADD COLUMN IF NOT EXISTS freshness_checked int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_updated int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proposals_created int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 監視トピック候補（承認ゲート）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hr_law_topic_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  topic_key text NOT NULL,
  search_query text NOT NULL,
  source text NOT NULL
    CHECK (source IN ('chat', 'mhlw_discover')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_source_id uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hr_law_topic_proposals_pending_key_uidx
  ON public.hr_law_topic_proposals (topic_key)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS hr_law_topic_proposals_status_score_idx
  ON public.hr_law_topic_proposals (status, score DESC);

ALTER TABLE public.hr_law_topic_proposals ENABLE ROW LEVEL SECURITY;
-- 読み書きは service_role / createAdminClient（hr_law_refresh_logs と同パターン）

COMMENT ON TABLE public.hr_law_topic_proposals IS
  '監視トピック候補。チャット需要・厚労省新着から提案し、SaaS管理者が承認して hr_law_sources へ反映する';
