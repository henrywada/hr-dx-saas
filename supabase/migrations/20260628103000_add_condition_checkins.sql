-- コンディション記録（日次1タップ気分・体調チェックイン）
-- PRD「Won't」（個人別生データを上長に閲覧させない）を厳格に守るため、
-- スタッフ向けの行レベルSELECTポリシーは意図的に追加しない。集計は
-- 20260628103100_add_condition_checkin_aggregate_fn.sql の SECURITY DEFINER 関数経由のみで提供する。

CREATE TABLE public.condition_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  memo TEXT,
  checkin_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, checkin_date)
);

CREATE INDEX idx_condition_checkins_employee_date ON public.condition_checkins (employee_id, checkin_date DESC);
CREATE INDEX idx_condition_checkins_tenant_date ON public.condition_checkins (tenant_id, checkin_date);

ALTER TABLE public.condition_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "condition_checkins_select_self" ON public.condition_checkins
  FOR SELECT USING (tenant_id = current_tenant_id() AND employee_id = current_employee_id());

CREATE POLICY "condition_checkins_insert_self" ON public.condition_checkins
  FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND employee_id = current_employee_id());

CREATE POLICY "condition_checkins_update_self" ON public.condition_checkins
  FOR UPDATE USING (tenant_id = current_tenant_id() AND employee_id = current_employee_id())
  WITH CHECK (tenant_id = current_tenant_id() AND employee_id = current_employee_id());
