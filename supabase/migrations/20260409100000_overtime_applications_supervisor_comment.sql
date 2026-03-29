-- 上長の承認・却下・修正依頼時のコメントを保持（詳細モーダル表示用）
ALTER TABLE public.overtime_applications
  ADD COLUMN IF NOT EXISTS supervisor_comment text;

COMMENT ON COLUMN public.overtime_applications.supervisor_comment IS '承認者が入力したコメント（承認・却下・修正依頼）';
