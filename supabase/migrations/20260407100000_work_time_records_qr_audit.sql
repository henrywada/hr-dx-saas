-- QR 打刻の監査: どの監督者が発行したセッションで打刻したかを後追い可能にする
ALTER TABLE public.work_time_records
  ADD COLUMN IF NOT EXISTS qr_session_id uuid REFERENCES public.qr_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS punch_supervisor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.work_time_records.qr_session_id IS 'QR 打刻時の qr_sessions.id（発行監督者の追跡用）';
COMMENT ON COLUMN public.work_time_records.punch_supervisor_user_id IS 'QR 打刻時に QR を発行した監督者の auth.users.id（集計・表示用の冗長コピー）';

CREATE INDEX IF NOT EXISTS idx_work_time_records_qr_session
  ON public.work_time_records(qr_session_id)
  WHERE qr_session_id IS NOT NULL;
