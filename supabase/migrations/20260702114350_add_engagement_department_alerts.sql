-- 部署エンゲージメント alert 状態の自動通知：スナップショット履歴＋送信結果の監査ログ
-- docs/implementation-plan-engagement-alert.md 参照
CREATE TABLE public.engagement_department_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
  division_id       UUID NOT NULL REFERENCES public.divisions(id),
  composite_score   INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('good', 'caution', 'alert')),
  score_breakdown   JSONB NOT NULL DEFAULT '{}',
  calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.engagement_department_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.engagement_department_scores
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_engagement_scores_tenant_div ON public.engagement_department_scores(tenant_id, division_id, calculated_at DESC);

CREATE TABLE public.engagement_department_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
  division_id           UUID NOT NULL REFERENCES public.divisions(id),
  composite_score       INTEGER NOT NULL,
  previous_status       TEXT NOT NULL,
  recipient_employee_id UUID REFERENCES public.employees(id),
  recipient_type        TEXT NOT NULL CHECK (recipient_type IN ('manager', 'hr_digest', 'no_manager_fallback')),
  channel               TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status                TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message         TEXT,
  notified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.engagement_department_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.engagement_department_alerts
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_engagement_alerts_division ON public.engagement_department_alerts(tenant_id, division_id, notified_at DESC);
CREATE INDEX idx_engagement_alerts_tenant_date ON public.engagement_department_alerts(tenant_id, notified_at DESC);
