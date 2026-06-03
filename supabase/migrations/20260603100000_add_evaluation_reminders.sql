-- 評価リマインダー履歴テーブル
-- リマインダーは「アプリ内通知ログ」として記録する（外部メール送信は行わない）
CREATE TABLE public.evaluation_reminders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  period_id   UUID NOT NULL REFERENCES public.evaluation_periods(id) ON DELETE CASCADE,
  sheet_id    UUID NOT NULL REFERENCES public.evaluation_sheets(id) ON DELETE CASCADE,
  sent_by     UUID NOT NULL REFERENCES public.employees(id),
  -- リマインダーの種別
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN (
      'deadline_approaching', -- 期限N日前
      'overdue',              -- 期限超過
      'bulk_nudge',           -- 人事による一括催促
      'rollback_notify'       -- 差し戻し通知
    )),
  -- 催促時のメッセージ（任意）
  message     TEXT,
  -- 催促対象のフロー状態（どのフェーズへの催促か）
  target_status TEXT,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.evaluation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.evaluation_reminders
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_eval_reminders_period_id ON public.evaluation_reminders(period_id);
CREATE INDEX idx_eval_reminders_sheet_id  ON public.evaluation_reminders(sheet_id);
