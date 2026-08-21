-- お知らせの掲載期限（未設定なら無期限）
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.announcements.expires_at IS '掲載期限（NULL=無期限）';
