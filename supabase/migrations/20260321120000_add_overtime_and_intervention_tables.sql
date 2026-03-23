-- 勤怠・残業集計・アラート・健康評価連携・介入記録（マルチテナント + RLS）
-- 既存データを壊さないため CREATE TABLE IF NOT EXISTS のみ（DROP/TRUNCATE なし）

-- =============================================================================
-- 1. work_time_records（勤怠原始データ）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.work_time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  record_date date NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL,
  is_holiday boolean DEFAULT false,
  source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_time_records_tenant ON public.work_time_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_time_records_employee ON public.work_time_records(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_work_time_records_date ON public.work_time_records(tenant_id, record_date);

COMMENT ON TABLE public.work_time_records IS '勤怠の原始レコード（テナント単位）';

ALTER TABLE public.work_time_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_time_records_tenant_select"
  ON public.work_time_records FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "work_time_records_tenant_insert"
  ON public.work_time_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "work_time_records_tenant_update"
  ON public.work_time_records FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "work_time_records_tenant_delete"
  ON public.work_time_records FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 2. overtime_monthly_stats（月次集計）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.overtime_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  overtime_minutes integer NOT NULL,
  holiday_minutes integer NOT NULL,
  total_minutes integer NOT NULL,
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overtime_monthly_stats_tenant ON public.overtime_monthly_stats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_monthly_stats_employee ON public.overtime_monthly_stats(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_monthly_stats_period ON public.overtime_monthly_stats(tenant_id, period_month);

COMMENT ON TABLE public.overtime_monthly_stats IS '残業等の月次集計（テナント単位）';

ALTER TABLE public.overtime_monthly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_monthly_stats_tenant_select"
  ON public.overtime_monthly_stats FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_monthly_stats_tenant_insert"
  ON public.overtime_monthly_stats FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_monthly_stats_tenant_update"
  ON public.overtime_monthly_stats FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_monthly_stats_tenant_delete"
  ON public.overtime_monthly_stats FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 3. overtime_alerts（アラート）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.overtime_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  alert_value jsonb,
  triggered_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_overtime_alerts_tenant ON public.overtime_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_alerts_employee ON public.overtime_alerts(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_alerts_unresolved ON public.overtime_alerts(tenant_id) WHERE resolved_at IS NULL;

COMMENT ON TABLE public.overtime_alerts IS '残業関連アラート（テナント単位）';

ALTER TABLE public.overtime_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_alerts_tenant_select"
  ON public.overtime_alerts FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_alerts_tenant_insert"
  ON public.overtime_alerts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_alerts_tenant_update"
  ON public.overtime_alerts FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_alerts_tenant_delete"
  ON public.overtime_alerts FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 4. health_assessments_link（ストレスチェック等との連携）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.health_assessments_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assessment_type text NOT NULL,
  assessment_id uuid NOT NULL,
  score numeric,
  taken_at date
);

CREATE INDEX IF NOT EXISTS idx_health_assessments_link_tenant ON public.health_assessments_link(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_assessments_link_employee ON public.health_assessments_link(tenant_id, employee_id);

COMMENT ON TABLE public.health_assessments_link IS '健康評価（ストレスチェック等）との外部連携用リンク（テナント単位）';

ALTER TABLE public.health_assessments_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_assessments_link_tenant_select"
  ON public.health_assessments_link FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_assessments_link_tenant_insert"
  ON public.health_assessments_link FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "health_assessments_link_tenant_update"
  ON public.health_assessments_link FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "health_assessments_link_tenant_delete"
  ON public.health_assessments_link FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 5. interventions（産業医面談等の介入記録）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  intervention_type text NOT NULL,
  reason text,
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  extra jsonb
);

CREATE INDEX IF NOT EXISTS idx_interventions_tenant ON public.interventions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interventions_employee ON public.interventions(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON public.interventions(tenant_id, status);

COMMENT ON TABLE public.interventions IS '産業医面談等の介入記録（テナント単位）';

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interventions_tenant_select"
  ON public.interventions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "interventions_tenant_insert"
  ON public.interventions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "interventions_tenant_update"
  ON public.interventions FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "interventions_tenant_delete"
  ON public.interventions FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());
