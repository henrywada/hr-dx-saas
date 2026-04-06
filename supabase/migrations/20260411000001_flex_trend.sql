-- get_overtime_trend を引数付きに拡張。
-- 既存の引数なし版も互換性のために残す（またはドロップして再定義）。

DROP FUNCTION IF EXISTS public.get_overtime_trend(uuid);

CREATE OR REPLACE FUNCTION public.get_overtime_trend(
  p_tenant_id uuid,
  p_start_date date DEFAULT (now() - interval '12 months')::date,
  p_end_date   date DEFAULT now()::date
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
    AND meo.year_month >= date_trunc('month', p_start_date)
    AND meo.year_month <= date_trunc('month', p_end_date)
  GROUP BY date_trunc('month', meo.year_month)
  ORDER BY 1 ASC;
END;
$$;

COMMENT ON FUNCTION public.get_overtime_trend(uuid, date, date) IS
  '指定期間のテナント別残業トレンド（月次集計）';

ALTER FUNCTION public.get_overtime_trend(uuid, date, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_overtime_trend(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_overtime_trend(uuid, date, date) TO authenticated;
