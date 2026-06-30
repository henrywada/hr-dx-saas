-- エンタープライズ拡張フェーズ2: 1on1 AI要約

ALTER TABLE public.one_on_one_sessions
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;
