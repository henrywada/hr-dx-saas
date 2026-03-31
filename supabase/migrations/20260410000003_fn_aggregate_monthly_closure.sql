-- 月次締め集計・打刻異常検出（SECURITY DEFINER）。既存テーブル行の無差別削除は行わない。
-- work_time_records: record_date, start_time, end_time, duration_minutes

-- 同一締め・社員の再集計を UPSERT するための一意制約
CREATE UNIQUE INDEX IF NOT EXISTS uq_monthly_employee_overtime_tenant_closure_employee
  ON public.monthly_employee_overtime (tenant_id, closure_id, employee_id);

CREATE OR REPLACE FUNCTION public.aggregate_monthly_closure(
  p_closure_id uuid,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$
DECLARE
  v_year_month date;
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  SELECT m.year_month INTO v_year_month
  FROM public.monthly_overtime_closures m
  WHERE m.id = p_closure_id AND m.tenant_id = p_tenant_id;

  IF v_year_month IS NULL THEN
    RAISE EXCEPTION '対象の月次締めレコードが見つかりません: %', p_closure_id;
  END IF;

  INSERT INTO public.monthly_employee_overtime (
    tenant_id,
    closure_id,
    employee_id,
    year_month,
    total_work_hours,
    total_overtime_hours,
    approved_overtime_hours,
    corrections_summary
  )
  SELECT
    p_tenant_id,
    p_closure_id,
    e.id,
    v_year_month,
    ROUND(
      COALESCE(
        SUM(
          COALESCE(
            CASE
              WHEN wtr.start_time IS NOT NULL AND wtr.end_time IS NOT NULL THEN
                EXTRACT(EPOCH FROM (wtr.end_time - wtr.start_time)) / 3600.0
              WHEN wtr.id IS NOT NULL THEN
                wtr.duration_minutes::numeric / 60.0
              ELSE 0
            END,
            0
          )
        ),
        0
      )::numeric,
      2
    ),
    ROUND(
      COALESCE(
        SUM(
          GREATEST(
            COALESCE(
              CASE
                WHEN wtr.start_time IS NOT NULL AND wtr.end_time IS NOT NULL THEN
                  EXTRACT(EPOCH FROM (wtr.end_time - wtr.start_time)) / 3600.0
                WHEN wtr.id IS NOT NULL THEN
                  wtr.duration_minutes::numeric / 60.0
                ELSE 0
              END,
              0
            ) - 8,
            0
          )
        ),
        0
      )::numeric,
      2
    ),
    ROUND(
      COALESCE(
        (
          SELECT SUM(oa.requested_hours)
          FROM public.overtime_applications oa
          WHERE oa.employee_id = e.id
            AND oa.tenant_id = p_tenant_id
            AND oa.work_date >= v_year_month
            AND oa.work_date < (v_year_month + INTERVAL '1 month')
            AND oa.status = '承認済'
        ),
        0
      )::numeric,
      2
    ),
    jsonb_build_object(
      'total_records', COUNT(wtr.id),
      'missing_clockout', COUNT(wtr.id) FILTER (WHERE wtr.end_time IS NULL)
    )
  FROM public.employees e
  LEFT JOIN public.work_time_records wtr
    ON wtr.employee_id = e.id
    AND wtr.tenant_id = p_tenant_id
    AND wtr.record_date >= v_year_month
    AND wtr.record_date < (v_year_month + INTERVAL '1 month')
  WHERE e.tenant_id = p_tenant_id
  GROUP BY e.id
  ON CONFLICT (tenant_id, closure_id, employee_id)
  DO UPDATE SET
    year_month = EXCLUDED.year_month,
    total_work_hours = EXCLUDED.total_work_hours,
    total_overtime_hours = EXCLUDED.total_overtime_hours,
    approved_overtime_hours = EXCLUDED.approved_overtime_hours,
    corrections_summary = EXCLUDED.corrections_summary,
    updated_at = now();

  UPDATE public.monthly_overtime_closures
  SET
    aggregated_at = now(),
    aggregate_version = COALESCE(aggregate_version, 0) + 1,
    status = 'aggregated',
    updated_at = now()
  WHERE id = p_closure_id AND tenant_id = p_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.aggregate_monthly_closure(uuid, uuid) IS
  '締め対象月の勤怠・承認済残業申請を集計し monthly_employee_overtime を UPSERT';

ALTER FUNCTION public.aggregate_monthly_closure(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.aggregate_monthly_closure(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aggregate_monthly_closure(uuid, uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.detect_timecard_anomalies(
  p_tenant_id uuid,
  p_year_month date
)
RETURNS TABLE (
  anomaly_type text,
  employee_id uuid,
  record_date date,
  work_time_record_id uuid,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS
$$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF public.current_tenant_id() IS NOT NULL
     AND p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'テナントが一致しません';
  END IF;

  v_month_start := date_trunc('month', p_year_month)::date;
  v_month_end := (date_trunc('month', p_year_month) + INTERVAL '1 month')::date;

  RETURN QUERY
  SELECT
    x.anomaly_type,
    x.employee_id,
    x.record_date,
    x.work_time_record_id,
    x.details
  FROM (
    SELECT
      'missing_clock_out'::text AS anomaly_type,
      wtr.employee_id,
      wtr.record_date,
      wtr.id AS work_time_record_id,
      jsonb_build_object(
        'start_time', wtr.start_time,
        'end_time', wtr.end_time
      ) AS details
    FROM public.work_time_records wtr
    WHERE wtr.tenant_id = p_tenant_id
      AND wtr.record_date >= v_month_start
      AND wtr.record_date < v_month_end
      AND wtr.start_time IS NOT NULL
      AND wtr.end_time IS NULL

    UNION ALL

    SELECT
      'missing_clock_in'::text,
      wtr.employee_id,
      wtr.record_date,
      wtr.id,
      jsonb_build_object(
        'start_time', wtr.start_time,
        'end_time', wtr.end_time
      )
    FROM public.work_time_records wtr
    WHERE wtr.tenant_id = p_tenant_id
      AND wtr.record_date >= v_month_start
      AND wtr.record_date < v_month_end
      AND wtr.start_time IS NULL
      AND wtr.end_time IS NOT NULL

    UNION ALL

    SELECT
      'time_reversed'::text,
      wtr.employee_id,
      wtr.record_date,
      wtr.id,
      jsonb_build_object(
        'start_time', wtr.start_time,
        'end_time', wtr.end_time,
        'seconds_delta', EXTRACT(EPOCH FROM (wtr.end_time - wtr.start_time))
      )
    FROM public.work_time_records wtr
    WHERE wtr.tenant_id = p_tenant_id
      AND wtr.record_date >= v_month_start
      AND wtr.record_date < v_month_end
      AND wtr.start_time IS NOT NULL
      AND wtr.end_time IS NOT NULL
      AND wtr.end_time < wtr.start_time
  ) x;
END;
$$;

COMMENT ON FUNCTION public.detect_timecard_anomalies(uuid, date) IS
  '指定月の打刻異常（出勤のみ・退勤のみ・時刻逆転）を列挙';

ALTER FUNCTION public.detect_timecard_anomalies(uuid, date) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.detect_timecard_anomalies(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_timecard_anomalies(uuid, date) TO authenticated;
