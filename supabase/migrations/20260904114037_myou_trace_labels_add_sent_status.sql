-- 処理ステータスに「送信済」(sent) を追加する
-- アラート送信成功後、対象のトレーサビリティQR発行分を unused → sent に自動更新し、
-- 「期限間近の製品」一覧（unused のみ表示）から除外するために使用する
ALTER TABLE public.myou_trace_labels
  DROP CONSTRAINT IF EXISTS myou_trace_labels_process_status_check;

ALTER TABLE public.myou_trace_labels
  ADD CONSTRAINT myou_trace_labels_process_status_check
  CHECK (process_status IN ('unused', 'used', 'alert_ignored', 'sent'));

COMMENT ON COLUMN public.myou_trace_labels.process_status IS
  '処理ステータス: unused=未使用, used=使用済, alert_ignored=アラート無視, sent=送信済（アラート送信成功後に自動設定）';
