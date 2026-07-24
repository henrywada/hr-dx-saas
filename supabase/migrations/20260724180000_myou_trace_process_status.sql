-- トレーサビリティQR発行分の処理ステータス（有効期限アラート制御用）
ALTER TABLE public.myou_trace_labels
  ADD COLUMN IF NOT EXISTS process_status text NOT NULL DEFAULT 'unused';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'myou_trace_labels_process_status_check'
  ) THEN
    ALTER TABLE public.myou_trace_labels
      ADD CONSTRAINT myou_trace_labels_process_status_check
      CHECK (process_status IN ('unused', 'used', 'alert_ignored'));
  END IF;
END $$;

COMMENT ON COLUMN public.myou_trace_labels.process_status IS
  '処理ステータス: unused=未使用, used=使用済, alert_ignored=アラート無視';
