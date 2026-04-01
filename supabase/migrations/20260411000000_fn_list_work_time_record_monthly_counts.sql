-- ⚠️ 本番適用前にステージングで検証してください。
-- 既存データは削除しません。

-- テナント別・work_time_records の暦月ごと件数（勤怠 CSV 画面の月次一覧用）

CREATE OR REPLACE FUNCTION public.list_work_time_record_monthly_counts(p_tenant_id uuid)
RETURNS TABLE (
  year_month date,
  row_count bigint
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
    date_trunc('month', w.record_date)::date AS year_month,
    COUNT(*)::bigint AS row_count
  FROM public.work_time_records w
  WHERE w.tenant_id = p_tenant_id
  GROUP BY date_trunc('month', w.record_date)
  ORDER BY year_month DESC;
END;
$$;

COMMENT ON FUNCTION public.list_work_time_record_monthly_counts(uuid) IS
  'work_time_records を暦月で集計した件数一覧（テナント指定・SECURITY DEFINER）';

ALTER FUNCTION public.list_work_time_record_monthly_counts(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_work_time_record_monthly_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_work_time_record_monthly_counts(uuid) TO authenticated;
