-- アラート送信履歴に、送信対象の処理ステータス（スナップショット）を記録する
ALTER TABLE public.myou_alert_logs
  ADD COLUMN IF NOT EXISTS process_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'myou_alert_logs_process_status_check'
  ) THEN
    ALTER TABLE public.myou_alert_logs
      ADD CONSTRAINT myou_alert_logs_process_status_check
      CHECK (
        process_status IS NULL
        OR process_status IN ('unused', 'used', 'alert_ignored')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.myou_alert_logs.process_status IS
  '送信時点の処理ステータス（未使用のみ送信するため通常は unused。過去ログは NULL 可）';
