-- ログに保存した詳細説明の文字数合計
ALTER TABLE public.hr_law_refresh_logs
  ADD COLUMN IF NOT EXISTS detail_chars integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.hr_law_refresh_logs.detail_chars IS
  'この実行で新規登録した文書の detail（詳細説明）文字数の合計';
