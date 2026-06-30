-- 36協定閾値超過アラートを closure_warnings に生成する（優先度7 CRITICAL）
-- 参照: docs/implementation-plan-hr-core-maintenance.md §4

-- resolved_at / resolved_by を追加（旧 overtime_alerts の解決運用を引き継ぐ）
ALTER TABLE public.closure_warnings
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_closure_warnings_unresolved
  ON public.closure_warnings(tenant_id)
  WHERE resolved_at IS NULL;

COMMENT ON COLUMN public.closure_warnings.resolved_at IS 'アラート解決日時（36協定警告の対応済みマーク）';
COMMENT ON COLUMN public.closure_warnings.resolved_by IS '解決操作を行った従業員ID';

-- 36協定閾値検出関数
CREATE OR REPLACE FUNCTION public.detect_overtime_threshold_warnings(
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
  v_emp record;
  v_ot_hours numeric;
  v_avg_hours numeric;
  v_month_count int;
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

  -- 再集計時の冪等性: 当該締めの36協定警告のみ削除
  DELETE FROM public.closure_warnings cw
  WHERE cw.closure_id = p_closure_id
    AND cw.tenant_id = p_tenant_id
    AND cw.warning_type IN (
      'overtime_45h_exceeded',
      'overtime_100h_critical',
      'overtime_avg80h_exceeded'
    );

  -- 当月の従業員別残業時間で 45h / 100h を判定
  FOR v_emp IN
    SELECT meo.employee_id, meo.total_overtime_hours
    FROM public.monthly_employee_overtime meo
    WHERE meo.closure_id = p_closure_id
      AND meo.tenant_id = p_tenant_id
  LOOP
    v_ot_hours := COALESCE(v_emp.total_overtime_hours, 0);

    IF v_ot_hours > 45 THEN
      INSERT INTO public.closure_warnings (
        tenant_id, closure_id, employee_id, warning_type, details
      ) VALUES (
        p_tenant_id,
        p_closure_id,
        v_emp.employee_id,
        'overtime_45h_exceeded',
        jsonb_build_object(
          'threshold_hours', 45,
          'actual_hours', v_ot_hours,
          'year_month', v_year_month
        )
      );
    END IF;

    IF v_ot_hours >= 100 THEN
      INSERT INTO public.closure_warnings (
        tenant_id, closure_id, employee_id, warning_type, details
      ) VALUES (
        p_tenant_id,
        p_closure_id,
        v_emp.employee_id,
        'overtime_100h_critical',
        jsonb_build_object(
          'threshold_hours', 100,
          'actual_hours', v_ot_hours,
          'year_month', v_year_month
        )
      );
    END IF;

    -- 直近6か月（締め済み・集計済みの月のみ）の平均残業時間
    SELECT
      ROUND(AVG(sub.total_overtime_hours)::numeric, 2),
      COUNT(*)::int
    INTO v_avg_hours, v_month_count
    FROM (
      SELECT meo2.total_overtime_hours
      FROM public.monthly_employee_overtime meo2
      INNER JOIN public.monthly_overtime_closures moc
        ON moc.id = meo2.closure_id
        AND moc.tenant_id = meo2.tenant_id
      WHERE meo2.tenant_id = p_tenant_id
        AND meo2.employee_id = v_emp.employee_id
        AND moc.aggregated_at IS NOT NULL
        AND moc.year_month <= v_year_month
      ORDER BY moc.year_month DESC
      LIMIT 6
    ) sub;

    IF v_month_count >= 2 AND v_avg_hours > 80 THEN
      INSERT INTO public.closure_warnings (
        tenant_id, closure_id, employee_id, warning_type, details
      ) VALUES (
        p_tenant_id,
        p_closure_id,
        v_emp.employee_id,
        'overtime_avg80h_exceeded',
        jsonb_build_object(
          'threshold_hours', 80,
          'actual_hours', v_avg_hours,
          'month_count', v_month_count,
          'year_month', v_year_month
        )
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.detect_overtime_threshold_warnings(uuid, uuid) IS
  '月次締め集計後に36協定閾値（45h/100h/6ヶ月平均80h）超過を closure_warnings に記録';

ALTER FUNCTION public.detect_overtime_threshold_warnings(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.detect_overtime_threshold_warnings(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_overtime_threshold_warnings(uuid, uuid) TO authenticated;

-- aggregate_monthly_closure の末尾で警告検出を呼び出す
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

  PERFORM public.detect_overtime_threshold_warnings(p_closure_id, p_tenant_id);
END;
$$;

COMMENT ON FUNCTION public.aggregate_monthly_closure(uuid, uuid) IS
  '締め対象月の勤怠・承認済残業申請を集計し monthly_employee_overtime を UPSERT、36協定警告を生成';
