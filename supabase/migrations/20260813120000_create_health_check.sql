-- 定期健康診断（実施回・機関標準化・結果EAV・就業判定）
-- 標準 = テナントが選んだメイン検診機関。添付 CSV はプリセット一例（全テナントへ自動シードしない）

-- =============================================================================
-- ロール判定ヘルパー
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_health_check_hr()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer', 'test']);
$$;

CREATE OR REPLACE FUNCTION public.is_health_check_medical()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']);
$$;

COMMENT ON FUNCTION public.is_health_check_hr() IS '健康診断の人事ロール（hr / hr_manager / developer / test）';
COMMENT ON FUNCTION public.is_health_check_medical() IS '健康診断の産業医・保健師ロール';

-- =============================================================================
-- program_targets に health_check を追加
-- =============================================================================
ALTER TABLE public.program_targets
  DROP CONSTRAINT IF EXISTS program_targets_program_type_check;

ALTER TABLE public.program_targets
  ADD CONSTRAINT program_targets_program_type_check
  CHECK (program_type IN ('stress_check', 'pulse_survey', 'survey', 'e_learning', 'health_check'));

COMMENT ON COLUMN public.program_targets.program_type IS
  'プログラム種別: stress_check, pulse_survey, survey, e_learning, health_check';

-- =============================================================================
-- システムプリセット（テナント横断・書き込みはマイグレーションのみ）
-- =============================================================================
CREATE TABLE public.health_check_csv_format_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_check_csv_format_presets IS
  '健診CSVフォーマットプリセット（システム）。テナントの機関へ「適用」したときだけコピーされる';

ALTER TABLE public.health_check_csv_format_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_csv_format_presets_select"
  ON public.health_check_csv_format_presets
  FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- 実施回
-- =============================================================================
CREATE TABLE public.health_check_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  round SMALLINT NOT NULL CHECK (round IN (1, 2)),
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_campaigns_tenant_year_round UNIQUE (tenant_id, fiscal_year, round)
);

COMMENT ON TABLE public.health_check_campaigns IS '定期健康診断の実施回（会計年度ラベル + 年1〜2回）';
COMMENT ON COLUMN public.health_check_campaigns.fiscal_year IS '表示用年度ラベル（テナント会計年度開始月は未実装）';
COMMENT ON COLUMN public.health_check_campaigns.round IS '同一年度内の実施回 1 または 2';

CREATE INDEX idx_health_check_campaigns_tenant ON public.health_check_campaigns (tenant_id);

ALTER TABLE public.health_check_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_campaigns_select"
  ON public.health_check_campaigns FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_campaigns_hr_write"
  ON public.health_check_campaigns FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_campaigns_updated_at
  BEFORE UPDATE ON public.health_check_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 検査項目マスタ（システム語彙 + テナント追加）
-- =============================================================================
CREATE TABLE public.health_check_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  item_kind TEXT NOT NULL DEFAULT 'value'
    CHECK (item_kind IN ('value', 'category_judgment', 'finding', 'questionnaire')),
  standard_unit TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_statutory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_check_items IS '健診項目。tenant_id NULL はシステム共通語彙、非NULLはテナント追加';
COMMENT ON COLUMN public.health_check_items.item_kind IS 'value / category_judgment / finding / questionnaire';

CREATE UNIQUE INDEX health_check_items_system_code
  ON public.health_check_items (code) WHERE tenant_id IS NULL;
CREATE UNIQUE INDEX health_check_items_tenant_code
  ON public.health_check_items (tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE INDEX idx_health_check_items_tenant ON public.health_check_items (tenant_id);

ALTER TABLE public.health_check_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_items_select"
  ON public.health_check_items FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_items_hr_write"
  ON public.health_check_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_items_updated_at
  BEFORE UPDATE ON public.health_check_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- テナント標準判定コード（メイン機関のコード。グローバル標準ではない）
-- =============================================================================
CREATE TABLE public.health_check_judgment_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT,
  severity_rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_judgment_codes_tenant_code UNIQUE (tenant_id, code)
);

COMMENT ON TABLE public.health_check_judgment_codes IS 'テナントの標準判定コード（メイン検診機関のもの）';
COMMENT ON COLUMN public.health_check_judgment_codes.severity_rank IS '集計並び。プリセット適用時のみ A < B < C を仮置き';

CREATE INDEX idx_health_check_judgment_codes_tenant ON public.health_check_judgment_codes (tenant_id);

ALTER TABLE public.health_check_judgment_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_judgment_codes_select"
  ON public.health_check_judgment_codes FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_judgment_codes_hr_write"
  ON public.health_check_judgment_codes FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_judgment_codes_updated_at
  BEFORE UPDATE ON public.health_check_judgment_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 健診機関
-- =============================================================================
CREATE TABLE public.health_check_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_standard BOOLEAN NOT NULL DEFAULT false,
  preset_code TEXT REFERENCES public.health_check_csv_format_presets(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_check_institutions IS 'テナントの健診機関。is_standard がそのテナントの標準（メイン機関）';
COMMENT ON COLUMN public.health_check_institutions.is_standard IS 'テナント内で標準とするメイン機関。部分ユニークで1件';

CREATE UNIQUE INDEX health_check_institutions_one_standard
  ON public.health_check_institutions (tenant_id) WHERE is_standard;

CREATE INDEX idx_health_check_institutions_tenant ON public.health_check_institutions (tenant_id);

ALTER TABLE public.health_check_institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_institutions_select"
  ON public.health_check_institutions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_institutions_hr_write"
  ON public.health_check_institutions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_institutions_updated_at
  BEFORE UPDATE ON public.health_check_institutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 標準フラグを true にした機関以外を自動で外す
CREATE OR REPLACE FUNCTION public.health_check_institutions_ensure_one_standard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_standard IS TRUE THEN
    UPDATE public.health_check_institutions
    SET is_standard = false
    WHERE tenant_id = NEW.tenant_id
      AND id <> NEW.id
      AND is_standard IS TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER health_check_institutions_one_standard_trg
  BEFORE INSERT OR UPDATE OF is_standard ON public.health_check_institutions
  FOR EACH ROW
  WHEN (NEW.is_standard IS TRUE)
  EXECUTE FUNCTION public.health_check_institutions_ensure_one_standard();

-- =============================================================================
-- CSV 列マップ
-- =============================================================================
CREATE TABLE public.health_check_csv_column_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.health_check_institutions(id) ON DELETE CASCADE,
  file_kind TEXT NOT NULL CHECK (file_kind IN ('main', 'additional', 'questionnaire')),
  header_name TEXT NOT NULL,
  item_id UUID REFERENCES public.health_check_items(id) ON DELETE SET NULL,
  column_role TEXT NOT NULL DEFAULT 'value'
    CHECK (column_role IN ('value', 'judgment', 'skip', 'identity', 'overall_judgment', 'primary_secondary')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_csv_column_maps_unique UNIQUE (institution_id, file_kind, header_name)
);

COMMENT ON TABLE public.health_check_csv_column_maps IS '機関 × ファイル種別 × ヘッダ名 → 項目 / 役割';

CREATE INDEX idx_health_check_csv_column_maps_institution
  ON public.health_check_csv_column_maps (institution_id);

ALTER TABLE public.health_check_csv_column_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_csv_column_maps_select"
  ON public.health_check_csv_column_maps FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_csv_column_maps_hr_write"
  ON public.health_check_csv_column_maps FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_csv_column_maps_updated_at
  BEFORE UPDATE ON public.health_check_csv_column_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 他機関判定コード → テナント標準コード
-- =============================================================================
CREATE TABLE public.health_check_judgment_code_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.health_check_institutions(id) ON DELETE CASCADE,
  raw_code TEXT NOT NULL,
  standard_judgment_id UUID NOT NULL REFERENCES public.health_check_judgment_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_judgment_code_maps_unique UNIQUE (institution_id, raw_code)
);

COMMENT ON TABLE public.health_check_judgment_code_maps IS
  '同じテナントの他機関の生コード → そのテナントの標準コード。標準機関自身は不要';

ALTER TABLE public.health_check_judgment_code_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_judgment_code_maps_select"
  ON public.health_check_judgment_code_maps FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_judgment_code_maps_hr_write"
  ON public.health_check_judgment_code_maps FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_judgment_code_maps_updated_at
  BEFORE UPDATE ON public.health_check_judgment_code_maps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 標準機関カットオフ（他機関の数値再判定用。標準機関取込では使わない）
-- =============================================================================
CREATE TABLE public.health_check_item_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.health_check_items(id) ON DELETE CASCADE,
  sex TEXT CHECK (sex IS NULL OR sex IN ('male', 'female')),
  min_value NUMERIC,
  max_value NUMERIC,
  judgment_id UUID REFERENCES public.health_check_judgment_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_check_item_thresholds IS 'テナント標準機関のカットオフ。他機関数値の再判定に任意利用';

CREATE INDEX idx_health_check_item_thresholds_tenant ON public.health_check_item_thresholds (tenant_id);

ALTER TABLE public.health_check_item_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_item_thresholds_select"
  ON public.health_check_item_thresholds FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_item_thresholds_hr_write"
  ON public.health_check_item_thresholds FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_item_thresholds_updated_at
  BEFORE UPDATE ON public.health_check_item_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 単位変換（他機関 → 標準機関）
-- =============================================================================
CREATE TABLE public.health_check_unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.health_check_items(id) ON DELETE CASCADE,
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_unit_conversions_unique UNIQUE (tenant_id, item_id, from_unit, to_unit)
);

COMMENT ON TABLE public.health_check_unit_conversions IS '他機関単位 → そのテナントの標準機関単位';

ALTER TABLE public.health_check_unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_unit_conversions_select"
  ON public.health_check_unit_conversions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "health_check_unit_conversions_hr_write"
  ON public.health_check_unit_conversions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_unit_conversions_updated_at
  BEFORE UPDATE ON public.health_check_unit_conversions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- 結果ヘッダ（検査値列なし。人事 SELECT 可）
-- =============================================================================
CREATE TABLE public.health_check_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.health_check_campaigns(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.health_check_institutions(id) ON DELETE SET NULL,
  exam_date DATE NOT NULL,
  primary_secondary TEXT,
  institution_overall_judgment_raw TEXT,
  standard_overall_judgment_id UUID REFERENCES public.health_check_judgment_codes(id) ON DELETE SET NULL,
  input_source TEXT NOT NULL DEFAULT 'csv' CHECK (input_source IN ('csv', 'manual')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received')),
  employment_judgment TEXT NOT NULL DEFAULT 'pending'
    CHECK (employment_judgment IN ('fit', 'restricted', 'leave', 'pending')),
  employment_judged_at TIMESTAMPTZ,
  employment_judged_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  nurse_interview_recommended BOOLEAN NOT NULL DEFAULT false,
  doctor_interview_recommended BOOLEAN NOT NULL DEFAULT false,
  nurse_interview_recommended_at TIMESTAMPTZ,
  doctor_interview_recommended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_records_campaign_employee UNIQUE (campaign_id, employee_id)
);

COMMENT ON TABLE public.health_check_records IS
  '健診結果ヘッダ。検査値は持たない。人事は受診・就業判定・面談推奨のみ参照';
COMMENT ON COLUMN public.health_check_records.employment_judgment IS
  '安衛法66条の4の就業判定。取込時は必ず pending。総合判定から自動判定しない';

CREATE INDEX idx_health_check_records_tenant_campaign
  ON public.health_check_records (tenant_id, campaign_id);
CREATE INDEX idx_health_check_records_employee
  ON public.health_check_records (employee_id, exam_date DESC);

ALTER TABLE public.health_check_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_records_select_self"
  ON public.health_check_records FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND employee_id = public.current_employee_id());

CREATE POLICY "health_check_records_select_staff"
  ON public.health_check_records FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_health_check_hr() OR public.is_health_check_medical())
  );

CREATE POLICY "health_check_records_hr_insert"
  ON public.health_check_records FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE POLICY "health_check_records_hr_update"
  ON public.health_check_records FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE POLICY "health_check_records_hr_delete"
  ON public.health_check_records FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE POLICY "health_check_records_doctor_update"
  ON public.health_check_records FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = 'company_doctor'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() = 'company_doctor'
  );

CREATE TRIGGER set_health_check_records_updated_at
  BEFORE UPDATE ON public.health_check_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 人事の UPDATE では就業判定・面談推奨を変更させない
CREATE OR REPLACE FUNCTION public.health_check_records_protect_judgment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.current_employee_app_role() = 'company_doctor' THEN
    RETURN NEW;
  END IF;
  NEW.employment_judgment := OLD.employment_judgment;
  NEW.employment_judged_at := OLD.employment_judged_at;
  NEW.employment_judged_by := OLD.employment_judged_by;
  NEW.nurse_interview_recommended := OLD.nurse_interview_recommended;
  NEW.doctor_interview_recommended := OLD.doctor_interview_recommended;
  NEW.nurse_interview_recommended_at := OLD.nurse_interview_recommended_at;
  NEW.doctor_interview_recommended_at := OLD.doctor_interview_recommended_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER health_check_records_protect_judgment_trg
  BEFORE UPDATE ON public.health_check_records
  FOR EACH ROW EXECUTE FUNCTION public.health_check_records_protect_judgment();

-- =============================================================================
-- 項目別結果（人事 SELECT なし）
-- =============================================================================
CREATE TABLE public.health_check_item_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES public.health_check_records(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.health_check_items(id) ON DELETE CASCADE,
  raw_value TEXT,
  raw_unit TEXT,
  institution_judgment_raw TEXT,
  standard_value TEXT,
  standard_unit TEXT,
  standard_judgment_id UUID REFERENCES public.health_check_judgment_codes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_item_results_record_item UNIQUE (record_id, item_id)
);

COMMENT ON TABLE public.health_check_item_results IS '健診項目別結果。人事は SELECT 不可（本人・産業医・保健師のみ）';

CREATE INDEX idx_health_check_item_results_record ON public.health_check_item_results (record_id);

ALTER TABLE public.health_check_item_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_item_results_select_self"
  ON public.health_check_item_results FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.health_check_records r
      WHERE r.id = health_check_item_results.record_id
        AND r.employee_id = public.current_employee_id()
    )
  );

CREATE POLICY "health_check_item_results_select_medical"
  ON public.health_check_item_results FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_medical());

CREATE POLICY "health_check_item_results_hr_write"
  ON public.health_check_item_results FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE POLICY "health_check_item_results_hr_update"
  ON public.health_check_item_results FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE POLICY "health_check_item_results_hr_delete"
  ON public.health_check_item_results FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_hr());

CREATE TRIGGER set_health_check_item_results_updated_at
  BEFORE UPDATE ON public.health_check_item_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- メディカルノート（人事 SELECT なし）
-- =============================================================================
CREATE TABLE public.health_check_medical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES public.health_check_records(id) ON DELETE CASCADE,
  doctor_judgment_code TEXT,
  doctor_comment TEXT,
  nurse_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_check_medical_notes_record UNIQUE (record_id)
);

COMMENT ON TABLE public.health_check_medical_notes IS '産業医判定コード・産業医/保健師コメント。人事は不可';

ALTER TABLE public.health_check_medical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_check_medical_notes_select_self"
  ON public.health_check_medical_notes FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.health_check_records r
      WHERE r.id = health_check_medical_notes.record_id
        AND r.employee_id = public.current_employee_id()
    )
  );

CREATE POLICY "health_check_medical_notes_select_medical"
  ON public.health_check_medical_notes FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_medical());

CREATE POLICY "health_check_medical_notes_medical_insert"
  ON public.health_check_medical_notes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_medical());

CREATE POLICY "health_check_medical_notes_medical_update"
  ON public.health_check_medical_notes FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_health_check_medical())
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_health_check_medical());

CREATE TRIGGER set_health_check_medical_notes_updated_at
  BEFORE UPDATE ON public.health_check_medical_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 保健師は nurse_comment 以外を変更できない
CREATE OR REPLACE FUNCTION public.health_check_medical_notes_protect_doctor_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.current_employee_app_role() = 'company_doctor' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.doctor_judgment_code := NULL;
    NEW.doctor_comment := NULL;
    RETURN NEW;
  END IF;
  NEW.doctor_judgment_code := OLD.doctor_judgment_code;
  NEW.doctor_comment := OLD.doctor_comment;
  RETURN NEW;
END;
$$;

CREATE TRIGGER health_check_medical_notes_protect_doctor_fields_trg
  BEFORE INSERT OR UPDATE ON public.health_check_medical_notes
  FOR EACH ROW EXECUTE FUNCTION public.health_check_medical_notes_protect_doctor_fields();

-- =============================================================================
-- 組織健康分析 RPC（標準総合判定の分布。n≧5 抑制。個人行なし）
-- =============================================================================
CREATE OR REPLACE FUNCTION public.health_check_org_analysis(
  p_campaign_id UUID,
  p_layer TEXT DEFAULT 'all'
)
RETURNS TABLE (
  division_id UUID,
  division_name TEXT,
  received_count BIGINT,
  suppressed BOOLEAN,
  judgment_code TEXT,
  judgment_label TEXT,
  judgment_count BIGINT,
  severity_rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.current_tenant_id();
  v_min_n CONSTANT INT := 5;
  v_layer INT;
BEGIN
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT (public.is_health_check_hr() OR public.is_health_check_medical()) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.health_check_campaigns c
    WHERE c.id = p_campaign_id AND c.tenant_id = v_tenant_id
  ) THEN
    RETURN;
  END IF;

  IF p_layer IS NULL OR p_layer = 'all' THEN
    v_layer := NULL;
  ELSE
    v_layer := p_layer::INT;
  END IF;

  RETURN QUERY
  WITH RECURSIVE divs AS (
    SELECT d.id, d.parent_id, d.layer, d.name
    FROM public.divisions d
    WHERE d.tenant_id = v_tenant_id
  ),
  ancestors AS (
    SELECT id, parent_id, layer, name, id AS leaf_id
    FROM divs
    UNION ALL
    SELECT p.id, p.parent_id, p.layer, p.name, a.leaf_id
    FROM divs p
    JOIN ancestors a ON a.parent_id = p.id
  ),
  leaf_to_bucket AS (
    SELECT leaf_id,
           CASE
             WHEN v_layer IS NULL THEN NULL
             ELSE id
           END AS bucket_id,
           CASE
             WHEN v_layer IS NULL THEN '全社'
             ELSE name
           END AS bucket_name
    FROM ancestors
    WHERE v_layer IS NULL OR layer = v_layer
  ),
  recs AS (
    SELECT
      r.id,
      r.employee_id,
      r.standard_overall_judgment_id,
      CASE
        WHEN v_layer IS NULL THEN NULL
        ELSE COALESCE(b.bucket_id, e.division_id)
      END AS bucket_id,
      CASE
        WHEN v_layer IS NULL THEN '全社'
        ELSE COALESCE(b.bucket_name, d.name, '未配属')
      END AS bucket_name
    FROM public.health_check_records r
    JOIN public.employees e ON e.id = r.employee_id
    LEFT JOIN public.divisions d ON d.id = e.division_id
    LEFT JOIN leaf_to_bucket b ON b.leaf_id = e.division_id
    WHERE r.tenant_id = v_tenant_id AND r.campaign_id = p_campaign_id
  ),
  totals AS (
    SELECT bucket_id, bucket_name, COUNT(*)::BIGINT AS recv
    FROM recs
    GROUP BY bucket_id, bucket_name
  ),
  by_j AS (
    SELECT
      recs.bucket_id,
      recs.bucket_name,
      jc.code AS j_code,
      COALESCE(jc.label, jc.code) AS j_label,
      jc.severity_rank AS j_rank,
      COUNT(*)::BIGINT AS j_count
    FROM recs
    LEFT JOIN public.health_check_judgment_codes jc
      ON jc.id = recs.standard_overall_judgment_id
    GROUP BY recs.bucket_id, recs.bucket_name, jc.code, jc.label, jc.severity_rank
  )
  SELECT
    t.bucket_id,
    t.bucket_name,
    t.recv,
    (t.recv < v_min_n) AS suppressed,
    CASE WHEN t.recv < v_min_n THEN NULL ELSE bj.j_code END,
    CASE WHEN t.recv < v_min_n THEN NULL ELSE bj.j_label END,
    CASE WHEN t.recv < v_min_n THEN NULL ELSE bj.j_count END,
    CASE WHEN t.recv < v_min_n THEN NULL ELSE bj.j_rank END
  FROM totals t
  LEFT JOIN by_j bj
    ON bj.bucket_id IS NOT DISTINCT FROM t.bucket_id
   AND bj.bucket_name = t.bucket_name
  ORDER BY t.bucket_name, bj.j_rank NULLS LAST, bj.j_code;
END;
$$;

REVOKE ALL ON FUNCTION public.health_check_org_analysis(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.health_check_org_analysis(UUID, TEXT) TO authenticated;

-- =============================================================================
-- システム項目（法定＋よく使う検査）
-- =============================================================================
INSERT INTO public.health_check_items (tenant_id, code, name, item_kind, standard_unit, sort_order, is_statutory)
VALUES
  (NULL, 'height', '身長', 'value', 'cm', 10, true),
  (NULL, 'weight', '体重', 'value', 'kg', 20, true),
  (NULL, 'bmi', 'BMI', 'value', NULL, 30, true),
  (NULL, 'waist', '腹囲', 'value', 'cm', 40, true),
  (NULL, 'obesity_rate', '肥満度', 'value', '%', 50, false),
  (NULL, 'body_fat', '体脂肪率', 'value', '%', 60, false),
  (NULL, 'vision_naked_r', '視力裸眼右', 'value', NULL, 70, true),
  (NULL, 'vision_naked_l', '視力裸眼左', 'value', NULL, 80, true),
  (NULL, 'vision_corrected_r', '視力矯正右', 'value', NULL, 90, true),
  (NULL, 'vision_corrected_l', '視力矯正左', 'value', NULL, 100, true),
  (NULL, 'sbp1', '血圧1最高', 'value', 'mmHg', 110, true),
  (NULL, 'dbp1', '血圧1最低', 'value', 'mmHg', 120, true),
  (NULL, 'sbp2', '血圧2最高', 'value', 'mmHg', 130, true),
  (NULL, 'dbp2', '血圧2最低', 'value', 'mmHg', 140, true),
  (NULL, 'urine_protein', '尿蛋白', 'value', NULL, 150, true),
  (NULL, 'urine_occult_blood', '尿潜血', 'value', NULL, 160, false),
  (NULL, 'urine_sugar', '尿糖', 'value', NULL, 170, true),
  (NULL, 'urine_urobilinogen', '尿ウロ', 'value', NULL, 180, false),
  (NULL, 'hearing_conversation', '聴力会話法', 'value', NULL, 190, true),
  (NULL, 'hearing_r_1k', '聴力右1K', 'value', NULL, 200, true),
  (NULL, 'hearing_l_1k', '聴力左1K', 'value', NULL, 210, true),
  (NULL, 'hearing_r_4k', '聴力右4K', 'value', NULL, 220, true),
  (NULL, 'hearing_l_4k', '聴力左4K', 'value', NULL, 230, true),
  (NULL, 'chest_xray_finding', '胸部X線所見', 'finding', NULL, 240, true),
  (NULL, 'ecg_finding', '心電図所見', 'finding', NULL, 250, true),
  (NULL, 'ast', 'AST(GOT)', 'value', 'U/L', 260, true),
  (NULL, 'alt', 'ALT(GPT)', 'value', 'U/L', 270, true),
  (NULL, 'ggt', 'γ-GT', 'value', 'U/L', 280, true),
  (NULL, 'alp', 'ALP', 'value', 'U/L', 290, false),
  (NULL, 'ldh', 'LDH', 'value', 'U/L', 300, false),
  (NULL, 'total_cholesterol', '総コレステロール', 'value', 'mg/dL', 310, true),
  (NULL, 'triglyceride', '中性脂肪', 'value', 'mg/dL', 320, true),
  (NULL, 'hdl_c', 'HDL-C', 'value', 'mg/dL', 330, true),
  (NULL, 'ldl_c', 'LDL-C', 'value', 'mg/dL', 340, true),
  (NULL, 'non_hdl_c', 'non-HDL-C', 'value', 'mg/dL', 350, false),
  (NULL, 'bun', '尿素窒素', 'value', 'mg/dL', 360, false),
  (NULL, 'creatinine', 'クレアチニン', 'value', 'mg/dL', 370, false),
  (NULL, 'egfr', 'eGFR', 'value', NULL, 380, false),
  (NULL, 'glucose', '血糖', 'value', 'mg/dL', 390, true),
  (NULL, 'hba1c', 'HbA1c', 'value', '%', 400, true),
  (NULL, 'hba1c_ngsp', 'HbA1c(N)', 'value', '%', 410, true),
  (NULL, 'uric_acid', '尿酸', 'value', 'mg/dL', 420, false),
  (NULL, 'crp', 'CRP', 'value', 'mg/dL', 430, false),
  (NULL, 'wbc', '白血球数', 'value', NULL, 440, true),
  (NULL, 'rbc', '赤血球数', 'value', NULL, 450, true),
  (NULL, 'hemoglobin', '血色素量', 'value', 'g/dL', 460, true),
  (NULL, 'hematocrit', 'ヘマトクリット', 'value', '%', 470, true),
  (NULL, 'platelet', '血小板数', 'value', NULL, 480, false),
  (NULL, 'cat_body', '体測分類判定', 'category_judgment', NULL, 500, false),
  (NULL, 'cat_vision', '視力分類判定', 'category_judgment', NULL, 510, false),
  (NULL, 'cat_bp', '血圧分類判定', 'category_judgment', NULL, 520, false),
  (NULL, 'cat_hearing', '聴力分類判定', 'category_judgment', NULL, 530, false),
  (NULL, 'cat_chest', '胸部X線分類判定', 'category_judgment', NULL, 540, false),
  (NULL, 'cat_ecg', '心電図分類判定', 'category_judgment', NULL, 550, false),
  (NULL, 'cat_liver', '肝機能分類判定', 'category_judgment', NULL, 560, false),
  (NULL, 'cat_lipid', '血中脂質分類判定', 'category_judgment', NULL, 570, false),
  (NULL, 'cat_kidney', '腎機能分類判定', 'category_judgment', NULL, 580, false),
  (NULL, 'cat_glucose', '糖代謝分類判定', 'category_judgment', NULL, 590, false),
  (NULL, 'metabolic', 'メタボ判定', 'category_judgment', NULL, 600, false);

-- =============================================================================
-- 協会系3ファイルプリセット（適用時のみテナントへコピー）
-- =============================================================================
INSERT INTO public.health_check_csv_format_presets (code, name, description, spec)
VALUES (
  'kyokai_3file',
  '協会けんぽ系 3ファイル（結果本表・追加検査・問診）',
  '個人コード+健診日で結合。CP932。ある機関の形式一例であり全テナントの標準ではない。',
  '{
    "join_keys": ["個人コード", "健診日"],
    "date_format": "YYYYMMDD",
    "employee_no_header": "個人コード",
    "name_header": "漢字氏名",
    "exam_date_header": "健診日",
    "primary_secondary_header": "１次２次区分",
    "overall_judgment_header": "総合判定",
    "auto_pair_judgment_suffix": "判定",
    "questionnaire_yes_token": "*",
    "negative_token": "－",
    "skip_headers": [
      "事業所コード", "所属コード", "所属名称", "個人コード", "漢字氏名", "カナ氏名",
      "性別", "生年月日", "健診日", "受診年齢", "１次２次区分", "総合判定",
      "協会ＩＤ", "保険証記号", "保険証番号", "カルテ番号", "事業所名",
      "会場コード", "会場名称", "医療機関コード", "医療機関名称", "地区組織名称",
      "基本コース", "健診予定名称", "健診コース名称", "特職欄", "特職コード"
    ],
    "judgment_codes": [
      {"code": "A1", "label": "A1", "severity_rank": 10},
      {"code": "A2", "label": "A2", "severity_rank": 20},
      {"code": "A3", "label": "A3", "severity_rank": 30},
      {"code": "B1", "label": "B1", "severity_rank": 40},
      {"code": "B112", "label": "B112", "severity_rank": 45},
      {"code": "C2", "label": "C2", "severity_rank": 60}
    ]
  }'::jsonb
);

-- =============================================================================
-- サービスマスタ（名前解決・冪等）
-- =============================================================================
DO $$
DECLARE
  v_wb_cat uuid;
  v_org_cat uuid;
  v_doc_cat uuid;
  v_class_id uuid;
  v_svc_emp uuid;
  v_svc_hr uuid;
  v_svc_doc uuid;
BEGIN
  SELECT id INTO v_wb_cat FROM public.service_category WHERE name = 'ウェルビーイング' LIMIT 1;
  IF v_wb_cat IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 600, 'ウェルビーイング')
    RETURNING id INTO v_wb_cat;
  END IF;

  SELECT id INTO v_org_cat FROM public.service_category
  WHERE name IN ('管理：組織健康度', '組織健康度')
  ORDER BY CASE WHEN name = '管理：組織健康度' THEN 0 ELSE 1 END
  LIMIT 1;
  IF v_org_cat IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 300, '管理：組織健康度')
    RETURNING id INTO v_org_cat;
  END IF;

  SELECT id INTO v_doc_cat FROM public.service_category
  WHERE name IN ('産業医メニュー', '産業医・保健師専用')
  ORDER BY CASE WHEN name = '産業医メニュー' THEN 0 ELSE 1 END
  LIMIT 1;
  IF v_doc_cat IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 10000, '産業医メニュー')
    RETURNING id INTO v_doc_cat;
  END IF;

  SELECT id INTO v_class_id FROM public.service_class WHERE name IN ('産業医', '組織健康') LIMIT 1;
  IF v_class_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_doc_cat
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_doc_cat);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/health-check') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_wb_cat, '健康診断結果', '', '健康診断結果',
      '自分の定期健康診断の結果（機関値と標準値）、産業医・保健師コメント、過去対比を確認できます。',
      30, '/health-check', 'all_users', '公開'
    )
    RETURNING id INTO v_svc_emp;
  ELSE
    SELECT id INTO v_svc_emp FROM public.service WHERE trim(route_path) = '/health-check';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/health-check') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_org_cat, '健康診断管理', '', '健康診断管理',
      '実施回の登録、CSV/手入力による結果取込、受診率・組織分析、就業判定一覧を管理します。',
      40, '/adm/health-check', 'adm', '公開'
    )
    RETURNING id INTO v_svc_hr;
  ELSE
    SELECT id INTO v_svc_hr FROM public.service WHERE trim(route_path) = '/adm/health-check';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/health-check-review') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_doc_cat, '健康診断結果参照', '', '健康診断結果参照',
      '標準値を見て就業判定し、保健師・産業医面談の推奨を本人へ案内します。',
      20, '/adm/health-check-review', 'adm', '公開'
    )
    RETURNING id INTO v_svc_doc;
  ELSE
    SELECT id INTO v_svc_doc FROM public.service WHERE trim(route_path) = '/adm/health-check-review';
  END IF;

  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_svc_emp
  FROM public.app_role ar
  WHERE ar.app_role IN ('employee', 'hr', 'hr_manager', 'company_doctor', 'company_nurse', 'developer', 'test', 'hsc')
    AND NOT EXISTS (
      SELECT 1 FROM public.app_role_service ars
      WHERE ars.app_role_id = ar.id AND ars.service_id = v_svc_emp
    );

  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_svc_hr
  FROM public.app_role ar
  WHERE ar.app_role IN ('hr', 'hr_manager', 'developer', 'test')
    AND NOT EXISTS (
      SELECT 1 FROM public.app_role_service ars
      WHERE ars.app_role_id = ar.id AND ars.service_id = v_svc_hr
    );

  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_svc_doc
  FROM public.app_role ar
  WHERE ar.app_role IN ('company_doctor', 'company_nurse', 'developer', 'test')
    AND NOT EXISTS (
      SELECT 1 FROM public.app_role_service ars
      WHERE ars.app_role_id = ar.id AND ars.service_id = v_svc_doc
    );

  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_svc_emp
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_svc_emp
  );

  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_svc_hr
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_svc_hr
  );

  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_svc_doc
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_svc_doc
  );
END $$;
