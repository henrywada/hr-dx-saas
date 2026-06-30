-- C-C1: コンディション急激低下アラート（産業医・HR向け SECURITY DEFINER 関数）

CREATE OR REPLACE FUNCTION public.get_condition_drop_alerts(p_days INT DEFAULT 14)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  division_name TEXT,
  alert_type TEXT,
  recent_avg NUMERIC,
  prior_avg NUMERIC,
  consecutive_low_days INT,
  latest_score SMALLINT,
  latest_checkin_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_caller_role TEXT := current_employee_app_role();
  v_drop_threshold CONSTANT NUMERIC := 1.0;
  v_min_records CONSTANT INT := 3;
BEGIN
  IF v_tenant_id IS NULL OR NOT (
    v_caller_role = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc', 'developer'])
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH per_employee AS (
    SELECT cc.employee_id,
           ROUND(AVG(cc.score) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 7)::numeric, 2) AS recent_avg,
           ROUND(AVG(cc.score) FILTER (
             WHERE cc.checkin_date >= CURRENT_DATE - 14 AND cc.checkin_date < CURRENT_DATE - 7
           )::numeric, 2) AS prior_avg,
           COUNT(*) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 7) AS recent_count,
           COUNT(*) FILTER (
             WHERE cc.checkin_date >= CURRENT_DATE - 14 AND cc.checkin_date < CURRENT_DATE - 7
           ) AS prior_count,
           (
             SELECT cc2.score FROM public.condition_checkins cc2
             WHERE cc2.employee_id = cc.employee_id
             ORDER BY cc2.checkin_date DESC LIMIT 1
           ) AS latest_score,
           (
             SELECT cc2.checkin_date FROM public.condition_checkins cc2
             WHERE cc2.employee_id = cc.employee_id
             ORDER BY cc2.checkin_date DESC LIMIT 1
           ) AS latest_checkin_date
    FROM public.condition_checkins cc
    JOIN public.employees e ON e.id = cc.employee_id
    WHERE e.tenant_id = v_tenant_id
      AND cc.checkin_date >= (CURRENT_DATE - p_days)
    GROUP BY cc.employee_id
  ),
  streaks AS (
    SELECT cc.employee_id,
           MAX(streak_len)::int AS consecutive_low_days
    FROM (
      SELECT cc.employee_id,
             COUNT(*)::int AS streak_len
      FROM (
        SELECT cc.employee_id,
               cc.checkin_date,
               cc.checkin_date - (ROW_NUMBER() OVER (PARTITION BY cc.employee_id ORDER BY cc.checkin_date))::int AS grp
        FROM public.condition_checkins cc
        JOIN public.employees e ON e.id = cc.employee_id
        WHERE e.tenant_id = v_tenant_id
          AND cc.checkin_date >= CURRENT_DATE - 14
          AND cc.score <= 2
      ) grouped
      GROUP BY employee_id, grp
    ) cc
    GROUP BY cc.employee_id
  )
  SELECT e.id,
         e.name,
         COALESCE(d.name, '未配属'),
         CASE
           WHEN pe.recent_avg IS NOT NULL AND pe.prior_avg IS NOT NULL
             AND pe.recent_count >= v_min_records AND pe.prior_count >= v_min_records
             AND (pe.prior_avg - pe.recent_avg) >= v_drop_threshold THEN 'week_drop'
           WHEN COALESCE(st.consecutive_low_days, 0) >= 3 THEN 'consecutive_low'
         END,
         pe.recent_avg,
         pe.prior_avg,
         COALESCE(st.consecutive_low_days, 0),
         pe.latest_score::smallint,
         pe.latest_checkin_date
  FROM per_employee pe
  JOIN public.employees e ON e.id = pe.employee_id
  LEFT JOIN public.divisions d ON d.id = e.division_id
  LEFT JOIN streaks st ON st.employee_id = pe.employee_id
  WHERE (
    pe.recent_avg IS NOT NULL AND pe.prior_avg IS NOT NULL
      AND pe.recent_count >= v_min_records AND pe.prior_count >= v_min_records
      AND (pe.prior_avg - pe.recent_avg) >= v_drop_threshold
  ) OR COALESCE(st.consecutive_low_days, 0) >= 3
  ORDER BY pe.latest_checkin_date DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_condition_drop_alerts(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_condition_drop_alerts(INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_employee_condition_drop_alert(p_employee_id UUID)
RETURNS TABLE (
  alert_type TEXT,
  recent_avg NUMERIC,
  prior_avg NUMERIC,
  consecutive_low_days INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_drop_threshold CONSTANT NUMERIC := 1.0;
  v_min_records CONSTANT INT := 3;
  v_consecutive INT := 0;
  v_recent_avg NUMERIC;
  v_prior_avg NUMERIC;
  v_recent_count BIGINT;
  v_prior_count BIGINT;
BEGIN
  IF v_tenant_id IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e WHERE e.id = p_employee_id AND e.tenant_id = v_tenant_id
  ) THEN RETURN; END IF;

  SELECT
    ROUND(AVG(cc.score) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 7)::numeric, 2),
    ROUND(AVG(cc.score) FILTER (
      WHERE cc.checkin_date >= CURRENT_DATE - 14 AND cc.checkin_date < CURRENT_DATE - 7
    )::numeric, 2),
    COUNT(*) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 7),
    COUNT(*) FILTER (WHERE cc.checkin_date >= CURRENT_DATE - 14 AND cc.checkin_date < CURRENT_DATE - 7)
  INTO v_recent_avg, v_prior_avg, v_recent_count, v_prior_count
  FROM public.condition_checkins cc
  WHERE cc.employee_id = p_employee_id AND cc.checkin_date >= CURRENT_DATE - 14;

  SELECT COALESCE(MAX(cnt), 0)::int INTO v_consecutive
  FROM (
    SELECT COUNT(*)::int AS cnt
    FROM (
      SELECT cc.checkin_date - (ROW_NUMBER() OVER (ORDER BY cc.checkin_date))::int AS grp
      FROM public.condition_checkins cc
      WHERE cc.employee_id = p_employee_id
        AND cc.checkin_date >= CURRENT_DATE - 14
        AND cc.score <= 2
    ) g
    GROUP BY grp
  ) s;

  IF v_recent_avg IS NOT NULL AND v_prior_avg IS NOT NULL
     AND v_recent_count >= v_min_records AND v_prior_count >= v_min_records
     AND (v_prior_avg - v_recent_avg) >= v_drop_threshold THEN
    RETURN QUERY SELECT 'week_drop'::text, v_recent_avg, v_prior_avg, v_consecutive;
    RETURN;
  END IF;

  IF v_consecutive >= 3 THEN
    RETURN QUERY SELECT 'consecutive_low'::text, v_recent_avg, v_prior_avg, v_consecutive;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_employee_condition_drop_alert(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_employee_condition_drop_alert(UUID) TO authenticated;
