-- ⚠️ このファイルを本番環境で実行する前に、必ずステージング環境で検証してください。
-- 既存データは削除しません。CREATE TABLE IF NOT EXISTS のみ使用しています。

-- =============================================================================
-- 1. monthly_employee_overtime（月次社員別集計結果）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_employee_overtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  closure_id uuid REFERENCES public.monthly_overtime_closures(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  year_month date NOT NULL,
  total_work_hours numeric(7,2) DEFAULT 0,
  total_overtime_hours numeric(7,2) DEFAULT 0,
  approved_overtime_hours numeric(7,2),
  corrections_summary jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_employee_overtime_tenant_id
  ON public.monthly_employee_overtime(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_employee_overtime_closure_id
  ON public.monthly_employee_overtime(closure_id);
CREATE INDEX IF NOT EXISTS idx_monthly_employee_overtime_employee_id
  ON public.monthly_employee_overtime(employee_id);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.monthly_employee_overtime
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.monthly_employee_overtime ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "monthly_employee_overtime_tenant_select" ON public.monthly_employee_overtime
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "monthly_employee_overtime_tenant_insert" ON public.monthly_employee_overtime
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "monthly_employee_overtime_tenant_update" ON public.monthly_employee_overtime
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. timecard_corrections（打刻修正履歴）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.timecard_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  work_date date NOT NULL,
  original_clock_in timestamptz,
  original_clock_out timestamptz,
  corrected_clock_in timestamptz,
  corrected_clock_out timestamptz,
  reason text,
  corrected_by uuid NOT NULL,
  correction_source text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timecard_corrections_tenant_id
  ON public.timecard_corrections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timecard_corrections_employee_id
  ON public.timecard_corrections(employee_id);

ALTER TABLE public.timecard_corrections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "timecard_corrections_tenant_select" ON public.timecard_corrections
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "timecard_corrections_tenant_insert" ON public.timecard_corrections
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "timecard_corrections_tenant_update" ON public.timecard_corrections
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 3. closure_warnings（締め警告）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.closure_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  closure_id uuid REFERENCES public.monthly_overtime_closures(id) ON DELETE CASCADE,
  employee_id uuid,
  warning_type text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_closure_warnings_tenant_id
  ON public.closure_warnings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_closure_warnings_closure_id
  ON public.closure_warnings(closure_id);
CREATE INDEX IF NOT EXISTS idx_closure_warnings_employee_id
  ON public.closure_warnings(employee_id);

ALTER TABLE public.closure_warnings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "closure_warnings_tenant_select" ON public.closure_warnings
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "closure_warnings_tenant_insert" ON public.closure_warnings
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "closure_warnings_tenant_update" ON public.closure_warnings
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 4. closure_audit_logs（監査ログ・DELETE ポリシーは付与しない）
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.closure_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  closure_id uuid,
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target jsonb,
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_closure_audit_logs_tenant_id
  ON public.closure_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_closure_audit_logs_closure_id
  ON public.closure_audit_logs(closure_id);

ALTER TABLE public.closure_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "closure_audit_logs_tenant_select" ON public.closure_audit_logs
    FOR SELECT TO authenticated
    USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "closure_audit_logs_tenant_insert" ON public.closure_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "closure_audit_logs_tenant_update" ON public.closure_audit_logs
    FOR UPDATE TO authenticated
    USING (tenant_id = public.current_tenant_id())
    WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ✅ 確認クエリ:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public'
-- AND tablename IN (
-- 'monthly_employee_overtime','timecard_corrections',
-- 'closure_warnings','closure_audit_logs'
-- );
