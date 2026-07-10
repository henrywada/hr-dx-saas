-- 人事アップデート収集の実施ログ
CREATE TABLE IF NOT EXISTS public.hr_law_refresh_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  trigger_type        text NOT NULL DEFAULT 'cron'
                      CHECK (trigger_type IN ('cron', 'manual')),
  source_id           uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  source_topic        text,
  sources_processed   int NOT NULL DEFAULT 0,
  queued              int NOT NULL DEFAULT 0,
  documents_created   int NOT NULL DEFAULT 0,
  documents_skipped   int NOT NULL DEFAULT 0,
  success             boolean NOT NULL DEFAULT true,
  error_message       text,
  errors              jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hr_law_refresh_logs_started_at_idx
  ON public.hr_law_refresh_logs(started_at DESC);

ALTER TABLE public.hr_law_refresh_logs ENABLE ROW LEVEL SECURITY;
-- 書き込み・読み取りは service_role（SaaS 管理画面は createAdminClient）

COMMENT ON TABLE public.hr_law_refresh_logs IS 'hr-law-refresh Edge Function の実施ログ（日時降順で表示）';
