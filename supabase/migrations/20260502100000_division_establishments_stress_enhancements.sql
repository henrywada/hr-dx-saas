-- =============================================================================
-- 拠点マスタ（事業場）・テナント別ストレス集計設定・拠点別集団分析VIEW
-- Phase A〜B: division_establishments, tenant_stress_settings, 解決関数, views
-- Phase C: workplace_improvement_plans に source_division_establishment_id
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 拠点マスタ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.division_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  anchor_division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  workplace_address text,
  labor_office_reporting_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT division_establishments_tenant_anchor_unique UNIQUE (tenant_id, anchor_division_id)
);

COMMENT ON TABLE public.division_establishments IS '拠点（事業場）マスタ。anchor_division_id で組織ツリーのルートノードを指し、配下所属の従業員が当該拠点に属する';

CREATE INDEX IF NOT EXISTS idx_division_establishments_tenant ON public.division_establishments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_division_establishments_anchor ON public.division_establishments(anchor_division_id);

CREATE TRIGGER trg_division_establishments_updated_at
  BEFORE UPDATE ON public.division_establishments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.division_establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "division_establishments_select_same_tenant" ON public.division_establishments
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishments_insert_same_tenant" ON public.division_establishments
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishments_update_same_tenant" ON public.division_establishments
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishments_delete_same_tenant" ON public.division_establishments
  FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "supa_division_establishments_all" ON public.division_establishments
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

GRANT ALL ON TABLE public.division_establishments TO anon;
GRANT ALL ON TABLE public.division_establishments TO authenticated;
GRANT ALL ON TABLE public.division_establishments TO service_role;

-- -----------------------------------------------------------------------------
-- 2. テナント別ストレス設定（集団分析の最低人数など）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_stress_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  min_group_analysis_respondents integer NOT NULL DEFAULT 11
    CHECK (min_group_analysis_respondents >= 1 AND min_group_analysis_respondents <= 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenant_stress_settings IS 'テナント別ストレスチェック・集団分析の閾値（最低回答者数など）';

CREATE TRIGGER trg_tenant_stress_settings_updated_at
  BEFORE UPDATE ON public.tenant_stress_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tenant_stress_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_stress_settings_select_same_tenant" ON public.tenant_stress_settings
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_stress_settings_insert_same_tenant" ON public.tenant_stress_settings
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_stress_settings_update_same_tenant" ON public.tenant_stress_settings
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_stress_settings_delete_same_tenant" ON public.tenant_stress_settings
  FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "supa_tenant_stress_settings_all" ON public.tenant_stress_settings
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

GRANT ALL ON TABLE public.tenant_stress_settings TO anon;
GRANT ALL ON TABLE public.tenant_stress_settings TO authenticated;
GRANT ALL ON TABLE public.tenant_stress_settings TO service_role;

-- -----------------------------------------------------------------------------
-- 3. 従業員所属 division から拠点を解決（祖先チェーン上で最初に一致するアンカー）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_division_establishment_for_division(
  p_division_id uuid,
  p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current uuid := p_division_id;
  v_est uuid;
BEGIN
  IF p_division_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  WHILE v_current IS NOT NULL LOOP
    SELECT de.id INTO v_est
    FROM division_establishments de
    WHERE de.tenant_id = p_tenant_id
      AND de.anchor_division_id IS NOT NULL
      AND de.anchor_division_id = v_current
    LIMIT 1;
    IF FOUND AND v_est IS NOT NULL THEN
      RETURN v_est;
    END IF;
    SELECT d.parent_id INTO v_current
    FROM divisions d
    WHERE d.id = v_current;
  END LOOP;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.resolve_division_establishment_for_division IS '所属 division から親を遡り、最初に一致する拠点アンカーに対応する division_establishments.id を返す';

CREATE OR REPLACE FUNCTION public.resolve_division_establishment_for_employee(p_employee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_div uuid;
  v_tenant uuid;
BEGIN
  SELECT e.division_id, e.tenant_id
  INTO v_div, v_tenant
  FROM employees e
  WHERE e.id = p_employee_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN public.resolve_division_establishment_for_division(v_div, v_tenant);
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_division(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_division(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_division(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_employee(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_division_establishment_for_employee(uuid) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. 拠点別集団分析 VIEW（stress_group_analysis と同型＋抑制フラグ）
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.stress_group_analysis_establishment CASCADE;

CREATE VIEW public.stress_group_analysis_establishment
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    de.id AS division_establishment_id,
    de.name AS establishment_name,
    de.tenant_id,
    COUNT(e.id) AS member_count,
    ROUND(
      100.0 * COUNT(CASE WHEN sr.is_high_stress = true THEN 1 END)::numeric
      / NULLIF(COUNT(e.id), 0),
      1
    ) AS high_stress_rate,
    ROUND(
      (AVG(sr.score_a) + AVG(sr.score_b) + AVG(sr.score_c) + AVG(sr.score_d)) / 4.0,
      1
    ) AS health_risk,
    ROUND(AVG(sr.score_a)::numeric, 1) AS workload,
    ROUND(AVG(sr.score_b)::numeric, 1) AS control,
    ROUND(AVG(sr.score_c)::numeric, 1) AS supervisor_support,
    ROUND(AVG(sr.score_d)::numeric, 1) AS colleague_support,
    LAG(
      (AVG(sr.score_a) + AVG(sr.score_b) + AVG(sr.score_c) + AVG(sr.score_d)) / 4.0
    ) OVER (
      PARTITION BY de.id
      ORDER BY sp.end_date DESC
    ) AS previous_health_risk,
    sp.title AS period_name,
    sp.end_date AS period_end_date,
    (sp.end_date = MAX(sp.end_date) OVER (PARTITION BY de.tenant_id)) AS is_latest
  FROM public.employees e
  INNER JOIN public.division_establishments de
    ON de.id = public.resolve_division_establishment_for_division(e.division_id, e.tenant_id)
  INNER JOIN public.stress_check_results sr ON e.id = sr.employee_id
  INNER JOIN public.stress_check_periods sp
    ON sr.period_id = sp.id
    AND sp.tenant_id = e.tenant_id
  GROUP BY
    de.id,
    de.name,
    de.tenant_id,
    sp.title,
    sp.end_date
  HAVING COUNT(e.id) >= 1
)
SELECT
  b.division_establishment_id,
  b.establishment_name AS name,
  b.tenant_id,
  b.member_count,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.high_stress_rate
    ELSE NULL
  END AS high_stress_rate,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.health_risk
    ELSE NULL
  END AS health_risk,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.workload
    ELSE NULL
  END AS workload,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.control
    ELSE NULL
  END AS control,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.supervisor_support
    ELSE NULL
  END AS supervisor_support,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.colleague_support
    ELSE NULL
  END AS colleague_support,
  CASE
    WHEN b.member_count >= COALESCE(tss.min_group_analysis_respondents, 11)
    THEN b.previous_health_risk
    ELSE NULL
  END AS previous_health_risk,
  b.period_name,
  b.is_latest,
  (b.member_count < COALESCE(tss.min_group_analysis_respondents, 11)) AS is_suppressed,
  COALESCE(tss.min_group_analysis_respondents, 11) AS min_respondents_threshold
FROM base b
LEFT JOIN public.tenant_stress_settings tss ON tss.tenant_id = b.tenant_id;

COMMENT ON VIEW public.stress_group_analysis_establishment IS 'ストレスチェック集団分析（拠点×期間）。人数が閾値未満のとき指標は NULL・is_suppressed 真';

-- -----------------------------------------------------------------------------
-- 5. レイヤー別ロールアップ（指定 layer の division ごとに配下 subtree の結果を集約）
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.stress_group_analysis_for_layer(uuid, integer);

CREATE OR REPLACE FUNCTION public.stress_group_analysis_for_layer(
  p_tenant_id uuid,
  p_layer integer
)
RETURNS TABLE (
  rollup_division_id uuid,
  name text,
  tenant_id uuid,
  member_count bigint,
  high_stress_rate numeric,
  health_risk numeric,
  workload numeric,
  control numeric,
  supervisor_support numeric,
  colleague_support numeric,
  previous_health_risk numeric,
  period_name text,
  period_end_date date,
  is_latest boolean,
  is_suppressed boolean,
  min_respondents_threshold integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH RECURSIVE div_roots AS (
    SELECT d.id, d.name, d.tenant_id
    FROM divisions d
    WHERE d.tenant_id = p_tenant_id
      AND d.layer = p_layer
  ),
  subtree AS (
    SELECT dr.id AS root_id, dr.id AS division_id, dr.name, dr.tenant_id
    FROM div_roots dr
    UNION ALL
    SELECT st.root_id, c.id, st.name, st.tenant_id
    FROM subtree st
    INNER JOIN divisions c ON c.parent_id = st.division_id AND c.tenant_id = st.tenant_id
  ),
  joined AS (
    SELECT
      st.root_id AS rollup_division_id,
      dr.name,
      e.tenant_id,
      e.id AS employee_id,
      sr.is_high_stress,
      sr.score_a,
      sr.score_b,
      sr.score_c,
      sr.score_d,
      sp.title AS period_name,
      sp.end_date AS period_end_date
    FROM div_roots dr
    INNER JOIN subtree st ON st.root_id = dr.id AND st.division_id IS NOT NULL
    INNER JOIN employees e ON e.tenant_id = dr.tenant_id AND e.division_id = st.division_id
    INNER JOIN stress_check_results sr ON sr.employee_id = e.id
    INNER JOIN stress_check_periods sp ON sr.period_id = sp.id AND sp.tenant_id = e.tenant_id
  ),
  agg AS (
    SELECT
      j.rollup_division_id,
      j.name,
      j.tenant_id,
      COUNT(DISTINCT j.employee_id) AS member_count,
      ROUND(
        100.0 * COUNT(DISTINCT j.employee_id) FILTER (WHERE j.is_high_stress = true)::numeric
        / NULLIF(COUNT(DISTINCT j.employee_id), 0),
        1
      ) AS high_stress_rate,
      ROUND(
        (AVG(j.score_a) + AVG(j.score_b) + AVG(j.score_c) + AVG(j.score_d)) / 4.0,
        1
      ) AS health_risk,
      ROUND(AVG(j.score_a)::numeric, 1) AS workload,
      ROUND(AVG(j.score_b)::numeric, 1) AS control,
      ROUND(AVG(j.score_c)::numeric, 1) AS supervisor_support,
      ROUND(AVG(j.score_d)::numeric, 1) AS colleague_support,
      j.period_name,
      j.period_end_date
    FROM joined j
    GROUP BY j.rollup_division_id, j.name, j.tenant_id, j.period_name, j.period_end_date
    HAVING COUNT(DISTINCT j.employee_id) >= 1
  ),
  with_lag AS (
    SELECT
      a.*,
      LAG(a.health_risk) OVER (
        PARTITION BY a.rollup_division_id
        ORDER BY a.period_end_date DESC
      ) AS previous_health_risk,
      (a.period_end_date = MAX(a.period_end_date) OVER (PARTITION BY a.tenant_id)) AS is_latest,
      COALESCE(tss.min_group_analysis_respondents, 11) AS min_respondents_threshold
    FROM agg a
    LEFT JOIN tenant_stress_settings tss ON tss.tenant_id = a.tenant_id
  )
  SELECT
    w.rollup_division_id,
    w.name,
    w.tenant_id,
    w.member_count,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.high_stress_rate ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.health_risk ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.workload ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.control ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.supervisor_support ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.colleague_support ELSE NULL END,
    CASE WHEN w.member_count >= w.min_respondents_threshold THEN w.previous_health_risk ELSE NULL END,
    w.period_name,
    w.period_end_date,
    w.is_latest,
    (w.member_count < w.min_respondents_threshold) AS is_suppressed,
    w.min_respondents_threshold
  FROM with_lag w;
$$;

GRANT EXECUTE ON FUNCTION public.stress_group_analysis_for_layer(uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.stress_group_analysis_for_layer(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stress_group_analysis_for_layer(uuid, integer) TO service_role;

-- -----------------------------------------------------------------------------
-- Phase C: workplace_improvement_plans に拠点参照
-- -----------------------------------------------------------------------------
ALTER TABLE public.workplace_improvement_plans
  ADD COLUMN IF NOT EXISTS source_division_establishment_id uuid
    REFERENCES public.division_establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wip_source_establishment
  ON public.workplace_improvement_plans(source_division_establishment_id);

COMMENT ON COLUMN public.workplace_improvement_plans.source_division_establishment_id IS '改善提案が紐づく拠点（division_establishments.id）';
