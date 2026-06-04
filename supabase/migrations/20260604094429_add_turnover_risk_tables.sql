-- 離職リスクスコアスナップショット
-- 既存テーブルは一切変更しない。このファイルは新規テーブルの追加のみ。
CREATE TABLE public.turnover_risk_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  risk_score      INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level      TEXT NOT NULL CHECK (risk_level IN ('high', 'medium', 'low')),
  -- 因子別内訳（JSONB）
  -- { stress_score: 35, survey_score: 30, overtime_score: 20, absence_score: 15, details: {...} }
  score_factors   JSONB NOT NULL DEFAULT '{}',
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_scores
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_turnover_risk_tenant_emp
  ON public.turnover_risk_scores(tenant_id, employee_id, calculated_at DESC);

CREATE INDEX idx_turnover_risk_level
  ON public.turnover_risk_scores(tenant_id, risk_level, calculated_at DESC);

-- ハイリスク者へのアクションログ
CREATE TABLE public.turnover_risk_action_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  logged_by   UUID NOT NULL REFERENCES public.employees(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'one_on_one',     -- 1on1 実施
    'counseling',     -- カウンセリング
    'manager_talk',   -- 上長面談
    'hr_interview',   -- 人事面談
    'other'           -- その他
  )),
  notes       TEXT,
  actioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_action_logs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_turnover_action_employee
  ON public.turnover_risk_action_logs(tenant_id, employee_id, actioned_at DESC);
