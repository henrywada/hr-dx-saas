-- ⚠️ 本番適用前にステージングで検証してください。
-- 既存データは削除しません。

-- 勤務状況分析（部署別集計・36協定リスク・月次トレンド・申請乖離）。SECURITY DEFINER。

CREATE OR REPLACE FUNCTION public.get_department_overtime_summary(
  p_tenant_id uuid,
  p_year_month date
)
RETURNS TABLE (
  department_id   uuid,
  department_name text,
  employee_count  bigint,
  avg_overtime    numeric,
  max_overtime    numeric,
  violation_count bigint,
  warning_count   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  RETURN QUERY
  SELECT
    e.division_id AS department_id,
    d.name AS department_name,
    COUNT(DISTINCT e.id) AS employee_count,
    ROUND(AVG(meo.total_overtime_hours), 2) AS avg_overtime,
    MAX(meo.total_overtime_hours) AS max_overtime,
    COUNT(*) FILTER (WHERE meo.total_overtime_hours > 45) AS violation_count,
    COUNT(*) FILTER (
      WHERE meo.total_overtime_hours >= 36
        AND meo.total_overtime_hours <= 45
    ) AS warning_count
  FROM public.monthly_employee_overtime meo
  JOIN public.employees e ON e.id = meo.employee_id AND e.tenant_id = p_tenant_id
  LEFT JOIN public.divisions d
    ON d.id = e.division_id AND d.tenant_id = p_tenant_id
  WHERE meo.tenant_id = p_tenant_id
    AND date_trunc('month', meo.year_month) = date_trunc('month', p_year_month)
  GROUP BY e.division_id, d.name;
END;
$$;

COMMENT ON FUNCTION public.get_department_overtime_summary(uuid, date) IS
  '指定月の部署（組織）別残業集計（月次社員別集計テーブル基準）';

ALTER FUNCTION public.get_department_overtime_summary(uuid, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_department_overtime_summary(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_department_overtime_summary(uuid, date) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_36_risk_employees(
  p_tenant_id  uuid,
  p_year_month date
)
RETURNS TABLE (
  employee_id          uuid,
  employee_name        text,
  department_name      text,
  total_overtime_hours numeric,
  monthly_limit        numeric,
  usage_rate           numeric,
  risk_level           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$
DECLARE
  v_monthly_limit numeric := 45.0;
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  SELECT COALESCE(os.monthly_limit_hours::numeric, 45.0) INTO v_monthly_limit
  FROM public.overtime_settings os
  WHERE os.tenant_id = p_tenant_id
  LIMIT 1;

  RETURN QUERY
  SELECT
    e.id AS employee_id,
    e.name AS employee_name,
    d.name AS department_name,
    meo.total_overtime_hours,
    v_monthly_limit AS monthly_limit,
    ROUND((meo.total_overtime_hours / NULLIF(v_monthly_limit, 0)) * 100, 1) AS usage_rate,
    CASE
      WHEN meo.total_overtime_hours > v_monthly_limit THEN '違反'
      WHEN meo.total_overtime_hours > v_monthly_limit * 0.8 THEN '警告'
      WHEN meo.total_overtime_hours > v_monthly_limit * 0.6 THEN '注意'
      ELSE '正常'
    END AS risk_level
  FROM public.monthly_employee_overtime meo
  JOIN public.employees e ON e.id = meo.employee_id AND e.tenant_id = p_tenant_id
  LEFT JOIN public.divisions d
    ON d.id = e.division_id AND d.tenant_id = p_tenant_id
  WHERE meo.tenant_id = p_tenant_id
    AND date_trunc('month', meo.year_month) = date_trunc('month', p_year_month)
  ORDER BY meo.total_overtime_hours DESC;
END;
$$;

COMMENT ON FUNCTION public.get_36_risk_employees(uuid, date) IS
  '指定月の残業上限に対する社員別リスク（テナントの overtime_settings を反映）';

ALTER FUNCTION public.get_36_risk_employees(uuid, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_36_risk_employees(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_36_risk_employees(uuid, date) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_overtime_trend(
  p_tenant_id uuid
)
RETURNS TABLE (
  year_month           date,
  avg_overtime         numeric,
  max_overtime         numeric,
  total_employees      bigint,
  violation_count      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('month', meo.year_month)::date AS year_month,
    ROUND(AVG(meo.total_overtime_hours), 2) AS avg_overtime,
    MAX(meo.total_overtime_hours) AS max_overtime,
    COUNT(DISTINCT meo.employee_id) AS total_employees,
    COUNT(*) FILTER (WHERE meo.total_overtime_hours > 45) AS violation_count
  FROM public.monthly_employee_overtime meo
  WHERE meo.tenant_id = p_tenant_id
    AND meo.year_month >= (now() - interval '12 months')::date
  GROUP BY date_trunc('month', meo.year_month)
  ORDER BY 1 ASC;
END;
$$;

COMMENT ON FUNCTION public.get_overtime_trend(uuid) IS
  '過去12ヶ月のテナント別残業トレンド（月次集計）';

ALTER FUNCTION public.get_overtime_trend(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_overtime_trend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_overtime_trend(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_overtime_gap_analysis(
  p_tenant_id  uuid,
  p_year_month date
)
RETURNS TABLE (
  employee_id          uuid,
  employee_name        text,
  approved_hours       numeric,
  actual_hours         numeric,
  gap_hours            numeric,
  gap_type             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  RETURN QUERY
  SELECT
    e.id AS employee_id,
    e.name AS employee_name,
    COALESCE(meo.approved_overtime_hours, 0) AS approved_hours,
    COALESCE(meo.total_overtime_hours, 0) AS actual_hours,
    ROUND(
      COALESCE(meo.total_overtime_hours, 0)
      - COALESCE(meo.approved_overtime_hours, 0),
      2
    ) AS gap_hours,
    CASE
      WHEN COALESCE(meo.total_overtime_hours, 0) - COALESCE(meo.approved_overtime_hours, 0) > 5
        THEN '未申請残業あり'
      WHEN COALESCE(meo.approved_overtime_hours, 0) - COALESCE(meo.total_overtime_hours, 0) > 5
        THEN '申請超過（実績少）'
      ELSE '正常範囲'
    END AS gap_type
  FROM public.monthly_employee_overtime meo
  JOIN public.employees e ON e.id = meo.employee_id AND e.tenant_id = p_tenant_id
  WHERE meo.tenant_id = p_tenant_id
    AND date_trunc('month', meo.year_month) = date_trunc('month', p_year_month)
  ORDER BY
    ROUND(
      COALESCE(meo.total_overtime_hours, 0) - COALESCE(meo.approved_overtime_hours, 0),
      2
    ) DESC;
END;
$$;

COMMENT ON FUNCTION public.get_overtime_gap_analysis(uuid, date) IS
  '指定月の承認済残業と実績の乖離（申請漏れ・申請超過の簡易分類）';

ALTER FUNCTION public.get_overtime_gap_analysis(uuid, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_overtime_gap_analysis(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_overtime_gap_analysis(uuid, date) TO authenticated;
