-- ストレスチェック集団分析ビュー（部署×期間ごとの集計）
-- 既存の stress_check_results, stress_check_periods, employees, divisions を結合
-- RLS を適用するため security_invoker = true を指定（PostgreSQL 15+）
--
-- 所有者エラー対策: SECURITY DEFINER 関数で postgres 権限で DROP/CREATE を実行
-- （"must be owner of view" エラーを回避）

CREATE OR REPLACE FUNCTION public._migrate_stress_group_analysis_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DROP VIEW IF EXISTS public.stress_group_analysis CASCADE;

  CREATE VIEW public.stress_group_analysis
  WITH (security_invoker = true)
  AS
  SELECT
    d.id AS division_id,
    d.name,
    d.tenant_id,
    COUNT(e.id) AS member_count,

    -- 高ストレス率（%）
    ROUND(
      100.0 * COUNT(CASE WHEN sr.is_high_stress = true THEN 1 END)::decimal
      / NULLIF(COUNT(e.id), 0),
      1
    ) AS high_stress_rate,

    -- 健康リスク（4項目平均）
    ROUND(
      (AVG(sr.score_a) + AVG(sr.score_b) + AVG(sr.score_c) + AVG(sr.score_d)) / 4.0,
      1
    ) AS health_risk,

    -- レーダーチャート用4項目
    ROUND(AVG(sr.score_a)::numeric, 1) AS workload,
    ROUND(AVG(sr.score_b)::numeric, 1) AS control,
    ROUND(AVG(sr.score_c)::numeric, 1) AS supervisor_support,
    ROUND(AVG(sr.score_d)::numeric, 1) AS colleague_support,

    -- 前回比（LAG: 同一部署の1つ前の期間の健康リスク）
    LAG(
      (AVG(sr.score_a) + AVG(sr.score_b) + AVG(sr.score_c) + AVG(sr.score_d)) / 4.0
    ) OVER (PARTITION BY d.id ORDER BY sp.end_date DESC) AS previous_health_risk,

    sp.title AS period_name,

    -- 最新期間を自動判定（tenant_id ごとに最新 end_date）
    (sp.end_date = MAX(sp.end_date) OVER (PARTITION BY d.tenant_id)) AS is_latest

  FROM public.employees e
  JOIN public.divisions d ON e.division_id = d.id
  JOIN public.stress_check_results sr ON e.id = sr.employee_id
  JOIN public.stress_check_periods sp ON sr.period_id = sp.id AND sp.tenant_id = d.tenant_id
  GROUP BY
    d.id, d.name, d.tenant_id,
    sp.title, sp.end_date
  HAVING COUNT(e.id) >= 1;

  COMMENT ON VIEW public.stress_group_analysis IS 'ストレスチェック集団分析（部署×期間別の高ストレス率・健康リスク・4尺度）';
END;
$$;

SELECT public._migrate_stress_group_analysis_view();

DROP FUNCTION public._migrate_stress_group_analysis_view();
