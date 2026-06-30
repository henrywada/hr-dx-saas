-- C-S1: コンディション記録 × ストレスチェック クロス分析用集計関数（SECURITY DEFINER）
-- condition_checkins は本人限定 RLS のため、HR 系ロール向け集計は本関数群経由のみ提供する。
-- 匿名化閾値 v_min_n（5名）を部署・日次集計に適用する。

-- テナント全体の日次コンディション推移
CREATE OR REPLACE FUNCTION public.get_tenant_condition_daily_trend(p_days INT DEFAULT 30)
RETURNS TABLE (checkin_date DATE, avg_score NUMERIC, respondent_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
  v_min_n CONSTANT INT := 5;
BEGIN
  IF v_tenant_id IS NULL OR NOT (
    v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc', 'developer'])
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cc.checkin_date,
         CASE WHEN COUNT(*) >= v_min_n THEN ROUND(AVG(cc.score)::numeric, 2) ELSE NULL END,
         COUNT(*)
  FROM public.condition_checkins cc
  WHERE cc.tenant_id = v_tenant_id
    AND cc.checkin_date >= (CURRENT_DATE - p_days)
  GROUP BY cc.checkin_date
  ORDER BY cc.checkin_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_condition_daily_trend(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_condition_daily_trend(INT) TO authenticated;

-- 部署別コンディション平均（クロス分析散布図用）
CREATE OR REPLACE FUNCTION public.get_division_condition_summary(p_days INT DEFAULT 30)
RETURNS TABLE (
  division_id UUID,
  division_name TEXT,
  avg_score NUMERIC,
  respondent_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
  v_min_n CONSTANT INT := 5;
BEGIN
  IF v_tenant_id IS NULL OR NOT (
    v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc', 'developer'])
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT d.id,
         d.name,
         CASE WHEN COUNT(cc.*) >= v_min_n THEN ROUND(AVG(cc.score)::numeric, 2) ELSE NULL END,
         COUNT(cc.*)
  FROM public.divisions d
  LEFT JOIN public.employees e ON e.division_id = d.id AND e.tenant_id = v_tenant_id
  LEFT JOIN public.condition_checkins cc ON cc.employee_id = e.id
    AND cc.checkin_date >= (CURRENT_DATE - p_days)
  WHERE d.tenant_id = v_tenant_id
  GROUP BY d.id, d.name
  HAVING COUNT(cc.*) > 0
  ORDER BY d.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_division_condition_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_division_condition_summary(INT) TO authenticated;

-- 従業員別コンディション平均（ストレスチェック結果との突合・アラート用、HR 系ロール限定）
CREATE OR REPLACE FUNCTION public.get_employee_condition_averages(p_days INT DEFAULT 30)
RETURNS TABLE (
  employee_id UUID,
  avg_score NUMERIC,
  record_count BIGINT,
  recent_trend_down BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
BEGIN
  IF v_tenant_id IS NULL OR NOT (
    v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc', 'developer'])
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH per_employee AS (
    SELECT cc.employee_id,
           ROUND(AVG(cc.score)::numeric, 2) AS avg_score,
           COUNT(*) AS record_count,
           ROUND(AVG(cc.score) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 7)::numeric, 2) AS recent_avg,
           ROUND(AVG(cc.score) FILTER (
             WHERE cc.checkin_date >= CURRENT_DATE - 14 AND cc.checkin_date < CURRENT_DATE - 7
           )::numeric, 2) AS prior_avg
    FROM public.condition_checkins cc
    JOIN public.employees e ON e.id = cc.employee_id
    WHERE e.tenant_id = v_tenant_id
      AND cc.checkin_date >= (CURRENT_DATE - p_days)
    GROUP BY cc.employee_id
    HAVING COUNT(*) >= 3
  )
  SELECT pe.employee_id,
         pe.avg_score,
         pe.record_count,
         (pe.recent_avg IS NOT NULL AND pe.prior_avg IS NOT NULL AND pe.recent_avg < pe.prior_avg)
  FROM per_employee pe;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_condition_averages(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_condition_averages(INT) TO authenticated;
