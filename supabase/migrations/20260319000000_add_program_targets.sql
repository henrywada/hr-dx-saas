-- =============================================================================
-- 対象者テーブル（program_targets）
-- ストレスチェック、パルスサーベイ、アンケート、eラーニング等の実施対象者を管理
-- 各プログラムの実施枠（期間・キャンペーン・コース）ごとに従業員の対象/除外を記録
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.program_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_type text NOT NULL,
  program_instance_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_eligible boolean NOT NULL DEFAULT true,
  exclusion_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_targets_program_type_check CHECK (
    program_type IN ('stress_check', 'pulse_survey', 'survey', 'e_learning')
  ),
  CONSTRAINT program_targets_unique_instance_employee UNIQUE (
    program_type,
    program_instance_id,
    employee_id
  )
);

COMMENT ON TABLE public.program_targets IS '実施対象者マスタ（ストレスチェック・パルスサーベイ・アンケート・eラーニング等で共通利用）';
COMMENT ON COLUMN public.program_targets.program_type IS 'プログラム種別: stress_check, pulse_survey, survey, e_learning';
COMMENT ON COLUMN public.program_targets.program_instance_id IS '実施枠ID（stress_check→stress_check_periods.id, pulse_survey→pulse_survey_periods.id 等）';
COMMENT ON COLUMN public.program_targets.is_eligible IS 'true=対象, false=除外';
COMMENT ON COLUMN public.program_targets.exclusion_reason IS '除外理由（任意、監査・説明用）';

CREATE INDEX idx_program_targets_tenant ON public.program_targets(tenant_id);
CREATE INDEX idx_program_targets_program ON public.program_targets(program_type, program_instance_id);
CREATE INDEX idx_program_targets_employee ON public.program_targets(employee_id);
CREATE INDEX idx_program_targets_eligible ON public.program_targets(program_type, program_instance_id, is_eligible)
  WHERE is_eligible = true;

ALTER TABLE public.program_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "program_targets_tenant_select"
  ON public.program_targets FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "program_targets_tenant_insert"
  ON public.program_targets FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "program_targets_tenant_update"
  ON public.program_targets FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "program_targets_tenant_delete"
  ON public.program_targets FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE TRIGGER set_program_targets_updated_at
  BEFORE UPDATE ON public.program_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
