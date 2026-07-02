-- 離職リスク高スコア検知の自動通知：送信結果の監査ログ兼冪等性チェック用テーブル
-- docs/implementation-plan-turnover-risk-alert.md 参照
CREATE TABLE public.turnover_risk_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
  employee_id           UUID NOT NULL REFERENCES public.employees(id),
  risk_score            INTEGER NOT NULL,
  previous_risk_level   TEXT NOT NULL,
  recipient_employee_id UUID REFERENCES public.employees(id),
  recipient_type        TEXT NOT NULL CHECK (recipient_type IN ('manager', 'hr_digest', 'no_manager_fallback')),
  channel               TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status                TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message         TEXT,
  notified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_alerts
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_turnover_alerts_employee ON public.turnover_risk_alerts(tenant_id, employee_id, notified_at DESC);
CREATE INDEX idx_turnover_alerts_tenant_date ON public.turnover_risk_alerts(tenant_id, notified_at DESC);
