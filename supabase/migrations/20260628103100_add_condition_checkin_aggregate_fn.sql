-- コンディション記録の部署別匿名集計（SECURITY DEFINER）
-- condition_checkins には本人限定のRLSしか無いため、上長・スタッフ向けの集計は
-- 本関数を介してのみ提供する。呼び出し元の権限・所属部署・テナントを必ず内部で検証し、
-- 人数閾値（v_min_n）未満の日は avg_score を NULL にして個人特定を防ぐ。

CREATE OR REPLACE FUNCTION public.get_division_condition_trend(
  p_division_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (checkin_date DATE, avg_score NUMERIC, respondent_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_id UUID := current_employee_id();
  v_caller_role TEXT := current_employee_app_role();
  v_min_n CONSTANT INT := 5;
  v_is_staff BOOLEAN;
  v_is_authorized_manager BOOLEAN;
BEGIN
  IF v_tenant_id IS NULL OR v_caller_id IS NULL THEN
    RETURN;
  END IF;

  v_is_staff := v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']);

  v_is_authorized_manager := EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = v_caller_id AND e.tenant_id = v_tenant_id
      AND e.is_manager = true AND e.division_id = p_division_id
  );

  IF NOT (v_is_staff OR v_is_authorized_manager) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.divisions d WHERE d.id = p_division_id AND d.tenant_id = v_tenant_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT cc.checkin_date,
         CASE WHEN COUNT(*) >= v_min_n THEN ROUND(AVG(cc.score)::numeric, 2) ELSE NULL END,
         COUNT(*)
  FROM public.condition_checkins cc
  JOIN public.employees e ON e.id = cc.employee_id
  WHERE e.tenant_id = v_tenant_id AND e.division_id = p_division_id
    AND cc.checkin_date >= (CURRENT_DATE - p_days)
  GROUP BY cc.checkin_date
  ORDER BY cc.checkin_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_division_condition_trend(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_division_condition_trend(UUID, INT) TO authenticated;
