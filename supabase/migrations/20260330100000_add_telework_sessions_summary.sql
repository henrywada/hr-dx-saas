-- 作業終了時のメモ（telework-end で保存）
ALTER TABLE public.telework_sessions
  ADD COLUMN IF NOT EXISTS summary_text text;

COMMENT ON COLUMN public.telework_sessions.summary_text IS '作業終了時に入力した当日の作業内容メモ';
