-- stress_group_analysis_for_layer RPC を修正
-- 問題: divisions.layer 列が不正確な場合があるため、parent_id を辿った実際の深さで集計する
-- 修正: div_roots CTE を再帰 CTE による実際の深さ計算に変更

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
