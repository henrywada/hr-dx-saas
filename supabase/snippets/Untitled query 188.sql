CREATE OR REPLACE VIEW stress_group_analysis AS
SELECT 
  d.id AS division_id,
  d.name,
  d.tenant_id,
  COUNT(e.id) AS member_count,

  -- 高ストレス率（is_high_stress = true の割合）
  ROUND(
    100.0 * COUNT(CASE WHEN sr.is_high_stress = true THEN 1 END)::decimal 
    / NULLIF(COUNT(e.id), 0), 
    1
  ) AS high_stress_rate,

  -- 健康リスク（score_a〜d の平均 → レーダーと完全に一致）
  ROUND(
    (
      AVG(sr.score_a) + 
      AVG(sr.score_b) + 
      AVG(sr.score_c) + 
      AVG(sr.score_d)
    ) / 4.0 , 
    1
  ) AS health_risk,

  -- 4項目（レーダー用）
  ROUND(AVG(sr.score_a)::numeric, 1) AS workload,
  ROUND(AVG(sr.score_b)::numeric, 1) AS control,
  ROUND(AVG(sr.score_c)::numeric, 1) AS supervisor_support,
  ROUND(AVG(sr.score_d)::numeric, 1) AS colleague_support,

  -- 前回比
  LAG(
    (
      AVG(sr.score_a) + 
      AVG(sr.score_b) + 
      AVG(sr.score_c) + 
      AVG(sr.score_d)
    ) / 4.0 
  ) OVER (PARTITION BY d.id ORDER BY sp.period_name) AS previous_health_risk,

  sp.period_name,
  sp.is_latest

FROM employees e
JOIN divisions d ON e.division_id = d.id
JOIN stress_check_results sr ON e.id = sr.employee_id
JOIN stress_check_periods sp ON sr.period_id = sp.id
WHERE sp.is_active = true
GROUP BY d.id, d.name, d.tenant_id, sp.period_name, sp.is_latest
HAVING COUNT(e.id) >= 1;