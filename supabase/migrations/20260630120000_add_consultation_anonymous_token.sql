-- 匿名相談のステータス確認用トークン（D-S2）
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS anonymous_token UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consultations_anonymous_token
  ON public.consultations (anonymous_token)
  WHERE anonymous_token IS NOT NULL;

COMMENT ON COLUMN public.consultations.anonymous_token IS
  '匿名相談時のみ発行。/p/consultation/status?token= で本人がログインなしで進捗確認可能';
