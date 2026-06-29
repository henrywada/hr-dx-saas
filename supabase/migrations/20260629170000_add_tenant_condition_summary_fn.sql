-- コンディション記録のテナント全体匿名集計関数（adm-dashboardウェルビーイング統合用）
-- 既存の get_division_condition_trend と同じ匿名化方針（n>=5閾値、HR系ロール限定）を継承する。
-- condition_checkins テーブル自体のRLS（本人のみSELECT可）は変更しない。集計はこの関数経由のみ。

CREATE OR REPLACE FUNCTION public.get_tenant_condition_summary(p_days INT DEFAULT 30)
RETURNS TABLE (avg_score NUMERIC, respondent_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
  v_min_n CONSTANT INT := 5;
BEGIN
  IF v_tenant_id IS NULL OR NOT (v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])) THEN
    RETURN; -- 権限なし: 空集合（存在有無も漏らさない）
  END IF;

  RETURN QUERY
  SELECT
    CASE WHEN COUNT(*) >= v_min_n THEN ROUND(AVG(cc.score)::numeric, 2) ELSE NULL END,
    COUNT(*)
  FROM public.condition_checkins cc
  WHERE cc.tenant_id = v_tenant_id
    AND cc.checkin_date >= (CURRENT_DATE - p_days);
END;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_condition_summary(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_condition_summary(INT) TO authenticated;
