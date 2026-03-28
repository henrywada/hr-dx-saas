-- 残業申請・修正履歴・月次締め・36協定等分析（マルチテナント + RLS）
-- 既存データを壊さないため CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS のみ（DROP/TRUNCATE なし）

-- =============================================================================
-- 1. overtime_applications（残業申請）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.overtime_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  overtime_start timestamptz NOT NULL,
  overtime_end timestamptz NOT NULL,
  requested_hours numeric(5, 2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT '申請中'
    CHECK (status IN ('申請中', '承認済', '却下', '修正依頼')),
  supervisor_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT overtime_applications_time_order CHECK (overtime_end > overtime_start)
);

CREATE INDEX IF NOT EXISTS idx_overtime_applications_tenant
  ON public.overtime_applications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_overtime_applications_tenant_employee
  ON public.overtime_applications (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_applications_tenant_work_date
  ON public.overtime_applications (tenant_id, work_date);
CREATE INDEX IF NOT EXISTS idx_overtime_applications_tenant_status
  ON public.overtime_applications (tenant_id, status);

COMMENT ON TABLE public.overtime_applications IS '残業申請（テナント単位）';

DROP TRIGGER IF EXISTS set_overtime_applications_updated_at ON public.overtime_applications;
CREATE TRIGGER set_overtime_applications_updated_at
  BEFORE UPDATE ON public.overtime_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.overtime_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_applications_tenant_select"
  ON public.overtime_applications FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_applications_tenant_insert"
  ON public.overtime_applications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_applications_tenant_update"
  ON public.overtime_applications FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_applications_tenant_delete"
  ON public.overtime_applications FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 2. overtime_corrections（残業修正履歴・親は overtime_applications）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.overtime_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.overtime_applications(id) ON DELETE CASCADE,
  corrected_hours numeric(5, 2) NOT NULL,
  correction_reason text,
  corrected_by uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  corrected_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overtime_corrections_application
  ON public.overtime_corrections (application_id);

COMMENT ON TABLE public.overtime_corrections IS '残業申請の修正履歴（テナントは親申請に従う）';

ALTER TABLE public.overtime_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_corrections_tenant_select"
  ON public.overtime_corrections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.overtime_applications o
      WHERE o.id = overtime_corrections.application_id
        AND o.tenant_id = public.current_tenant_id()
    )
  );

CREATE POLICY "overtime_corrections_tenant_insert"
  ON public.overtime_corrections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.overtime_applications o
      WHERE o.id = overtime_corrections.application_id
        AND o.tenant_id = public.current_tenant_id()
    )
  );

CREATE POLICY "overtime_corrections_tenant_update"
  ON public.overtime_corrections FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.overtime_applications o
      WHERE o.id = overtime_corrections.application_id
        AND o.tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.overtime_applications o
      WHERE o.id = overtime_corrections.application_id
        AND o.tenant_id = public.current_tenant_id()
    )
  );

CREATE POLICY "overtime_corrections_tenant_delete"
  ON public.overtime_corrections FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.overtime_applications o
      WHERE o.id = overtime_corrections.application_id
        AND o.tenant_id = public.current_tenant_id()
    )
  );

-- =============================================================================
-- 3. monthly_overtime_closures（月次締め）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_overtime_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year_month date NOT NULL,
  closed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_overtime_closures_tenant
  ON public.monthly_overtime_closures (tenant_id);

COMMENT ON TABLE public.monthly_overtime_closures IS '残業関連の月次締め（テナント単位・月1行）';
COMMENT ON COLUMN public.monthly_overtime_closures.year_month IS '対象月（その月の1日を格納）';

DROP TRIGGER IF EXISTS set_monthly_overtime_closures_updated_at ON public.monthly_overtime_closures;
CREATE TRIGGER set_monthly_overtime_closures_updated_at
  BEFORE UPDATE ON public.monthly_overtime_closures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.monthly_overtime_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_overtime_closures_tenant_select"
  ON public.monthly_overtime_closures FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "monthly_overtime_closures_tenant_insert"
  ON public.monthly_overtime_closures FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "monthly_overtime_closures_tenant_update"
  ON public.monthly_overtime_closures FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "monthly_overtime_closures_tenant_delete"
  ON public.monthly_overtime_closures FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- =============================================================================
-- 4. overtime_analysis_results（36協定等との比較・分析結果）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.overtime_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year_month date NOT NULL,
  total_overtime_hours numeric(7, 2) NOT NULL,
  legal_limit_hours numeric(7, 2) NOT NULL,
  is_exceeded boolean NOT NULL,
  analysis_details jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_overtime_analysis_results_tenant
  ON public.overtime_analysis_results (tenant_id);

COMMENT ON TABLE public.overtime_analysis_results IS '36協定等との比較・分析結果（テナント単位・月1行）';

DROP TRIGGER IF EXISTS set_overtime_analysis_results_updated_at ON public.overtime_analysis_results;
CREATE TRIGGER set_overtime_analysis_results_updated_at
  BEFORE UPDATE ON public.overtime_analysis_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.overtime_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "overtime_analysis_results_tenant_select"
  ON public.overtime_analysis_results FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_analysis_results_tenant_insert"
  ON public.overtime_analysis_results FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_analysis_results_tenant_update"
  ON public.overtime_analysis_results FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "overtime_analysis_results_tenant_delete"
  ON public.overtime_analysis_results FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());
