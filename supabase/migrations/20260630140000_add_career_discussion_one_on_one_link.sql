-- CR-S3: キャリア面談と 1on1 セッションの明示的連携
ALTER TABLE public.career_discussions
  ADD COLUMN one_on_one_session_id UUID
    REFERENCES public.one_on_one_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_career_discussions_one_on_one_session
  ON public.career_discussions (one_on_one_session_id)
  WHERE one_on_one_session_id IS NOT NULL;
