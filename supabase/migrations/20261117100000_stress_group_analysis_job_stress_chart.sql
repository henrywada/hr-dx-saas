-- ストレスチェック集団分析を厚労省「仕事のストレス判定図」に準拠させる
--
-- 旧実装の問題:
--   - health_risk = (AVG(score_a)+AVG(score_b)+AVG(score_c)+AVG(score_d))/4 で、判定図と無関係な値だった
--   - workload=score_a（要因合計）, control=score_b（心身反応合計）, colleague_support=score_d（満足度）
--     のように、判定図の4尺度とは別の値を入れていた
--   - 前回比 LAG を end_date DESC で並べており、「前回」ではなく「次回」の値を返していた
--   - 部署別ビューは人数による抑制がなく、少人数部署の高ストレス率等をそのまま返していた
--
-- 新実装:
--   - 回答明細（stress_check_responses）から判定図の4尺度得点（各3項目、3〜12点）を計算する
--       量的負担   = 15 − (A1+A2+A3)
--       コントロール = 15 − (A8+A9+A10)
--       上司の支援  = 15 − (C1+C4+C7)
--       同僚の支援  = 15 − (C2+C5+C8)
--     （回答値は選択肢番号 1〜4。そうだ／非常に=4点 で数えるのと同じ）
--   - 健康リスク = 量-コントロール判定図(A) × 職場の支援判定図(B) / 100（全国平均=100）
--     式は src/features/stress-check/job-stress-chart.ts と同じ。変更時は両方を直すこと
--   - 出典: ストレスチェック制度実施マニュアル P86-87、docs/stress/仕事のストレス判定図.pdf
--
-- 既存データの書き換えはしない（ビュー・関数の定義のみ）。

-- -----------------------------------------------------------------------------
-- 1. 判定図の健康リスク（総合）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stress_job_stress_health_risk(
  p_workload numeric,
  p_control numeric,
  p_supervisor numeric,
  p_colleague numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT ROUND(
    (100 * exp(0.076 * (p_workload - 8.7) - 0.089 * (p_control - 7.9)))
    * (100 * exp(-0.097 * (p_supervisor - 7.5) - 0.097 * (p_colleague - 8.1)))
    / 100,
    1
  )
$$;

COMMENT ON FUNCTION public.stress_job_stress_health_risk(numeric, numeric, numeric, numeric) IS
  '仕事のストレス判定図の総合健康リスク（全国平均=100）。入力は集団の量的負担・コントロール・上司支援・同僚支援の平均点';

-- -----------------------------------------------------------------------------
-- 2. 受検者ごとの判定図4尺度得点（設問が欠けている尺度は NULL）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.stress_check_job_stress_scores
WITH (security_invoker = true)
AS
SELECT
  r.tenant_id,
  r.period_id,
  r.employee_id,
  CASE WHEN COUNT(*) FILTER (WHERE q.category = 'A' AND q.question_no IN (1, 2, 3)) = 3
    THEN 15 - SUM(r.answer) FILTER (WHERE q.category = 'A' AND q.question_no IN (1, 2, 3))
  END AS workload,
  CASE WHEN COUNT(*) FILTER (WHERE q.category = 'A' AND q.question_no IN (8, 9, 10)) = 3
    THEN 15 - SUM(r.answer) FILTER (WHERE q.category = 'A' AND q.question_no IN (8, 9, 10))
  END AS control,
  CASE WHEN COUNT(*) FILTER (WHERE q.category = 'C' AND q.question_no IN (1, 4, 7)) = 3
    THEN 15 - SUM(r.answer) FILTER (WHERE q.category = 'C' AND q.question_no IN (1, 4, 7))
  END AS supervisor_support,
  CASE WHEN COUNT(*) FILTER (WHERE q.category = 'C' AND q.question_no IN (2, 5, 8)) = 3
    THEN 15 - SUM(r.answer) FILTER (WHERE q.category = 'C' AND q.question_no IN (2, 5, 8))
  END AS colleague_support
FROM public.stress_check_responses r
INNER JOIN public.stress_check_questions q ON q.id = r.question_id
GROUP BY r.tenant_id, r.period_id, r.employee_id;

COMMENT ON VIEW public.stress_check_job_stress_scores IS
  '受検者ごとの仕事のストレス判定図4尺度の得点（3〜12点）。集団分析の入力用。RLS は回答明細に従う';

REVOKE ALL ON public.stress_check_job_stress_scores FROM anon;

-- -----------------------------------------------------------------------------
-- 3. 部署×期間の集団分析ビュー（列は既存と同順。末尾に抑制フラグを追加）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.stress_group_analysis
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    d.id AS division_id,
    d.name,
    d.tenant_id,
    COUNT(e.id) AS member_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE sr.is_high_stress = true)::numeric / NULLIF(COUNT(e.id), 0),
      1
    ) AS high_stress_rate,
    AVG(js.workload) AS workload,
    AVG(js.control) AS control,
    AVG(js.supervisor_support) AS supervisor_support,
    AVG(js.colleague_support) AS colleague_support,
    sp.title AS period_name,
    sp.end_date AS period_end_date
  FROM public.employees e
  INNER JOIN public.divisions d ON e.division_id = d.id
  INNER JOIN public.stress_check_results sr ON e.id = sr.employee_id
  INNER JOIN public.stress_check_periods sp ON sr.period_id = sp.id AND sp.tenant_id = d.tenant_id
  LEFT JOIN public.stress_check_job_stress_scores js
    ON js.period_id = sr.period_id AND js.employee_id = sr.employee_id
  GROUP BY d.id, d.name, d.tenant_id, sp.title, sp.end_date
),
scored AS (
  SELECT
    b.*,
    public.stress_job_stress_health_risk(
      b.workload, b.control, b.supervisor_support, b.colleague_support
    ) AS health_risk,
    COALESCE(tss.min_group_analysis_respondents, 11) AS min_respondents_threshold
  FROM base b
  LEFT JOIN public.tenant_stress_settings tss ON tss.tenant_id = b.tenant_id
),
visible AS (
  SELECT
    s.*,
    (s.member_count < s.min_respondents_threshold) AS is_suppressed
  FROM scored s
)
SELECT
  v.division_id,
  v.name,
  v.tenant_id,
  v.member_count,
  CASE WHEN v.is_suppressed THEN NULL ELSE v.high_stress_rate END AS high_stress_rate,
  CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END AS health_risk,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.workload, 1) END AS workload,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.control, 1) END AS control,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.supervisor_support, 1) END AS supervisor_support,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.colleague_support, 1) END AS colleague_support,
  LAG(CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END) OVER (
    PARTITION BY v.division_id
    ORDER BY v.period_end_date ASC
  ) AS previous_health_risk,
  v.period_name,
  (v.period_end_date = MAX(v.period_end_date) OVER (PARTITION BY v.tenant_id)) AS is_latest,
  v.is_suppressed,
  v.min_respondents_threshold
FROM visible v;

COMMENT ON VIEW public.stress_group_analysis IS
  'ストレスチェック集団分析（部署×期間）。健康リスクは仕事のストレス判定図（全国平均=100）。人数が閾値未満のとき指標は NULL・is_suppressed 真';

-- -----------------------------------------------------------------------------
-- 4. 拠点×期間の集団分析ビュー（列は既存と同順）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.stress_group_analysis_establishment
WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    de.id AS division_establishment_id,
    de.name AS establishment_name,
    de.tenant_id,
    COUNT(e.id) AS member_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE sr.is_high_stress = true)::numeric / NULLIF(COUNT(e.id), 0),
      1
    ) AS high_stress_rate,
    AVG(js.workload) AS workload,
    AVG(js.control) AS control,
    AVG(js.supervisor_support) AS supervisor_support,
    AVG(js.colleague_support) AS colleague_support,
    sp.title AS period_name,
    sp.end_date AS period_end_date
  FROM public.employees e
  INNER JOIN public.division_establishments de
    ON de.id = public.resolve_division_establishment_for_division(e.division_id, e.tenant_id)
  INNER JOIN public.stress_check_results sr ON e.id = sr.employee_id
  INNER JOIN public.stress_check_periods sp
    ON sr.period_id = sp.id
    AND sp.tenant_id = e.tenant_id
  LEFT JOIN public.stress_check_job_stress_scores js
    ON js.period_id = sr.period_id AND js.employee_id = sr.employee_id
  GROUP BY de.id, de.name, de.tenant_id, sp.title, sp.end_date
),
visible AS (
  SELECT
    b.*,
    public.stress_job_stress_health_risk(
      b.workload, b.control, b.supervisor_support, b.colleague_support
    ) AS health_risk,
    COALESCE(tss.min_group_analysis_respondents, 11) AS min_respondents_threshold,
    (b.member_count < COALESCE(tss.min_group_analysis_respondents, 11)) AS is_suppressed
  FROM base b
  LEFT JOIN public.tenant_stress_settings tss ON tss.tenant_id = b.tenant_id
)
SELECT
  v.division_establishment_id,
  v.establishment_name AS name,
  v.tenant_id,
  v.member_count,
  CASE WHEN v.is_suppressed THEN NULL ELSE v.high_stress_rate END AS high_stress_rate,
  CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END AS health_risk,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.workload, 1) END AS workload,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.control, 1) END AS control,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.supervisor_support, 1) END AS supervisor_support,
  CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.colleague_support, 1) END AS colleague_support,
  LAG(CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END) OVER (
    PARTITION BY v.division_establishment_id
    ORDER BY v.period_end_date ASC
  ) AS previous_health_risk,
  v.period_name,
  (v.period_end_date = MAX(v.period_end_date) OVER (PARTITION BY v.tenant_id)) AS is_latest,
  v.is_suppressed,
  v.min_respondents_threshold
FROM visible v;

COMMENT ON VIEW public.stress_group_analysis_establishment IS
  'ストレスチェック集団分析（拠点×期間）。健康リスクは仕事のストレス判定図（全国平均=100）。人数が閾値未満のとき指標は NULL・is_suppressed 真';

-- -----------------------------------------------------------------------------
-- 5. 指定レイヤーでのロールアップ集計（戻り値の型は既存と同じ）
-- -----------------------------------------------------------------------------
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
  WITH RECURSIVE actual_depth AS (
    -- parent_id から実際の深さを計算（layer 列に依存しない）
    SELECT id, name, tenant_id, 1::integer AS depth
    FROM divisions
    WHERE tenant_id = p_tenant_id AND parent_id IS NULL
    UNION ALL
    SELECT d.id, d.name, d.tenant_id, ad.depth + 1
    FROM divisions d
    INNER JOIN actual_depth ad ON d.parent_id = ad.id AND d.tenant_id = p_tenant_id
  ),
  div_roots AS (
    SELECT id, name, tenant_id
    FROM actual_depth
    WHERE depth = p_layer
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
      js.workload,
      js.control,
      js.supervisor_support,
      js.colleague_support,
      sp.title AS period_name,
      sp.end_date AS period_end_date
    FROM div_roots dr
    INNER JOIN subtree st ON st.root_id = dr.id AND st.division_id IS NOT NULL
    INNER JOIN employees e ON e.tenant_id = dr.tenant_id AND e.division_id = st.division_id
    INNER JOIN stress_check_results sr ON sr.employee_id = e.id
    INNER JOIN stress_check_periods sp ON sr.period_id = sp.id AND sp.tenant_id = e.tenant_id
    LEFT JOIN stress_check_job_stress_scores js
      ON js.period_id = sr.period_id AND js.employee_id = sr.employee_id
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
      AVG(j.workload) AS workload,
      AVG(j.control) AS control,
      AVG(j.supervisor_support) AS supervisor_support,
      AVG(j.colleague_support) AS colleague_support,
      j.period_name,
      j.period_end_date
    FROM joined j
    GROUP BY j.rollup_division_id, j.name, j.tenant_id, j.period_name, j.period_end_date
  ),
  visible AS (
    SELECT
      a.*,
      public.stress_job_stress_health_risk(
        a.workload, a.control, a.supervisor_support, a.colleague_support
      ) AS health_risk,
      COALESCE(tss.min_group_analysis_respondents, 11) AS min_respondents_threshold,
      (a.member_count < COALESCE(tss.min_group_analysis_respondents, 11)) AS is_suppressed
    FROM agg a
    LEFT JOIN tenant_stress_settings tss ON tss.tenant_id = a.tenant_id
  )
  SELECT
    v.rollup_division_id,
    v.name,
    v.tenant_id,
    v.member_count,
    CASE WHEN v.is_suppressed THEN NULL ELSE v.high_stress_rate END,
    CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END,
    CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.workload, 1) END,
    CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.control, 1) END,
    CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.supervisor_support, 1) END,
    CASE WHEN v.is_suppressed THEN NULL ELSE ROUND(v.colleague_support, 1) END,
    LAG(CASE WHEN v.is_suppressed THEN NULL ELSE v.health_risk END) OVER (
      PARTITION BY v.rollup_division_id
      ORDER BY v.period_end_date ASC
    ),
    v.period_name,
    v.period_end_date,
    (v.period_end_date = MAX(v.period_end_date) OVER (PARTITION BY v.tenant_id)),
    v.is_suppressed,
    v.min_respondents_threshold
  FROM visible v;
$$;
