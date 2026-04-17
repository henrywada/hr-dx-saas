


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") IS '締め対象月の勤怠・承認済残業申請を集計し monthly_employee_overtime を UPSERT';



CREATE OR REPLACE FUNCTION "public"."check_max_employees"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_count integer;
  v_max_employees integer;
  v_tenant_name   text;
BEGIN
  -- テナントの上限値とテナント名を取得
  SELECT t.max_employees, t.name
    INTO v_max_employees, v_tenant_name
    FROM public.tenants t
   WHERE t.id = NEW.tenant_id;

  -- テナントが見つからない場合はそのまま通す（FK制約で別途エラーになる）
  IF v_max_employees IS NULL THEN
    RETURN NEW;
  END IF;

  -- 現在の従業員数をカウント
  SELECT COUNT(*)
    INTO v_current_count
    FROM public.employees e
   WHERE e.tenant_id = NEW.tenant_id;

  -- 上限チェック
  IF v_current_count >= v_max_employees THEN
    RAISE EXCEPTION '従業員登録上限に達しました。テナント「%」の上限は %名です。（現在: %名）プランのアップグレードをご検討ください。',
      v_tenant_name, v_max_employees, v_current_count;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_max_employees"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_max_employees"() IS 'employees INSERT前にテナントのmax_employees上限をチェック';



CREATE OR REPLACE FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token,
    is_super_admin, raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    p_email, v_encrypted_password,
    NOW(), NOW(), NOW(),
    '', '', '', '', '', '', '', '',
    false,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb
  );
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
  VALUES (gen_random_uuid(), v_user_id, p_email,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'provider', 'email'),
    'email', NOW(), NOW(), NOW());
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_employee_app_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ar.app_role
  FROM public.employees e
  JOIN public.app_role ar ON ar.id = e.app_role_id
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;


ALTER FUNCTION "public"."current_employee_app_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_employee_app_role"() IS 'ログインユーザーの app_role テキスト値を返す';



CREATE OR REPLACE FUNCTION "public"."current_employee_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT e.id
  FROM public.employees e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$$;


ALTER FUNCTION "public"."current_employee_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_employee_id"() IS 'ログインユーザーに紐づく employees.id を返す';



CREATE OR REPLACE FUNCTION "public"."current_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select e.tenant_id
  from public.employees e
  where e.user_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
BEGIN
  DELETE FROM public.employees WHERE user_id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") RETURNS TABLE("anomaly_type" "text", "employee_id" "uuid", "record_date" "date", "work_time_record_id" "uuid", "details" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") IS '指定月の打刻異常（出勤のみ・退勤のみ・時刻逆転）を列挙';



CREATE OR REPLACE FUNCTION "public"."fn_supervisor_qr_permission_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid", "p_audit_action" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_before jsonb;
  v_row public.supervisor_qr_permissions%ROWTYPE;
  v_scope text;
BEGIN
  IF p_audit_action IS NULL OR p_audit_action NOT IN ('grant', 'revoke') THEN
    RAISE EXCEPTION 'invalid_audit_action';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_supervisor_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'supervisor_not_in_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_employee_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'employee_not_in_tenant';
  END IF;

  SELECT to_jsonb(s.*) INTO v_before
  FROM public.supervisor_qr_permissions s
  WHERE s.tenant_id = p_tenant_id
    AND s.supervisor_user_id = p_supervisor_user_id
    AND s.employee_user_id = p_employee_user_id
  LIMIT 1;

  v_scope := CASE
    WHEN p_scope IS NULL THEN NULL
    ELSE NULLIF(TRIM(p_scope), '')
  END;

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    p_tenant_id,
    p_supervisor_user_id,
    p_employee_user_id,
    p_can_display,
    v_scope
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = EXCLUDED.can_display,
    scope = COALESCE(EXCLUDED.scope, supervisor_qr_permissions.scope),
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.qr_audit_logs (
    tenant_id,
    related_table,
    related_id,
    action,
    actor_user_id,
    payload
  )
  VALUES (
    p_tenant_id,
    'supervisor_qr_permissions',
    v_row.id,
    p_audit_action,
    p_actor_user_id,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_supervisor_qr_permission_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid", "p_audit_action" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_supervisor_qr_permission_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid", "p_audit_action" "text") IS 'QR 監督者権限の upsert と監査ログを原子的に記録（Edge Functions の service_role のみ実行想定）';



CREATE OR REPLACE FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_before jsonb;
  v_row public.supervisor_qr_permissions%ROWTYPE;
  v_scope text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_supervisor_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'supervisor_not_in_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_employee_user_id AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'employee_not_in_tenant';
  END IF;

  SELECT to_jsonb(s.*) INTO v_before
  FROM public.supervisor_qr_permissions s
  WHERE s.tenant_id = p_tenant_id
    AND s.supervisor_user_id = p_supervisor_user_id
    AND s.employee_user_id = p_employee_user_id
  LIMIT 1;

  v_scope := CASE
    WHEN p_scope IS NULL OR TRIM(COALESCE(p_scope, '')) = '' THEN 'qr_display'
    ELSE TRIM(p_scope)
  END;

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    p_tenant_id,
    p_supervisor_user_id,
    p_employee_user_id,
    p_can_display,
    v_scope
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = EXCLUDED.can_display,
    scope = COALESCE(EXCLUDED.scope, supervisor_qr_permissions.scope),
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.qr_audit_logs (
    tenant_id,
    related_table,
    related_id,
    action,
    actor_user_id,
    payload
  )
  VALUES (
    p_tenant_id,
    'supervisor_qr_permissions',
    v_row.id,
    'bulk_grant',
    p_actor_user_id,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") IS '人事向け CSV 一括: QR 監督者権限の upsert と監査ログ bulk_grant（Edge service_role のみ）';



CREATE OR REPLACE FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant uuid;
  v_supervisor uuid;
  v_before jsonb;
  v_row public.supervisor_qr_permissions%ROWTYPE;
BEGIN
  v_supervisor := auth.uid();
  IF v_supervisor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found_for_user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = v_supervisor AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'supervisor_not_in_tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = p_employee_user_id AND e.tenant_id = v_tenant
  ) THEN
    RAISE EXCEPTION 'employee_not_in_tenant';
  END IF;

  SELECT to_jsonb(s.*) INTO v_before
  FROM public.supervisor_qr_permissions s
  WHERE s.tenant_id = v_tenant
    AND s.supervisor_user_id = v_supervisor
    AND s.employee_user_id = p_employee_user_id
  LIMIT 1;

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    v_tenant,
    v_supervisor,
    p_employee_user_id,
    true,
    'all'
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = true,
    scope = COALESCE(EXCLUDED.scope, supervisor_qr_permissions.scope),
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.qr_audit_logs (
    tenant_id,
    related_table,
    related_id,
    action,
    actor_user_id,
    payload
  )
  VALUES (
    v_tenant,
    'supervisor_qr_permissions',
    v_row.id,
    'grant',
    v_supervisor,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") IS 'ログイン監督者が同一テナント従業員（本人含む）への QR 表示許可を付与（scope=all 固定・監査ログ付き）。';



CREATE OR REPLACE FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant uuid;
  v_supervisor uuid;
  v_before jsonb;
  v_existing public.supervisor_qr_permissions%ROWTYPE;
  v_row public.supervisor_qr_permissions%ROWTYPE;
BEGIN
  v_supervisor := auth.uid();
  IF v_supervisor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_found_for_user';
  END IF;

  SELECT * INTO v_existing
  FROM public.supervisor_qr_permissions s
  WHERE s.id = p_permission_id
    AND s.tenant_id = v_tenant
    AND s.supervisor_user_id = v_supervisor;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found_or_forbidden';
  END IF;

  v_before := to_jsonb(v_existing);

  INSERT INTO public.supervisor_qr_permissions (
    tenant_id,
    supervisor_user_id,
    employee_user_id,
    can_display,
    scope
  )
  VALUES (
    v_tenant,
    v_supervisor,
    v_existing.employee_user_id,
    false,
    v_existing.scope
  )
  ON CONFLICT (tenant_id, supervisor_user_id, employee_user_id)
  DO UPDATE SET
    can_display = false,
    scope = COALESCE(EXCLUDED.scope, supervisor_qr_permissions.scope),
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.qr_audit_logs (
    tenant_id,
    related_table,
    related_id,
    action,
    actor_user_id,
    payload
  )
  VALUES (
    v_tenant,
    'supervisor_qr_permissions',
    v_row.id,
    'revoke',
    v_supervisor,
    jsonb_build_object('before', v_before, 'after', to_jsonb(v_row))
  );

  RETURN to_jsonb(v_row);
END;
$$;


ALTER FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") IS 'ログイン監督者が自分の権限行を取り消し（can_display=false + 監査）。ブラウザ用。';



CREATE OR REPLACE FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer DEFAULT 168) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
DECLARE v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE auth.users SET recovery_token = v_token, recovery_sent_at = NOW() WHERE id = p_user_id;
  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") RETURNS TABLE("employee_id" "uuid", "employee_name" "text", "department_name" "text", "total_overtime_hours" numeric, "monthly_limit" numeric, "usage_rate" numeric, "risk_level" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") IS '指定月の残業上限に対する社員別リスク（テナントの overtime_settings を反映）';



CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") RETURNS TABLE("department_id" "uuid", "department_name" "text", "employee_count" bigint, "avg_overtime" numeric, "max_overtime" numeric, "violation_count" bigint, "warning_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") IS '指定月の部署（組織）別残業集計（月次社員別集計テーブル基準）';



CREATE OR REPLACE FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") RETURNS TABLE("employee_id" "uuid", "employee_name" "text", "approved_hours" numeric, "actual_hours" numeric, "gap_hours" numeric, "gap_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") IS '指定月の承認済残業と実績の乖離（申請漏れ・申請超過の簡易分類）';



CREATE OR REPLACE FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date" DEFAULT (("now"() - '1 year'::interval))::"date", "p_end_date" "date" DEFAULT ("now"())::"date") RETURNS TABLE("year_month" "date", "avg_overtime" numeric, "max_overtime" numeric, "total_employees" bigint, "violation_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS '指定期間のテナント別残業トレンド（月次集計）';



CREATE OR REPLACE FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
  SELECT u.email
  FROM auth.users u
  WHERE u.id = p_user_id
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.tenant_id = p_tenant_id
        AND e.user_id = p_user_id
    );
$$;


ALTER FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") RETURNS TABLE("year_month" "date", "row_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") IS 'work_time_records を暦月で集計した件数一覧（テナント指定・SECURITY DEFINER）';



CREATE OR REPLACE FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer DEFAULT 8) RETURNS TABLE("id" "uuid", "document_id" "uuid", "chunk_index" integer, "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    c.id,
    c.document_id,
    c.chunk_index,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::double precision AS similarity
  FROM public.tenant_rag_chunks c
  WHERE c.tenant_id = public.rag_session_tenant_id()
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;


ALTER FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer) IS '同一テナントのナレッジチャンクをコサイン距離で検索';



CREATE OR REPLACE FUNCTION "public"."rag_session_tenant_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  v_employee uuid;
  t text;
BEGIN
  SELECT public.current_tenant_id() INTO v_employee;
  IF v_employee IS NOT NULL THEN
    RETURN v_employee;
  END IF;

  SELECT trim(
    COALESCE(
      raw_user_meta_data->>'tenant_id',
      raw_app_meta_data->>'tenant_id'
    )
  )
  INTO t
  FROM auth.users
  WHERE id = auth.uid();

  IF t IS NULL OR t = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN t::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;
END;
$$;


ALTER FUNCTION "public"."rag_session_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rag_session_tenant_id"() IS 'RAG 用: employees 由来のテナント、なければ auth.users の tenant_id メタデータ';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") RETURNS TABLE("inserted_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_inserted int := 0;
BEGIN
  -- サービス割当の存在確認と tenant_id 取得
  SELECT tenant_id INTO v_tenant_id
  FROM public.service_assignments
  WHERE id = p_service_assignment_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'service_assignment not found: %', p_service_assignment_id;
  END IF;

  -- current_tenant_id と一致するか検証（マルチテナント分離）
  IF v_tenant_id != public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant_id mismatch';
  END IF;

  -- 対象従業員（app_role が test, developer, company_doctor 以外）のうち
  -- 未登録のものを INSERT
  WITH eligible_employees AS (
    SELECT e.id AS employee_id
    FROM public.employees e
    JOIN public.app_role ar ON ar.id = e.app_role_id
    WHERE e.tenant_id = v_tenant_id
      AND ar.app_role IS NOT NULL
      AND ar.app_role NOT IN ('test', 'developer', 'company_doctor')
  ),
  existing AS (
    SELECT employee_id
    FROM public.service_assignments_users
    WHERE service_assignment_id = p_service_assignment_id
  ),
  to_insert AS (
    SELECT ee.employee_id
    FROM eligible_employees ee
    WHERE ee.employee_id NOT IN (SELECT employee_id FROM existing)
  )
  INSERT INTO public.service_assignments_users (tenant_id, service_assignment_id, employee_id, is_available)
  SELECT v_tenant_id, p_service_assignment_id, ti.employee_id, true
  FROM to_insert ti;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_inserted;
END;
$$;


ALTER FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") IS 'サービス割当の対象ユーザーを同期（test/developer/company_doctor 以外の従業員を未登録分のみ追加）';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      recovery_token = '', updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant uuid;
  v_id uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'テナントを特定できません（従業員との紐付けを確認してください）';
  END IF;

  INSERT INTO public.overtime_settings (
    tenant_id,
    monthly_limit_hours,
    monthly_warning_hours,
    annual_limit_hours,
    average_limit_hours
  ) VALUES (
    v_tenant,
    p_monthly_limit_hours,
    p_monthly_warning_hours,
    p_annual_limit_hours,
    p_average_limit_hours
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    monthly_limit_hours = EXCLUDED.monthly_limit_hours,
    monthly_warning_hours = EXCLUDED.monthly_warning_hours,
    annual_limit_hours = EXCLUDED.annual_limit_hours,
    average_limit_hours = EXCLUDED.average_limit_hours,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) IS 'ログインユーザーの current_tenant_id に対応する overtime_settings を upsert';



CREATE OR REPLACE FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant uuid;
  v_out uuid;
BEGIN
  v_tenant := public.current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'テナントを特定できません（従業員との紐付けを確認してください）';
  END IF;

  INSERT INTO public.tenant_portal_settings (
    tenant_id,
    hr_inquiry_email
  ) VALUES (
    v_tenant,
    NULLIF(trim(COALESCE(p_hr_inquiry_email, '')), '')
  )
  ON CONFLICT (tenant_id) DO UPDATE SET
    hr_inquiry_email = EXCLUDED.hr_inquiry_email,
    updated_at = now()
  RETURNING tenant_id INTO v_out;

  RETURN v_out;
END;
$$;


ALTER FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") IS 'ログインユーザーの current_tenant_id に対応する tenant_portal_settings を upsert';



CREATE OR REPLACE FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer DEFAULT 336) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
DECLARE v_user_id UUID; v_stored_token TEXT; v_sent_at TIMESTAMPTZ;
BEGIN
  SELECT id, recovery_token, recovery_sent_at INTO v_user_id, v_stored_token, v_sent_at
  FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'ユーザーが見つかりません'; END IF;
  IF v_stored_token IS NULL OR v_stored_token = '' THEN RAISE EXCEPTION 'リカバリートークンが設定されていません'; END IF;
  IF v_sent_at IS NULL OR v_sent_at + (p_expiry_hours || ' hours')::interval < NOW() THEN RAISE EXCEPTION 'トークンの有効期限が切れています'; END IF;
  IF v_stored_token != p_token THEN RAISE EXCEPTION 'トークンが一致しません'; END IF;
  UPDATE auth.users SET recovery_token = '', recovery_sent_at = NULL WHERE id = v_user_id;
  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "path" "text" NOT NULL,
    "method" "text",
    "ip_address" "text",
    "user_agent" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."access_logs" IS 'アクセス履歴・監査ログ（Middleware + writeAuditLog から記録）';



CREATE TABLE IF NOT EXISTS "public"."ai_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "feature_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_new" boolean DEFAULT true NOT NULL,
    "target_audience" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


COMMENT ON TABLE "public"."announcements" IS '人事からのお知らせ（テナント単位）';



COMMENT ON COLUMN "public"."announcements"."is_new" IS 'NEW バッジ表示するか';



COMMENT ON COLUMN "public"."announcements"."target_audience" IS '対象（例: 全社員対象）';



CREATE TABLE IF NOT EXISTS "public"."app_role" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_role" "text",
    "name" "text"
);


ALTER TABLE "public"."app_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_role_service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "app_role_id" "uuid",
    "service_id" "uuid"
);


ALTER TABLE "public"."app_role_service" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_pulses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "candidate_name" "text" NOT NULL,
    "selection_step" "text",
    "sentiment_score" integer,
    "concerns" "text"[] DEFAULT '{}'::"text"[],
    "comment" "text",
    "is_answered" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "template_id" "uuid",
    CONSTRAINT "candidate_pulses_sentiment_score_check" CHECK ((("sentiment_score" >= 1) AND ("sentiment_score" <= 5)))
);


ALTER TABLE "public"."candidate_pulses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closure_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "closure_id" "uuid",
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "target" "jsonb",
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."closure_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."closure_warnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "closure_id" "uuid",
    "employee_id" "uuid",
    "warning_type" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."closure_warnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text",
    "parent_id" "uuid",
    "layer" integer,
    "code" "text"
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."doctor_availability_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "doctor_id" "uuid" NOT NULL,
    "day_of_week" smallint,
    "specific_date" "date",
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_slot_type" CHECK (((("day_of_week" IS NOT NULL) AND ("specific_date" IS NULL)) OR (("day_of_week" IS NULL) AND ("specific_date" IS NOT NULL)))),
    CONSTRAINT "chk_time_range" CHECK (("end_time" > "start_time")),
    CONSTRAINT "doctor_availability_slots_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."doctor_availability_slots" OWNER TO "postgres";


COMMENT ON TABLE "public"."doctor_availability_slots" IS '産業医・保健師の稼働日時スロット（面談予約制約用）';



COMMENT ON COLUMN "public"."doctor_availability_slots"."doctor_id" IS '産業医・保健師の employee_id';



COMMENT ON COLUMN "public"."doctor_availability_slots"."day_of_week" IS '曜日（0=日, 1=月, ..., 6=土）。繰り返しスロット時のみ使用';



COMMENT ON COLUMN "public"."doctor_availability_slots"."specific_date" IS '特定日。日付指定スロット時のみ使用';



COMMENT ON COLUMN "public"."doctor_availability_slots"."start_time" IS '稼働開始時刻';



COMMENT ON COLUMN "public"."doctor_availability_slots"."end_time" IS '稼働終了時刻';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "division_id" "uuid",
    "active_status" "text",
    "name" "text",
    "is_manager" boolean,
    "app_role_id" "uuid",
    "employee_no" "text",
    "job_title" "text",
    "sex" "text",
    "start_date" "date",
    "is_contacted_person" boolean,
    "contacted_date" "date",
    "user_id" "uuid"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."health_assessments_link" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "assessment_type" "text" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "score" numeric,
    "taken_at" "date"
);


ALTER TABLE "public"."health_assessments_link" OWNER TO "postgres";


COMMENT ON TABLE "public"."health_assessments_link" IS '健康評価（ストレスチェック等）との外部連携用リンク（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."interventions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "intervention_type" "text" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'open'::"text",
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "extra" "jsonb"
);


ALTER TABLE "public"."interventions" OWNER TO "postgres";


COMMENT ON TABLE "public"."interventions" IS '産業医面談等の介入記録（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."job_postings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "title" "text",
    "raw_memo" "text",
    "description" "text",
    "employment_type" "text",
    "salary_min" integer,
    "salary_max" integer,
    "salary_unit" "text",
    "postal_code" "text",
    "address_region" "text",
    "address_locality" "text",
    "street_address" "text",
    "published_at" timestamp with time zone,
    "valid_through" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_postings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_employee_overtime" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "closure_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "year_month" "date" NOT NULL,
    "total_work_hours" numeric(7,2) DEFAULT 0,
    "total_overtime_hours" numeric(7,2) DEFAULT 0,
    "approved_overtime_hours" numeric(7,2),
    "corrections_summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."monthly_employee_overtime" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."monthly_overtime_closures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "year_month" "date" NOT NULL,
    "closed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'open'::"text",
    "closed_by" "uuid",
    "approved_by" "uuid",
    "locked_by" "uuid",
    "lock_reason" "text",
    "aggregated_at" timestamp with time zone,
    "aggregate_version" integer DEFAULT 1
);


ALTER TABLE "public"."monthly_overtime_closures" OWNER TO "postgres";


COMMENT ON TABLE "public"."monthly_overtime_closures" IS '残業関連の月次締め（テナント単位・月1行）';



COMMENT ON COLUMN "public"."monthly_overtime_closures"."year_month" IS '対象月（その月の1日を格納）';



CREATE TABLE IF NOT EXISTS "public"."myou_alert_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "target_serials" "text"[],
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_alert_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."myou_companies" (
    "company_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_name" "text" NOT NULL,
    "email_address" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."myou_delivery_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "serial_number" "text",
    "company_id" "uuid",
    "delivery_date" timestamp with time zone DEFAULT "now"(),
    "scanned_by" "uuid",
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_delivery_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."myou_products" (
    "serial_number" "text" NOT NULL,
    "expiration_date" "date" NOT NULL,
    "product_name" "text" DEFAULT 'セルフィールMS'::"text",
    "status" "text" DEFAULT 'shipped'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."overtime_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "alert_type" "text" NOT NULL,
    "alert_value" "jsonb",
    "triggered_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."overtime_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_alerts" IS '残業関連アラート（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."overtime_analysis_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "year_month" "date" NOT NULL,
    "total_overtime_hours" numeric(7,2) NOT NULL,
    "legal_limit_hours" numeric(7,2) NOT NULL,
    "is_exceeded" boolean NOT NULL,
    "analysis_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."overtime_analysis_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_analysis_results" IS '36協定等との比較・分析結果（テナント単位・月1行）';



CREATE TABLE IF NOT EXISTS "public"."overtime_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "overtime_start" timestamp with time zone NOT NULL,
    "overtime_end" timestamp with time zone NOT NULL,
    "requested_hours" numeric(5,2) NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT '申請中'::"text" NOT NULL,
    "supervisor_id" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "supervisor_comment" "text",
    CONSTRAINT "overtime_applications_status_check" CHECK (("status" = ANY (ARRAY['申請中'::"text", '承認済'::"text", '却下'::"text", '修正依頼'::"text"]))),
    CONSTRAINT "overtime_applications_time_order" CHECK (("overtime_end" > "overtime_start"))
);


ALTER TABLE "public"."overtime_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_applications" IS '残業申請（テナント単位）';



COMMENT ON COLUMN "public"."overtime_applications"."supervisor_comment" IS '承認者が入力したコメント（承認・却下・修正依頼）';



CREATE TABLE IF NOT EXISTS "public"."overtime_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "corrected_hours" numeric(5,2) NOT NULL,
    "correction_reason" "text",
    "corrected_by" "uuid" NOT NULL,
    "corrected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."overtime_corrections" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_corrections" IS '残業申請の修正履歴（テナントは親申請に従う）';



CREATE TABLE IF NOT EXISTS "public"."overtime_monthly_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "period_month" "date" NOT NULL,
    "overtime_minutes" integer NOT NULL,
    "holiday_minutes" integer NOT NULL,
    "total_minutes" integer NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."overtime_monthly_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_monthly_stats" IS '残業等の月次集計（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."overtime_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "monthly_limit_hours" integer DEFAULT 45 NOT NULL,
    "monthly_warning_hours" integer DEFAULT 40 NOT NULL,
    "annual_limit_hours" integer DEFAULT 360 NOT NULL,
    "average_limit_hours" integer DEFAULT 80 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."overtime_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."overtime_settings" IS 'テナント単位の残業閾値（月間上限・警告・年間・2-6ヶ月平均）';



COMMENT ON COLUMN "public"."overtime_settings"."monthly_limit_hours" IS '月間上限（時間）';



COMMENT ON COLUMN "public"."overtime_settings"."monthly_warning_hours" IS '警告を出す時間（月間・時間）';



COMMENT ON COLUMN "public"."overtime_settings"."annual_limit_hours" IS '年間上限（時間）';



COMMENT ON COLUMN "public"."overtime_settings"."average_limit_hours" IS '2-6ヶ月平均上限（時間）';



CREATE TABLE IF NOT EXISTS "public"."program_targets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "program_type" "text" NOT NULL,
    "program_instance_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "is_eligible" boolean DEFAULT true NOT NULL,
    "exclusion_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "program_targets_program_type_check" CHECK (("program_type" = ANY (ARRAY['stress_check'::"text", 'pulse_survey'::"text", 'survey'::"text", 'e_learning'::"text"])))
);


ALTER TABLE "public"."program_targets" OWNER TO "postgres";


COMMENT ON TABLE "public"."program_targets" IS '実施対象者マスタ（ストレスチェック・パルスサーベイ・アンケート・eラーニング等で共通利用）';



COMMENT ON COLUMN "public"."program_targets"."program_type" IS 'プログラム種別: stress_check, pulse_survey, survey, e_learning';



COMMENT ON COLUMN "public"."program_targets"."program_instance_id" IS '実施枠ID（stress_check→stress_check_periods.id, pulse_survey→pulse_survey_periods.id 等）';



COMMENT ON COLUMN "public"."program_targets"."is_eligible" IS 'true=対象, false=除外';



COMMENT ON COLUMN "public"."program_targets"."exclusion_reason" IS '除外理由（任意、監査・説明用）';



CREATE TABLE IF NOT EXISTS "public"."pulse_survey_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "survey_period" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "deadline_date" "date" NOT NULL,
    "link_path" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_survey_periods" OWNER TO "postgres";


COMMENT ON TABLE "public"."pulse_survey_periods" IS '月次パルス調査の期間・期限・トップの重要タスク表示用';



COMMENT ON COLUMN "public"."pulse_survey_periods"."survey_period" IS '期間キー（例: 2026-02）';



COMMENT ON COLUMN "public"."pulse_survey_periods"."link_path" IS '「今すぐ回答する」のリンク先（例: /survey/answer）';



CREATE TABLE IF NOT EXISTS "public"."pulse_survey_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "answer_type" "text" DEFAULT 'rating'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_survey_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."pulse_survey_questions" IS 'パルスサーベイ: 質問マスタ';



CREATE TABLE IF NOT EXISTS "public"."pulse_survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "survey_period" "text" NOT NULL,
    "score" integer,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pulse_survey_responses_score_check" CHECK ((("score" >= 1) AND ("score" <= 5)))
);


ALTER TABLE "public"."pulse_survey_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."pulse_survey_responses" IS 'パルスサーベイ: 従業員の回答データ';



CREATE TABLE IF NOT EXISTS "public"."pulse_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "question_1_text" "text" DEFAULT '1. 今のお気持ちを5段階で教えてください'::"text" NOT NULL,
    "question_2_text" "text" DEFAULT '2. 懸念点やもっと知りたいことがあれば選択してください（複数選択可）'::"text" NOT NULL,
    "question_3_text" "text" DEFAULT '3. その他、自由にご記入ください'::"text",
    "concerns_list" "text"[] DEFAULT ARRAY['給与・待遇について'::"text", '業務内容について'::"text", '働き方（リモート/残業）について'::"text", '評価制度について'::"text", '社員の雰囲気について'::"text", 'その他'::"text"] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pulse_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "related_table" "text" NOT NULL,
    "related_id" "uuid",
    "action" "text" NOT NULL,
    "actor_user_id" "uuid",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."qr_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."qr_audit_logs" IS 'QR 打刻まわりの監査ログ';



CREATE TABLE IF NOT EXISTS "public"."qr_session_scans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "employee_user_id" "uuid" NOT NULL,
    "scanned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "device_info" "jsonb",
    "location" "jsonb",
    "proximity" "jsonb",
    "photo_url" "text",
    "photo_hash" "text",
    "supervisor_confirmed" boolean DEFAULT false,
    "confirm_method" "text",
    "result" "text" DEFAULT 'pending'::"text",
    "audit" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."qr_session_scans" OWNER TO "postgres";


COMMENT ON TABLE "public"."qr_session_scans" IS 'QR スキャン1件ごとの記録（デバイス・位置・承認結果）';



CREATE TABLE IF NOT EXISTS "public"."qr_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "supervisor_user_id" "uuid" NOT NULL,
    "purpose" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "nonce" "text" NOT NULL,
    "code" "text",
    "max_uses" integer DEFAULT 1 NOT NULL,
    "uses" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."qr_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."qr_sessions" IS 'QR 打刻用セッション（監督者が発行、purpose は punch_in / punch_out 等）';



COMMENT ON COLUMN "public"."qr_sessions"."metadata" IS '現場IDなど任意データ';



CREATE TABLE IF NOT EXISTS "public"."questionnaire_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "response_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "item_id" "uuid",
    "option_id" "uuid",
    "text_answer" "text",
    "score" integer
);


ALTER TABLE "public"."questionnaire_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "questionnaire_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "deadline_date" "date",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."questionnaire_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_question_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "item_text" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."questionnaire_question_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_question_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."questionnaire_question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "questionnaire_id" "uuid" NOT NULL,
    "section_id" "uuid",
    "question_type" "text" NOT NULL,
    "question_text" "text" NOT NULL,
    "scale_labels" "jsonb",
    "is_required" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "questionnaire_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['radio'::"text", 'checkbox'::"text", 'rating_table'::"text", 'text'::"text"])))
);


ALTER TABLE "public"."questionnaire_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "questionnaire_id" "uuid" NOT NULL,
    "assignment_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone
);


ALTER TABLE "public"."questionnaire_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "questionnaire_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."questionnaire_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaires" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_type" "text" NOT NULL,
    "tenant_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "questionnaires_creator_type_check" CHECK (("creator_type" = ANY (ARRAY['system'::"text", 'tenant'::"text"]))),
    CONSTRAINT "questionnaires_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text"]))),
    CONSTRAINT "questionnaires_tenant_check" CHECK (((("creator_type" = 'system'::"text") AND ("tenant_id" IS NULL)) OR (("creator_type" = 'tenant'::"text") AND ("tenant_id" IS NOT NULL))))
);


ALTER TABLE "public"."questionnaires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recruitment_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "department" "text",
    "employment_type" "text" DEFAULT '正社員'::"text",
    "description" "text",
    "requirements" "text",
    "salary_min" integer,
    "salary_max" integer,
    "location" "text",
    "status" "text" DEFAULT '下書き'::"text" NOT NULL,
    "ai_catchphrase" "text",
    "ai_scout_text" "text",
    "ai_interview_guide" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "media_advice" "text"
);


ALTER TABLE "public"."recruitment_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."recruitment_jobs" IS 'TalentDraft AI: 採用求人管理テーブル';



COMMENT ON COLUMN "public"."recruitment_jobs"."status" IS '求人ステータス (下書き / 公開 / 締切 / アーカイブ)';



COMMENT ON COLUMN "public"."recruitment_jobs"."ai_catchphrase" IS 'AI生成キャッチコピー (全プラン利用可)';



COMMENT ON COLUMN "public"."recruitment_jobs"."ai_scout_text" IS 'AI生成スカウト文 (Pro以上)';



COMMENT ON COLUMN "public"."recruitment_jobs"."ai_interview_guide" IS 'AI生成面接ガイド (Pro以上)';



CREATE TABLE IF NOT EXISTS "public"."service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_category_id" "uuid",
    "name" "text",
    "category" "text",
    "title" "text",
    "description" "text",
    "sort_order" integer,
    "route_path" "text",
    "app_role_group_id" "uuid",
    "app_role_group_uuid" "uuid",
    "target_audience" "text",
    "release_status" "text"
);


ALTER TABLE "public"."service" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_assignments" IS 'サービスの親定義（テナント単位）';



COMMENT ON COLUMN "public"."service_assignments"."service_type" IS 'サービス種別（例: pulse_survey, stress_check）';



CREATE TABLE IF NOT EXISTS "public"."service_assignments_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "service_assignment_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_assignments_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_assignments_users" IS 'サービス対象ユーザー紐付け';



COMMENT ON COLUMN "public"."service_assignments_users"."is_available" IS '有効/無効フラグ';



CREATE TABLE IF NOT EXISTS "public"."service_category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sort_order" integer,
    "name" "text",
    "description" "text",
    "release_status" "text"
);


ALTER TABLE "public"."service_category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stress_check_group_analysis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "division_id" "uuid",
    "group_name" "text" NOT NULL,
    "respondent_count" integer DEFAULT 0 NOT NULL,
    "avg_score_a" numeric(5,2),
    "avg_score_b" numeric(5,2),
    "avg_score_c" numeric(5,2),
    "avg_score_d" numeric(5,2),
    "scale_averages" "jsonb",
    "health_risk_a" numeric(5,1),
    "health_risk_b" numeric(5,1),
    "total_health_risk" numeric(5,1),
    "is_suppressed" boolean DEFAULT false NOT NULL,
    "high_stress_count" integer,
    "high_stress_rate" numeric(5,2),
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stress_check_group_analysis" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_group_analysis" IS '集団分析結果（部署別・全社、仕事のストレス判定図データ）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_high_stress_criteria" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "evaluation_method" "text" NOT NULL,
    "question_count" integer NOT NULL,
    "condition_1_b_threshold" integer NOT NULL,
    "condition_2_ac_threshold" integer NOT NULL,
    "condition_2_b_threshold" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stress_check_high_stress_criteria_evaluation_method_check" CHECK (("evaluation_method" = ANY (ARRAY['raw_score'::"text", 'converted_score'::"text"]))),
    CONSTRAINT "stress_check_high_stress_criteria_question_count_check" CHECK (("question_count" = ANY (ARRAY[23, 57])))
);


ALTER TABLE "public"."stress_check_high_stress_criteria" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stress_check_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "result_id" "uuid" NOT NULL,
    "doctor_employee_id" "uuid",
    "interview_date" "date",
    "interview_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "doctor_opinion" "text",
    "work_measures" "text",
    "measure_details" "text",
    "follow_up_date" "date",
    "follow_up_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stress_check_interviews_interview_status_check" CHECK (("interview_status" = ANY (ARRAY['pending'::"text", 'scheduled'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stress_check_interviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_interviews" IS '面接指導記録（産業医による面接・意見・就業措置）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "questionnaire_type" "text" DEFAULT '57'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "high_stress_method" "text" DEFAULT 'combined'::"text" NOT NULL,
    "notification_text" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stress_check_periods_high_stress_method_check" CHECK (("high_stress_method" = ANY (ARRAY['combined'::"text", 'b_only'::"text"]))),
    CONSTRAINT "stress_check_periods_questionnaire_type_check" CHECK (("questionnaire_type" = ANY (ARRAY['57'::"text", '23'::"text"]))),
    CONSTRAINT "stress_check_periods_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'closed'::"text", 'analyzed'::"text"]))),
    CONSTRAINT "valid_period" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."stress_check_periods" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_periods" IS 'ストレスチェック実施期間（年度単位）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "questionnaire_type" "text" DEFAULT '57'::"text" NOT NULL,
    "category" "text" NOT NULL,
    "question_no" integer NOT NULL,
    "question_text" "text" NOT NULL,
    "scale_labels" "jsonb" DEFAULT '["そうだ", "まあそうだ", "ややちがう", "ちがう"]'::"jsonb" NOT NULL,
    "score_weights" "jsonb" DEFAULT '[4, 3, 2, 1]'::"jsonb" NOT NULL,
    "is_reverse" boolean DEFAULT false NOT NULL,
    "scale_name" "text" NOT NULL,
    "sort_order" integer NOT NULL,
    CONSTRAINT "stress_check_questions_category_check" CHECK (("category" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'D'::"text"]))),
    CONSTRAINT "stress_check_questions_questionnaire_type_check" CHECK (("questionnaire_type" = ANY (ARRAY['57'::"text", '23'::"text"])))
);


ALTER TABLE "public"."stress_check_questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_questions" IS '職業性ストレス簡易調査票 質問マスタ（57問/23問）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_response_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scale_type" "text" NOT NULL,
    "score" integer NOT NULL,
    "label" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "stress_check_response_options_scale_type_check" CHECK (("scale_type" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text", 'D'::"text"]))),
    CONSTRAINT "stress_check_response_options_score_check" CHECK ((("score" >= 1) AND ("score" <= 4)))
);


ALTER TABLE "public"."stress_check_response_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stress_check_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer" integer NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stress_check_responses_answer_check" CHECK ((("answer" >= 1) AND ("answer" <= 4)))
);


ALTER TABLE "public"."stress_check_responses" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_responses" IS 'ストレスチェック個人回答（1行=1問の回答）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "score_a" integer,
    "score_b" integer,
    "score_c" integer,
    "score_d" integer,
    "scale_scores" "jsonb",
    "is_high_stress" boolean DEFAULT false NOT NULL,
    "high_stress_reason" "text",
    "needs_interview" boolean DEFAULT false NOT NULL,
    "interview_requested" boolean DEFAULT false NOT NULL,
    "interview_requested_at" timestamp with time zone,
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stress_check_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_results" IS 'ストレスチェック個人結果（採点・高ストレス判定）';



CREATE TABLE IF NOT EXISTS "public"."stress_check_scale_conversions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scale_name" "text" NOT NULL,
    "gender" "text" NOT NULL,
    "formula" "text" NOT NULL,
    "level_1_min" integer NOT NULL,
    "level_1_max" integer NOT NULL,
    "level_2_min" integer NOT NULL,
    "level_2_max" integer NOT NULL,
    "level_3_min" integer NOT NULL,
    "level_3_max" integer NOT NULL,
    "level_4_min" integer NOT NULL,
    "level_4_max" integer NOT NULL,
    "level_5_min" integer NOT NULL,
    "level_5_max" integer NOT NULL,
    CONSTRAINT "stress_check_scale_conversions_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text"])))
);


ALTER TABLE "public"."stress_check_scale_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stress_check_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "consent_to_employer" boolean DEFAULT false NOT NULL,
    "consent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "stress_check_submissions_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'submitted'::"text"])))
);


ALTER TABLE "public"."stress_check_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_check_submissions" IS '受検ステータス管理（途中保存・提出・同意管理）';



CREATE OR REPLACE VIEW "public"."stress_group_analysis" WITH ("security_invoker"='true') AS
 SELECT "d"."id" AS "division_id",
    "d"."name",
    "d"."tenant_id",
    "count"("e"."id") AS "member_count",
    "round"(((100.0 * ("count"(
        CASE
            WHEN ("sr"."is_high_stress" = true) THEN 1
            ELSE NULL::integer
        END))::numeric) / (NULLIF("count"("e"."id"), 0))::numeric), 1) AS "high_stress_rate",
    "round"((((("avg"("sr"."score_a") + "avg"("sr"."score_b")) + "avg"("sr"."score_c")) + "avg"("sr"."score_d")) / 4.0), 1) AS "health_risk",
    "round"("avg"("sr"."score_a"), 1) AS "workload",
    "round"("avg"("sr"."score_b"), 1) AS "control",
    "round"("avg"("sr"."score_c"), 1) AS "supervisor_support",
    "round"("avg"("sr"."score_d"), 1) AS "colleague_support",
    "lag"((((("avg"("sr"."score_a") + "avg"("sr"."score_b")) + "avg"("sr"."score_c")) + "avg"("sr"."score_d")) / 4.0)) OVER (PARTITION BY "d"."id" ORDER BY "sp"."end_date" DESC) AS "previous_health_risk",
    "sp"."title" AS "period_name",
    ("sp"."end_date" = "max"("sp"."end_date") OVER (PARTITION BY "d"."tenant_id")) AS "is_latest"
   FROM ((("public"."employees" "e"
     JOIN "public"."divisions" "d" ON (("e"."division_id" = "d"."id")))
     JOIN "public"."stress_check_results" "sr" ON (("e"."id" = "sr"."employee_id")))
     JOIN "public"."stress_check_periods" "sp" ON ((("sr"."period_id" = "sp"."id") AND ("sp"."tenant_id" = "d"."tenant_id"))))
  GROUP BY "d"."id", "d"."name", "d"."tenant_id", "sp"."title", "sp"."end_date"
 HAVING ("count"("e"."id") >= 1);


ALTER VIEW "public"."stress_group_analysis" OWNER TO "postgres";


COMMENT ON VIEW "public"."stress_group_analysis" IS 'ストレスチェック集団分析（部署×期間別の高ストレス率・健康リスク・4尺度）';



CREATE TABLE IF NOT EXISTS "public"."stress_interview_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "stress_result_id" "uuid",
    "doctor_id" "uuid" NOT NULL,
    "interviewee_id" "uuid" NOT NULL,
    "interview_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "interview_duration" integer,
    "interview_notes" "text",
    "doctor_opinion" "text",
    "measure_type" "text",
    "measure_details" "text",
    "follow_up_date" "date",
    "follow_up_status" "text" DEFAULT '未実施'::"text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_doctor_opinion_when_completed" CHECK ((("status" <> 'completed'::"text") OR (("doctor_opinion" IS NOT NULL) AND (TRIM(BOTH FROM "doctor_opinion") <> ''::"text")))),
    CONSTRAINT "stress_interview_records_follow_up_status_check" CHECK (("follow_up_status" = ANY (ARRAY['未実施'::"text", '実施済'::"text", 'キャンセル'::"text", '継続観察'::"text"]))),
    CONSTRAINT "stress_interview_records_measure_type_check" CHECK (("measure_type" = ANY (ARRAY['配置転換'::"text", '労働時間短縮'::"text", '休業'::"text", 'その他'::"text", '措置不要'::"text"]))),
    CONSTRAINT "stress_interview_records_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'scheduled'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."stress_interview_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."stress_interview_records" IS '高ストレス者に対する面接指導記録（厚労省マニュアル第7章準拠）';



COMMENT ON COLUMN "public"."stress_interview_records"."stress_result_id" IS '紐づくストレスチェック結果ID';



COMMENT ON COLUMN "public"."stress_interview_records"."doctor_id" IS '面接を実施した産業医・保健師の社員ID';



COMMENT ON COLUMN "public"."stress_interview_records"."interviewee_id" IS '面接を受けた社員ID';



COMMENT ON COLUMN "public"."stress_interview_records"."doctor_opinion" IS '医師の意見（第7章(5)必須。status=completed の場合は必須）';



COMMENT ON COLUMN "public"."stress_interview_records"."measure_type" IS '就業上の措置の種類';



COMMENT ON COLUMN "public"."stress_interview_records"."status" IS '面接指導のステータス（予約〜実施済まで対応）';



CREATE TABLE IF NOT EXISTS "public"."supervisor_qr_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "supervisor_user_id" "uuid" NOT NULL,
    "employee_user_id" "uuid" NOT NULL,
    "can_display" boolean DEFAULT true NOT NULL,
    "scope" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."supervisor_qr_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."supervisor_qr_permissions" IS '監督者が QR 表示を許可した従業員（テナント単位）';



COMMENT ON COLUMN "public"."supervisor_qr_permissions"."can_display" IS 'QR 表示を許可するか';



COMMENT ON COLUMN "public"."supervisor_qr_permissions"."scope" IS '任意タグ（例: punch_in / punch_out / all）';



CREATE TABLE IF NOT EXISTS "public"."survey_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."survey_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "survey_responses_score_check" CHECK ((("score" >= 1) AND ("score" <= 5)))
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."telework_activity_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "active_seconds" integer DEFAULT 0,
    "pc_active_seconds" integer DEFAULT 0,
    "idle_seconds" integer DEFAULT 0,
    "last_updated" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."telework_activity_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."telework_activity_stats" IS '日次アクティビティ集計（テナント・ユーザー単位）';



CREATE TABLE IF NOT EXISTS "public"."telework_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "related_table" "text",
    "related_id" "uuid",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."telework_audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."telework_audit_logs" IS 'テレワーク機能の監査ログ（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."telework_pc_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_name" "text",
    "device_identifier" "text",
    "device_secret" "text",
    "registered_at" timestamp with time zone DEFAULT "now"(),
    "approved" boolean DEFAULT false,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "last_seen" timestamp with time zone,
    "metadata" "jsonb",
    "registration_token_hash" "text",
    "rejected_at" timestamp with time zone,
    "secret_issued_at" timestamp with time zone,
    "secret_delivered_at" timestamp with time zone,
    "rejection_reason" "text"
);


ALTER TABLE "public"."telework_pc_devices" OWNER TO "postgres";


COMMENT ON TABLE "public"."telework_pc_devices" IS 'テレワーク用PC端末登録（テナント単位）';



COMMENT ON COLUMN "public"."telework_pc_devices"."registration_token_hash" IS '登録時ワンタイムトークンの SHA-256(hex)。平文トークンは端末のみ保持';



COMMENT ON COLUMN "public"."telework_pc_devices"."secret_issued_at" IS 'device_secret を暗号化保存した時刻';



COMMENT ON COLUMN "public"."telework_pc_devices"."secret_delivered_at" IS '平文 secret を端末へ一度返却済みの時刻';



CREATE TABLE IF NOT EXISTS "public"."telework_pc_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" "uuid",
    "event_time" timestamp with time zone NOT NULL,
    "event_type" "text" NOT NULL,
    "info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."telework_pc_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."telework_pc_logs" IS 'PCイベントログ（テナント単位）';



CREATE TABLE IF NOT EXISTS "public"."telework_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" "uuid",
    "start_at" timestamp with time zone NOT NULL,
    "start_lat" numeric,
    "start_lon" numeric,
    "start_ip" "inet",
    "start_user_agent" "text",
    "end_at" timestamp with time zone,
    "end_lat" numeric,
    "end_lon" numeric,
    "end_ip" "inet",
    "end_user_agent" "text",
    "worked_seconds" integer,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "summary_text" "text"
);


ALTER TABLE "public"."telework_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."telework_sessions" IS 'テレワーク出退勤セッション（テナント単位）';



COMMENT ON COLUMN "public"."telework_sessions"."summary_text" IS '作業終了時に入力した当日の作業内容メモ';



CREATE TABLE IF NOT EXISTS "public"."tenant_inquiry_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "cited_chunk_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_inquiry_chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."tenant_inquiry_chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_inquiry_chat_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_inquiry_chat_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_portal_settings" (
    "tenant_id" "uuid" NOT NULL,
    "hr_inquiry_email" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_portal_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_portal_settings" IS 'テナントのポータル基本設定（お問合せ先メール等）';



COMMENT ON COLUMN "public"."tenant_portal_settings"."hr_inquiry_email" IS '人事へのお問合せメール宛先。NULL のときサーバー環境変数のフォールバックを使用';



CREATE TABLE IF NOT EXISTS "public"."tenant_rag_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "action" "text" NOT NULL,
    "document_id" "uuid",
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_rag_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_rag_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" "text" NOT NULL,
    "embedding" "public"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_rag_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_rag_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "source_kind" "text" NOT NULL,
    "mime_type" "text",
    "original_filename" "text",
    "source_url" "text",
    "storage_path" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "byte_size" bigint,
    "created_by" "uuid",
    "ingest_started_at" timestamp with time zone,
    "ingest_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_rag_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."tenant_rag_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "service_id" "uuid",
    "start_date" "date",
    "status" "text"
);


ALTER TABLE "public"."tenant_service" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "contact_date" "date",
    "paid_amount" integer,
    "employee_count" integer,
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "plan_type" "text" DEFAULT 'free'::"text" NOT NULL,
    "max_employees" integer DEFAULT 30 NOT NULL,
    "company_name" "text",
    "business_description" "text",
    "mission_vision" "text",
    "culture_and_benefits" "text",
    "onboarding_completed_at" timestamp with time zone,
    "contract_end_at" timestamp with time zone
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."plan_type" IS 'テナントの契約プラン (free / pro / enterprise)';



COMMENT ON COLUMN "public"."tenants"."max_employees" IS 'テナントの従業員登録上限数';



COMMENT ON COLUMN "public"."tenants"."contract_end_at" IS '契約終了日時。この時刻を過ぎたテナントを契約期限切れとして扱う想定。NULL の場合は期限未設定。';



CREATE TABLE IF NOT EXISTS "public"."timecard_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "original_clock_in" timestamp with time zone,
    "original_clock_out" timestamp with time zone,
    "corrected_clock_in" timestamp with time zone,
    "corrected_clock_out" timestamp with time zone,
    "reason" "text",
    "corrected_by" "uuid" NOT NULL,
    "correction_source" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."timecard_corrections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_time_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "record_date" "date" NOT NULL,
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "duration_minutes" integer NOT NULL,
    "is_holiday" boolean DEFAULT false,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "qr_session_id" "uuid",
    "punch_supervisor_user_id" "uuid"
);


ALTER TABLE "public"."work_time_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_time_records" IS '勤怠の原始レコード（テナント単位）';



COMMENT ON COLUMN "public"."work_time_records"."qr_session_id" IS 'QR 打刻時の qr_sessions.id（発行監督者の追跡用）';



COMMENT ON COLUMN "public"."work_time_records"."punch_supervisor_user_id" IS 'QR 打刻時に QR を発行した監督者の auth.users.id（集計・表示用の冗長コピー）';



CREATE TABLE IF NOT EXISTS "public"."workplace_improvement_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "division_id" "uuid",
    "source_analysis_id" "uuid",
    "ai_generated_title" "text" NOT NULL,
    "ai_reason" "text" NOT NULL,
    "proposed_actions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "priority" "text" NOT NULL,
    "status" "text" DEFAULT '提案済'::"text",
    "registered_by" "uuid",
    "expected_effect" "text",
    "manual_ref" "text",
    "follow_up_date" "date",
    "actual_effect_score" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workplace_improvement_plans_priority_check" CHECK (("priority" = ANY (ARRAY['高'::"text", '中'::"text", '低'::"text"]))),
    CONSTRAINT "workplace_improvement_plans_status_check" CHECK (("status" = ANY (ARRAY['提案済'::"text", '実行登録'::"text", '実施中'::"text", '完了'::"text", 'キャンセル'::"text"])))
);


ALTER TABLE "public"."workplace_improvement_plans" OWNER TO "postgres";


ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_role"
    ADD CONSTRAINT "app_role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."closure_audit_logs"
    ADD CONSTRAINT "closure_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."closure_warnings"
    ADD CONSTRAINT "closure_warnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctor_availability_slots"
    ADD CONSTRAINT "doctor_availability_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."health_assessments_link"
    ADD CONSTRAINT "health_assessments_link_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_employee_overtime"
    ADD CONSTRAINT "monthly_employee_overtime_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_overtime_closures"
    ADD CONSTRAINT "monthly_overtime_closures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_overtime_closures"
    ADD CONSTRAINT "monthly_overtime_closures_tenant_id_year_month_key" UNIQUE ("tenant_id", "year_month");



ALTER TABLE ONLY "public"."myou_alert_logs"
    ADD CONSTRAINT "myou_alert_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."myou_companies"
    ADD CONSTRAINT "myou_companies_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."myou_products"
    ADD CONSTRAINT "myou_products_pkey" PRIMARY KEY ("serial_number");



ALTER TABLE ONLY "public"."overtime_alerts"
    ADD CONSTRAINT "overtime_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_analysis_results"
    ADD CONSTRAINT "overtime_analysis_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_analysis_results"
    ADD CONSTRAINT "overtime_analysis_results_tenant_id_year_month_key" UNIQUE ("tenant_id", "year_month");



ALTER TABLE ONLY "public"."overtime_applications"
    ADD CONSTRAINT "overtime_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_corrections"
    ADD CONSTRAINT "overtime_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_monthly_stats"
    ADD CONSTRAINT "overtime_monthly_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_settings"
    ADD CONSTRAINT "overtime_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."overtime_settings"
    ADD CONSTRAINT "overtime_settings_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."program_targets"
    ADD CONSTRAINT "program_targets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_targets"
    ADD CONSTRAINT "program_targets_unique_instance_employee" UNIQUE ("program_type", "program_instance_id", "employee_id");



ALTER TABLE ONLY "public"."pulse_survey_periods"
    ADD CONSTRAINT "pulse_survey_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_periods"
    ADD CONSTRAINT "pulse_survey_periods_tenant_id_survey_period_key" UNIQUE ("tenant_id", "survey_period");



ALTER TABLE ONLY "public"."pulse_survey_questions"
    ADD CONSTRAINT "pulse_survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_templates"
    ADD CONSTRAINT "pulse_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_audit_logs"
    ADD CONSTRAINT "qr_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_session_scans"
    ADD CONSTRAINT "qr_session_scans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_sessions"
    ADD CONSTRAINT "qr_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_answers"
    ADD CONSTRAINT "questionnaire_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_assignments"
    ADD CONSTRAINT "questionnaire_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_assignments"
    ADD CONSTRAINT "questionnaire_assignments_questionnaire_id_employee_id_key" UNIQUE ("questionnaire_id", "employee_id");



ALTER TABLE ONLY "public"."questionnaire_question_items"
    ADD CONSTRAINT "questionnaire_question_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_question_options"
    ADD CONSTRAINT "questionnaire_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_assignment_id_key" UNIQUE ("assignment_id");



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_sections"
    ADD CONSTRAINT "questionnaire_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_assignments"
    ADD CONSTRAINT "service_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_assignments_users"
    ADD CONSTRAINT "service_assignments_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_assignments_users"
    ADD CONSTRAINT "service_assignments_users_service_assignment_id_employee_id_key" UNIQUE ("service_assignment_id", "employee_id");



ALTER TABLE ONLY "public"."service_category"
    ADD CONSTRAINT "service_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_group_analysis"
    ADD CONSTRAINT "stress_check_group_analysis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_high_stress_criteria"
    ADD CONSTRAINT "stress_check_high_stress_criteria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_periods"
    ADD CONSTRAINT "stress_check_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_questions"
    ADD CONSTRAINT "stress_check_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_response_options"
    ADD CONSTRAINT "stress_check_response_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "stress_check_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_results"
    ADD CONSTRAINT "stress_check_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_scale_conversions"
    ADD CONSTRAINT "stress_check_scale_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_scale_conversions"
    ADD CONSTRAINT "stress_check_scale_conversions_scale_name_gender_key" UNIQUE ("scale_name", "gender");



ALTER TABLE ONLY "public"."stress_check_submissions"
    ADD CONSTRAINT "stress_check_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supervisor_qr_permissions"
    ADD CONSTRAINT "supervisor_qr_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supervisor_qr_permissions"
    ADD CONSTRAINT "supervisor_qr_permissions_tenant_supervisor_employee_key" UNIQUE ("tenant_id", "supervisor_user_id", "employee_user_id");



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telework_activity_stats"
    ADD CONSTRAINT "telework_activity_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telework_activity_stats"
    ADD CONSTRAINT "telework_activity_stats_tenant_id_user_id_date_key" UNIQUE ("tenant_id", "user_id", "date");



ALTER TABLE ONLY "public"."telework_audit_logs"
    ADD CONSTRAINT "telework_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telework_pc_devices"
    ADD CONSTRAINT "telework_pc_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telework_pc_logs"
    ADD CONSTRAINT "telework_pc_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."telework_sessions"
    ADD CONSTRAINT "telework_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_inquiry_chat_messages"
    ADD CONSTRAINT "tenant_inquiry_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_inquiry_chat_sessions"
    ADD CONSTRAINT "tenant_inquiry_chat_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_portal_settings"
    ADD CONSTRAINT "tenant_portal_settings_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenant_rag_audit_logs"
    ADD CONSTRAINT "tenant_rag_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_rag_chunks"
    ADD CONSTRAINT "tenant_rag_chunks_document_id_chunk_index_key" UNIQUE ("document_id", "chunk_index");



ALTER TABLE ONLY "public"."tenant_rag_chunks"
    ADD CONSTRAINT "tenant_rag_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_rag_documents"
    ADD CONSTRAINT "tenant_rag_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."timecard_corrections"
    ADD CONSTRAINT "timecard_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stress_check_group_analysis"
    ADD CONSTRAINT "unique_group_analysis" UNIQUE ("period_id", "division_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "unique_product_delivery" UNIQUE ("serial_number");



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "unique_response" UNIQUE ("period_id", "employee_id", "question_id");



ALTER TABLE ONLY "public"."stress_check_results"
    ADD CONSTRAINT "unique_result" UNIQUE ("period_id", "employee_id");



ALTER TABLE ONLY "public"."stress_check_submissions"
    ADD CONSTRAINT "unique_submission" UNIQUE ("period_id", "employee_id");



ALTER TABLE ONLY "public"."stress_check_periods"
    ADD CONSTRAINT "unique_tenant_fiscal" UNIQUE ("tenant_id", "fiscal_year");



ALTER TABLE ONLY "public"."stress_check_questions"
    ADD CONSTRAINT "unique_type_sort" UNIQUE ("questionnaire_type", "sort_order");



ALTER TABLE ONLY "public"."work_time_records"
    ADD CONSTRAINT "work_time_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workplace_improvement_plans"
    ADD CONSTRAINT "workplace_improvement_plans_pkey" PRIMARY KEY ("id");



CREATE INDEX "access_logs_created_at_idx" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "access_logs_tenant_id_idx" ON "public"."access_logs" USING "btree" ("tenant_id");



CREATE INDEX "access_logs_user_id_idx" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_access_logs_created_at" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_access_logs_tenant_created" ON "public"."access_logs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_closure_audit_logs_closure_id" ON "public"."closure_audit_logs" USING "btree" ("closure_id");



CREATE INDEX "idx_closure_audit_logs_tenant_id" ON "public"."closure_audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_closure_warnings_closure_id" ON "public"."closure_warnings" USING "btree" ("closure_id");



CREATE INDEX "idx_closure_warnings_employee_id" ON "public"."closure_warnings" USING "btree" ("employee_id");



CREATE INDEX "idx_closure_warnings_tenant_id" ON "public"."closure_warnings" USING "btree" ("tenant_id");



CREATE INDEX "idx_doctor_availability_slots_doctor_specific" ON "public"."doctor_availability_slots" USING "btree" ("doctor_id", "specific_date") WHERE ("specific_date" IS NOT NULL);



CREATE UNIQUE INDEX "idx_doctor_availability_slots_specific_unique" ON "public"."doctor_availability_slots" USING "btree" ("tenant_id", "doctor_id", "specific_date", "start_time", "end_time") WHERE ("specific_date" IS NOT NULL);



CREATE INDEX "idx_doctor_availability_slots_tenant_doctor" ON "public"."doctor_availability_slots" USING "btree" ("tenant_id", "doctor_id");



CREATE UNIQUE INDEX "idx_doctor_availability_slots_weekly_unique" ON "public"."doctor_availability_slots" USING "btree" ("tenant_id", "doctor_id", "day_of_week", "start_time", "end_time") WHERE ("specific_date" IS NULL);



CREATE INDEX "idx_health_assessments_link_employee" ON "public"."health_assessments_link" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_health_assessments_link_tenant" ON "public"."health_assessments_link" USING "btree" ("tenant_id");



CREATE INDEX "idx_interventions_employee" ON "public"."interventions" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_interventions_status" ON "public"."interventions" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_interventions_tenant" ON "public"."interventions" USING "btree" ("tenant_id");



CREATE INDEX "idx_monthly_employee_overtime_closure_id" ON "public"."monthly_employee_overtime" USING "btree" ("closure_id");



CREATE INDEX "idx_monthly_employee_overtime_employee_id" ON "public"."monthly_employee_overtime" USING "btree" ("employee_id");



CREATE INDEX "idx_monthly_employee_overtime_tenant_id" ON "public"."monthly_employee_overtime" USING "btree" ("tenant_id");



CREATE INDEX "idx_monthly_overtime_closures_tenant" ON "public"."monthly_overtime_closures" USING "btree" ("tenant_id");



CREATE INDEX "idx_overtime_alerts_employee" ON "public"."overtime_alerts" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_overtime_alerts_tenant" ON "public"."overtime_alerts" USING "btree" ("tenant_id");



CREATE INDEX "idx_overtime_alerts_unresolved" ON "public"."overtime_alerts" USING "btree" ("tenant_id") WHERE ("resolved_at" IS NULL);



CREATE INDEX "idx_overtime_analysis_results_tenant" ON "public"."overtime_analysis_results" USING "btree" ("tenant_id");



CREATE INDEX "idx_overtime_applications_tenant" ON "public"."overtime_applications" USING "btree" ("tenant_id");



CREATE INDEX "idx_overtime_applications_tenant_employee" ON "public"."overtime_applications" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_overtime_applications_tenant_status" ON "public"."overtime_applications" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_overtime_applications_tenant_work_date" ON "public"."overtime_applications" USING "btree" ("tenant_id", "work_date");



CREATE INDEX "idx_overtime_corrections_application" ON "public"."overtime_corrections" USING "btree" ("application_id");



CREATE INDEX "idx_overtime_monthly_stats_employee" ON "public"."overtime_monthly_stats" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_overtime_monthly_stats_period" ON "public"."overtime_monthly_stats" USING "btree" ("tenant_id", "period_month");



CREATE INDEX "idx_overtime_monthly_stats_tenant" ON "public"."overtime_monthly_stats" USING "btree" ("tenant_id");



CREATE INDEX "idx_overtime_settings_tenant_id" ON "public"."overtime_settings" USING "btree" ("tenant_id");



CREATE INDEX "idx_program_targets_eligible" ON "public"."program_targets" USING "btree" ("program_type", "program_instance_id", "is_eligible") WHERE ("is_eligible" = true);



CREATE INDEX "idx_program_targets_employee" ON "public"."program_targets" USING "btree" ("employee_id");



CREATE INDEX "idx_program_targets_program" ON "public"."program_targets" USING "btree" ("program_type", "program_instance_id");



CREATE INDEX "idx_program_targets_tenant" ON "public"."program_targets" USING "btree" ("tenant_id");



CREATE INDEX "idx_qr_audit_created_at" ON "public"."qr_audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_qr_audit_tenant" ON "public"."qr_audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_qr_scans_employee" ON "public"."qr_session_scans" USING "btree" ("tenant_id", "employee_user_id");



CREATE INDEX "idx_qr_scans_scanned_at" ON "public"."qr_session_scans" USING "btree" ("scanned_at");



CREATE INDEX "idx_qr_scans_session_id" ON "public"."qr_session_scans" USING "btree" ("session_id");



CREATE INDEX "idx_qr_sessions_expires_at" ON "public"."qr_sessions" USING "btree" ("expires_at");



CREATE UNIQUE INDEX "idx_qr_sessions_tenant_nonce" ON "public"."qr_sessions" USING "btree" ("tenant_id", "nonce");



CREATE INDEX "idx_qr_sessions_tenant_supervisor" ON "public"."qr_sessions" USING "btree" ("tenant_id", "supervisor_user_id");



CREATE INDEX "idx_sc_group_period" ON "public"."stress_check_group_analysis" USING "btree" ("period_id");



CREATE INDEX "idx_sc_group_tenant" ON "public"."stress_check_group_analysis" USING "btree" ("tenant_id");



CREATE INDEX "idx_sc_interviews_doctor" ON "public"."stress_check_interviews" USING "btree" ("doctor_employee_id");



CREATE INDEX "idx_sc_interviews_period" ON "public"."stress_check_interviews" USING "btree" ("period_id");



CREATE INDEX "idx_sc_interviews_tenant" ON "public"."stress_check_interviews" USING "btree" ("tenant_id");



CREATE INDEX "idx_sc_periods_status" ON "public"."stress_check_periods" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_sc_periods_tenant" ON "public"."stress_check_periods" USING "btree" ("tenant_id");



CREATE INDEX "idx_sc_questions_category" ON "public"."stress_check_questions" USING "btree" ("category");



CREATE INDEX "idx_sc_questions_type" ON "public"."stress_check_questions" USING "btree" ("questionnaire_type", "sort_order");



CREATE INDEX "idx_sc_responses_period_emp" ON "public"."stress_check_responses" USING "btree" ("period_id", "employee_id");



CREATE INDEX "idx_sc_responses_tenant" ON "public"."stress_check_responses" USING "btree" ("tenant_id");



CREATE INDEX "idx_sc_results_high_stress" ON "public"."stress_check_results" USING "btree" ("period_id", "is_high_stress") WHERE ("is_high_stress" = true);



CREATE INDEX "idx_sc_results_period" ON "public"."stress_check_results" USING "btree" ("period_id");



CREATE INDEX "idx_sc_results_tenant" ON "public"."stress_check_results" USING "btree" ("tenant_id");



CREATE INDEX "idx_sc_submissions_period" ON "public"."stress_check_submissions" USING "btree" ("period_id", "status");



CREATE INDEX "idx_sc_submissions_tenant" ON "public"."stress_check_submissions" USING "btree" ("tenant_id");



CREATE INDEX "idx_service_assignments_tenant" ON "public"."service_assignments" USING "btree" ("tenant_id");



CREATE INDEX "idx_service_assignments_users_assignment" ON "public"."service_assignments_users" USING "btree" ("service_assignment_id");



CREATE INDEX "idx_service_assignments_users_employee" ON "public"."service_assignments_users" USING "btree" ("employee_id");



CREATE INDEX "idx_service_assignments_users_tenant" ON "public"."service_assignments_users" USING "btree" ("tenant_id");



CREATE INDEX "idx_stress_interview_records_tenant_doctor" ON "public"."stress_interview_records" USING "btree" ("tenant_id", "doctor_id");



CREATE INDEX "idx_stress_interview_records_tenant_interview_date" ON "public"."stress_interview_records" USING "btree" ("tenant_id", "interview_date" DESC);



CREATE INDEX "idx_stress_interview_records_tenant_interviewee" ON "public"."stress_interview_records" USING "btree" ("tenant_id", "interviewee_id");



CREATE INDEX "idx_stress_interview_records_tenant_stress_result" ON "public"."stress_interview_records" USING "btree" ("tenant_id", "stress_result_id");



CREATE INDEX "idx_supervisor_qr_permissions_tenant_employee" ON "public"."supervisor_qr_permissions" USING "btree" ("tenant_id", "employee_user_id");



CREATE INDEX "idx_supervisor_qr_permissions_tenant_supervisor" ON "public"."supervisor_qr_permissions" USING "btree" ("tenant_id", "supervisor_user_id");



CREATE INDEX "idx_timecard_corrections_employee_id" ON "public"."timecard_corrections" USING "btree" ("employee_id");



CREATE INDEX "idx_timecard_corrections_tenant_id" ON "public"."timecard_corrections" USING "btree" ("tenant_id");



CREATE INDEX "idx_tw_audit_tenant_created" ON "public"."telework_audit_logs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_tw_devices_tenant_user" ON "public"."telework_pc_devices" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_tw_logs_tenant_event_time" ON "public"."telework_pc_logs" USING "btree" ("tenant_id", "event_time");



CREATE INDEX "idx_tw_logs_tenant_user" ON "public"."telework_pc_logs" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_tw_sessions_tenant_user" ON "public"."telework_sessions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "idx_tw_stats_tenant_user_date" ON "public"."telework_activity_stats" USING "btree" ("tenant_id", "user_id", "date");



CREATE INDEX "idx_wip_division" ON "public"."workplace_improvement_plans" USING "btree" ("division_id");



CREATE INDEX "idx_wip_status" ON "public"."workplace_improvement_plans" USING "btree" ("status");



CREATE INDEX "idx_wip_tenant" ON "public"."workplace_improvement_plans" USING "btree" ("tenant_id");



CREATE INDEX "idx_work_time_records_date" ON "public"."work_time_records" USING "btree" ("tenant_id", "record_date");



CREATE INDEX "idx_work_time_records_employee" ON "public"."work_time_records" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_work_time_records_qr_session" ON "public"."work_time_records" USING "btree" ("qr_session_id") WHERE ("qr_session_id" IS NOT NULL);



CREATE INDEX "idx_work_time_records_tenant" ON "public"."work_time_records" USING "btree" ("tenant_id");



CREATE INDEX "questionnaire_answers_response_id_idx" ON "public"."questionnaire_answers" USING "btree" ("response_id");



CREATE INDEX "questionnaire_assignments_employee_id_idx" ON "public"."questionnaire_assignments" USING "btree" ("employee_id");



CREATE INDEX "questionnaire_assignments_tenant_id_idx" ON "public"."questionnaire_assignments" USING "btree" ("tenant_id");



CREATE INDEX "questionnaire_question_items_question_id_idx" ON "public"."questionnaire_question_items" USING "btree" ("question_id");



CREATE INDEX "questionnaire_question_options_question_id_idx" ON "public"."questionnaire_question_options" USING "btree" ("question_id");



CREATE INDEX "questionnaire_questions_questionnaire_id_idx" ON "public"."questionnaire_questions" USING "btree" ("questionnaire_id");



CREATE INDEX "questionnaire_questions_section_id_idx" ON "public"."questionnaire_questions" USING "btree" ("section_id");



CREATE INDEX "questionnaire_responses_assignment_id_idx" ON "public"."questionnaire_responses" USING "btree" ("assignment_id");



CREATE INDEX "questionnaire_responses_employee_id_idx" ON "public"."questionnaire_responses" USING "btree" ("employee_id");



CREATE INDEX "questionnaire_responses_tenant_id_idx" ON "public"."questionnaire_responses" USING "btree" ("tenant_id");



CREATE INDEX "questionnaire_sections_questionnaire_id_idx" ON "public"."questionnaire_sections" USING "btree" ("questionnaire_id");



CREATE INDEX "questionnaires_creator_type_idx" ON "public"."questionnaires" USING "btree" ("creator_type");



CREATE INDEX "questionnaires_tenant_id_idx" ON "public"."questionnaires" USING "btree" ("tenant_id");



CREATE INDEX "tenant_inquiry_chat_messages_session_idx" ON "public"."tenant_inquiry_chat_messages" USING "btree" ("session_id");



CREATE INDEX "tenant_inquiry_chat_sessions_tenant_user_idx" ON "public"."tenant_inquiry_chat_sessions" USING "btree" ("tenant_id", "user_id");



CREATE INDEX "tenant_rag_audit_logs_tenant_id_idx" ON "public"."tenant_rag_audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "tenant_rag_chunks_document_id_idx" ON "public"."tenant_rag_chunks" USING "btree" ("document_id");



CREATE INDEX "tenant_rag_chunks_embedding_ivfflat_idx" ON "public"."tenant_rag_chunks" USING "ivfflat" ("embedding" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "tenant_rag_chunks_tenant_id_idx" ON "public"."tenant_rag_chunks" USING "btree" ("tenant_id");



CREATE INDEX "tenant_rag_documents_tenant_id_idx" ON "public"."tenant_rag_documents" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "uq_monthly_employee_overtime_tenant_closure_employee" ON "public"."monthly_employee_overtime" USING "btree" ("tenant_id", "closure_id", "employee_id");



CREATE UNIQUE INDEX "uq_work_time_records_tenant_emp_date" ON "public"."work_time_records" USING "btree" ("tenant_id", "employee_id", "record_date");



COMMENT ON INDEX "public"."uq_work_time_records_tenant_emp_date" IS '1 日 1 従業員 1 行（CSV 取り込み・QR 打刻の upsert 用）';



CREATE OR REPLACE TRIGGER "set_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_job_postings_updated_at" BEFORE UPDATE ON "public"."job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_monthly_overtime_closures_updated_at" BEFORE UPDATE ON "public"."monthly_overtime_closures" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_overtime_analysis_results_updated_at" BEFORE UPDATE ON "public"."overtime_analysis_results" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_overtime_applications_updated_at" BEFORE UPDATE ON "public"."overtime_applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_overtime_settings_updated_at" BEFORE UPDATE ON "public"."overtime_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_program_targets_updated_at" BEFORE UPDATE ON "public"."program_targets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_pulse_survey_periods_updated_at" BEFORE UPDATE ON "public"."pulse_survey_periods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_questionnaires_updated_at" BEFORE UPDATE ON "public"."questionnaires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_service_assignments_updated_at" BEFORE UPDATE ON "public"."service_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_service_assignments_users_updated_at" BEFORE UPDATE ON "public"."service_assignments_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_supervisor_qr_permissions_updated_at" BEFORE UPDATE ON "public"."supervisor_qr_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenant_portal_settings_updated_at" BEFORE UPDATE ON "public"."tenant_portal_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."monthly_employee_overtime" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_check_max_employees" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."check_max_employees"();



CREATE OR REPLACE TRIGGER "trg_doctor_availability_slots_updated_at" BEFORE UPDATE ON "public"."doctor_availability_slots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sc_interviews_updated_at" BEFORE UPDATE ON "public"."stress_check_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sc_periods_updated_at" BEFORE UPDATE ON "public"."stress_check_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sc_submissions_updated_at" BEFORE UPDATE ON "public"."stress_check_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_stress_interview_records_updated_at" BEFORE UPDATE ON "public"."stress_interview_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "public"."app_role"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pulse_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."closure_warnings"
    ADD CONSTRAINT "closure_warnings_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."monthly_overtime_closures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_availability_slots"
    ADD CONSTRAINT "doctor_availability_slots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctor_availability_slots"
    ADD CONSTRAINT "doctor_availability_slots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "public"."app_role"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."health_assessments_link"
    ADD CONSTRAINT "health_assessments_link_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."health_assessments_link"
    ADD CONSTRAINT "health_assessments_link_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_employee_overtime"
    ADD CONSTRAINT "monthly_employee_overtime_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."monthly_overtime_closures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_overtime_closures"
    ADD CONSTRAINT "monthly_overtime_closures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."myou_alert_logs"
    ADD CONSTRAINT "myou_alert_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."myou_companies"("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."myou_companies"("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "public"."myou_products"("serial_number");



ALTER TABLE ONLY "public"."overtime_alerts"
    ADD CONSTRAINT "overtime_alerts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_alerts"
    ADD CONSTRAINT "overtime_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_analysis_results"
    ADD CONSTRAINT "overtime_analysis_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_applications"
    ADD CONSTRAINT "overtime_applications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_applications"
    ADD CONSTRAINT "overtime_applications_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."overtime_applications"
    ADD CONSTRAINT "overtime_applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_corrections"
    ADD CONSTRAINT "overtime_corrections_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."overtime_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_corrections"
    ADD CONSTRAINT "overtime_corrections_corrected_by_fkey" FOREIGN KEY ("corrected_by") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_monthly_stats"
    ADD CONSTRAINT "overtime_monthly_stats_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_monthly_stats"
    ADD CONSTRAINT "overtime_monthly_stats_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."overtime_settings"
    ADD CONSTRAINT "overtime_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_targets"
    ADD CONSTRAINT "program_targets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_targets"
    ADD CONSTRAINT "program_targets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_periods"
    ADD CONSTRAINT "pulse_survey_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_questions"
    ADD CONSTRAINT "pulse_survey_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."pulse_survey_questions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_templates"
    ADD CONSTRAINT "pulse_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_audit_logs"
    ADD CONSTRAINT "qr_audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."qr_audit_logs"
    ADD CONSTRAINT "qr_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_session_scans"
    ADD CONSTRAINT "qr_session_scans_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_session_scans"
    ADD CONSTRAINT "qr_session_scans_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."qr_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_session_scans"
    ADD CONSTRAINT "qr_session_scans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_sessions"
    ADD CONSTRAINT "qr_sessions_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_sessions"
    ADD CONSTRAINT "qr_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_answers"
    ADD CONSTRAINT "questionnaire_answers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."questionnaire_question_items"("id");



ALTER TABLE ONLY "public"."questionnaire_answers"
    ADD CONSTRAINT "questionnaire_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."questionnaire_question_options"("id");



ALTER TABLE ONLY "public"."questionnaire_answers"
    ADD CONSTRAINT "questionnaire_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id");



ALTER TABLE ONLY "public"."questionnaire_answers"
    ADD CONSTRAINT "questionnaire_answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."questionnaire_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_assignments"
    ADD CONSTRAINT "questionnaire_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_assignments"
    ADD CONSTRAINT "questionnaire_assignments_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_assignments"
    ADD CONSTRAINT "questionnaire_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_question_items"
    ADD CONSTRAINT "questionnaire_question_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_question_options"
    ADD CONSTRAINT "questionnaire_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questionnaire_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_questions"
    ADD CONSTRAINT "questionnaire_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."questionnaire_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "public"."questionnaire_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id");



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."questionnaire_sections"
    ADD CONSTRAINT "questionnaire_sections_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_assignments"
    ADD CONSTRAINT "service_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_assignments_users"
    ADD CONSTRAINT "service_assignments_users_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_assignments_users"
    ADD CONSTRAINT "service_assignments_users_service_assignment_id_fkey" FOREIGN KEY ("service_assignment_id") REFERENCES "public"."service_assignments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_assignments_users"
    ADD CONSTRAINT "service_assignments_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."service_category"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stress_check_group_analysis"
    ADD CONSTRAINT "stress_check_group_analysis_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stress_check_group_analysis"
    ADD CONSTRAINT "stress_check_group_analysis_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."stress_check_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_group_analysis"
    ADD CONSTRAINT "stress_check_group_analysis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_doctor_employee_id_fkey" FOREIGN KEY ("doctor_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."stress_check_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "public"."stress_check_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_interviews"
    ADD CONSTRAINT "stress_check_interviews_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_periods"
    ADD CONSTRAINT "stress_check_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stress_check_periods"
    ADD CONSTRAINT "stress_check_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "stress_check_responses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "stress_check_responses_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."stress_check_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "stress_check_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."stress_check_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_responses"
    ADD CONSTRAINT "stress_check_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_results"
    ADD CONSTRAINT "stress_check_results_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_results"
    ADD CONSTRAINT "stress_check_results_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."stress_check_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_results"
    ADD CONSTRAINT "stress_check_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_submissions"
    ADD CONSTRAINT "stress_check_submissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_submissions"
    ADD CONSTRAINT "stress_check_submissions_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."stress_check_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_check_submissions"
    ADD CONSTRAINT "stress_check_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_interviewee_id_fkey" FOREIGN KEY ("interviewee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_stress_result_id_fkey" FOREIGN KEY ("stress_result_id") REFERENCES "public"."stress_check_results"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stress_interview_records"
    ADD CONSTRAINT "stress_interview_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supervisor_qr_permissions"
    ADD CONSTRAINT "supervisor_qr_permissions_employee_user_id_fkey" FOREIGN KEY ("employee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supervisor_qr_permissions"
    ADD CONSTRAINT "supervisor_qr_permissions_supervisor_user_id_fkey" FOREIGN KEY ("supervisor_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."supervisor_qr_permissions"
    ADD CONSTRAINT "supervisor_qr_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."survey_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_inquiry_chat_messages"
    ADD CONSTRAINT "tenant_inquiry_chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."tenant_inquiry_chat_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_inquiry_chat_messages"
    ADD CONSTRAINT "tenant_inquiry_chat_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_inquiry_chat_sessions"
    ADD CONSTRAINT "tenant_inquiry_chat_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_portal_settings"
    ADD CONSTRAINT "tenant_portal_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_rag_audit_logs"
    ADD CONSTRAINT "tenant_rag_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_rag_chunks"
    ADD CONSTRAINT "tenant_rag_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."tenant_rag_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_rag_chunks"
    ADD CONSTRAINT "tenant_rag_chunks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_rag_documents"
    ADD CONSTRAINT "tenant_rag_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_time_records"
    ADD CONSTRAINT "work_time_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_time_records"
    ADD CONSTRAINT "work_time_records_punch_supervisor_user_id_fkey" FOREIGN KEY ("punch_supervisor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_time_records"
    ADD CONSTRAINT "work_time_records_qr_session_id_fkey" FOREIGN KEY ("qr_session_id") REFERENCES "public"."qr_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_time_records"
    ADD CONSTRAINT "work_time_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workplace_improvement_plans"
    ADD CONSTRAINT "workplace_improvement_plans_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id");



ALTER TABLE ONLY "public"."workplace_improvement_plans"
    ADD CONSTRAINT "workplace_improvement_plans_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."workplace_improvement_plans"
    ADD CONSTRAINT "workplace_improvement_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Enable read access for authenticated users" ON "public"."stress_check_high_stress_criteria" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."stress_check_response_options" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "SaaS admins can view all access logs" ON "public"."access_logs" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'supaUser'::"text"));



CREATE POLICY "Tenant Isolation for myou_alert_logs" ON "public"."myou_alert_logs" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "Tenant Isolation for myou_companies" ON "public"."myou_companies" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "Tenant Isolation for myou_delivery_logs" ON "public"."myou_delivery_logs" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "Tenant Isolation for myou_products" ON "public"."myou_products" TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "Tenant admins can view their tenant's logs" ON "public"."access_logs" FOR SELECT TO "authenticated" USING ((("tenant_id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'tenant_id'::"text"))::"uuid") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Users can insert their own access logs" ON "public"."access_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own responses" ON "public"."stress_check_responses" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "employees"."user_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "stress_check_responses"."employee_id"))));



CREATE POLICY "Users can view their own responses" ON "public"."stress_check_responses" FOR SELECT USING (("auth"."uid"() = ( SELECT "employees"."user_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "stress_check_responses"."employee_id"))));



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "access_logs_insert_anon" ON "public"."access_logs" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "access_logs_insert_authenticated" ON "public"."access_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "access_logs_select_service_role" ON "public"."access_logs" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_usage_logs_tenant_isolation" ON "public"."ai_usage_logs" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_tenant_delete" ON "public"."announcements" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "announcements_tenant_insert" ON "public"."announcements" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "announcements_tenant_select" ON "public"."announcements" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "announcements_tenant_update" ON "public"."announcements" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."app_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_role_service" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_select_app_role" ON "public"."app_role" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."candidate_pulses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidate_pulses_tenant_delete" ON "public"."candidate_pulses" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_insert" ON "public"."candidate_pulses" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_select" ON "public"."candidate_pulses" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_update" ON "public"."candidate_pulses" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."closure_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "closure_audit_logs_tenant_insert" ON "public"."closure_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "closure_audit_logs_tenant_select" ON "public"."closure_audit_logs" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "closure_audit_logs_tenant_update" ON "public"."closure_audit_logs" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."closure_warnings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "closure_warnings_tenant_insert" ON "public"."closure_warnings" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "closure_warnings_tenant_select" ON "public"."closure_warnings" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "closure_warnings_tenant_update" ON "public"."closure_warnings" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "divisions_delete_same_tenant" ON "public"."divisions" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_insert_same_tenant" ON "public"."divisions" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_select_same_tenant" ON "public"."divisions" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_update_same_tenant" ON "public"."divisions" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."doctor_availability_slots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doctor_availability_slots_doctor_nurse_all" ON "public"."doctor_availability_slots" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "doctor_availability_slots_employee_select" ON "public"."doctor_availability_slots" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "doctor_availability_slots_hr_select" ON "public"."doctor_availability_slots" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"]))));



CREATE POLICY "doctor_availability_slots_supa_all" ON "public"."doctor_availability_slots" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_delete_same_tenant" ON "public"."employees" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "employees_insert_same_tenant" ON "public"."employees" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "employees_select_same_tenant" ON "public"."employees" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "employees_update_same_tenant" ON "public"."employees" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "global_select_app_role" ON "public"."app_role" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "global_select_app_role_service" ON "public"."app_role_service" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "global_select_service" ON "public"."service" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "global_select_service_category" ON "public"."service_category" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "global_write_app_role" ON "public"."app_role" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "global_write_app_role_service" ON "public"."app_role_service" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "global_write_service" ON "public"."service" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "global_write_service_category" ON "public"."service_category" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."health_assessments_link" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "health_assessments_link_tenant_delete" ON "public"."health_assessments_link" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "health_assessments_link_tenant_insert" ON "public"."health_assessments_link" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "health_assessments_link_tenant_select" ON "public"."health_assessments_link" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "health_assessments_link_tenant_update" ON "public"."health_assessments_link" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."interventions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interventions_tenant_delete" ON "public"."interventions" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "interventions_tenant_insert" ON "public"."interventions" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "interventions_tenant_select" ON "public"."interventions" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "interventions_tenant_update" ON "public"."interventions" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_postings_public_select" ON "public"."job_postings" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "job_postings_tenant_delete" ON "public"."job_postings" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_insert" ON "public"."job_postings" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_select" ON "public"."job_postings" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_update" ON "public"."job_postings" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."monthly_employee_overtime" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "monthly_employee_overtime_tenant_insert" ON "public"."monthly_employee_overtime" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "monthly_employee_overtime_tenant_select" ON "public"."monthly_employee_overtime" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "monthly_employee_overtime_tenant_update" ON "public"."monthly_employee_overtime" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."monthly_overtime_closures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "monthly_overtime_closures_tenant_delete" ON "public"."monthly_overtime_closures" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "monthly_overtime_closures_tenant_insert" ON "public"."monthly_overtime_closures" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "monthly_overtime_closures_tenant_select" ON "public"."monthly_overtime_closures" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "monthly_overtime_closures_tenant_update" ON "public"."monthly_overtime_closures" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."myou_alert_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."overtime_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_alerts_select_employee_or_hr" ON "public"."overtime_alerts" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("employee_id" = "public"."current_employee_id"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



CREATE POLICY "overtime_alerts_tenant_delete" ON "public"."overtime_alerts" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_alerts_tenant_insert" ON "public"."overtime_alerts" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_alerts_tenant_update" ON "public"."overtime_alerts" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."overtime_analysis_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_analysis_results_tenant_delete" ON "public"."overtime_analysis_results" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_analysis_results_tenant_insert" ON "public"."overtime_analysis_results" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_analysis_results_tenant_select" ON "public"."overtime_analysis_results" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_analysis_results_tenant_update" ON "public"."overtime_analysis_results" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."overtime_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_applications_tenant_delete" ON "public"."overtime_applications" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_applications_tenant_insert" ON "public"."overtime_applications" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_applications_tenant_select" ON "public"."overtime_applications" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_applications_tenant_update" ON "public"."overtime_applications" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."overtime_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_corrections_tenant_delete" ON "public"."overtime_corrections" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."overtime_applications" "o"
  WHERE (("o"."id" = "overtime_corrections"."application_id") AND ("o"."tenant_id" = "public"."current_tenant_id"())))));



CREATE POLICY "overtime_corrections_tenant_insert" ON "public"."overtime_corrections" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."overtime_applications" "o"
  WHERE (("o"."id" = "overtime_corrections"."application_id") AND ("o"."tenant_id" = "public"."current_tenant_id"())))));



CREATE POLICY "overtime_corrections_tenant_select" ON "public"."overtime_corrections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."overtime_applications" "o"
  WHERE (("o"."id" = "overtime_corrections"."application_id") AND ("o"."tenant_id" = "public"."current_tenant_id"())))));



CREATE POLICY "overtime_corrections_tenant_update" ON "public"."overtime_corrections" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."overtime_applications" "o"
  WHERE (("o"."id" = "overtime_corrections"."application_id") AND ("o"."tenant_id" = "public"."current_tenant_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."overtime_applications" "o"
  WHERE (("o"."id" = "overtime_corrections"."application_id") AND ("o"."tenant_id" = "public"."current_tenant_id"())))));



ALTER TABLE "public"."overtime_monthly_stats" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_monthly_stats_select_employee_or_hr" ON "public"."overtime_monthly_stats" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("employee_id" = "public"."current_employee_id"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



CREATE POLICY "overtime_monthly_stats_tenant_delete" ON "public"."overtime_monthly_stats" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_monthly_stats_tenant_insert" ON "public"."overtime_monthly_stats" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_monthly_stats_tenant_update" ON "public"."overtime_monthly_stats" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."overtime_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "overtime_settings_tenant_insert" ON "public"."overtime_settings" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_settings_tenant_select" ON "public"."overtime_settings" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "overtime_settings_tenant_update" ON "public"."overtime_settings" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."program_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "program_targets_tenant_delete" ON "public"."program_targets" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "program_targets_tenant_insert" ON "public"."program_targets" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "program_targets_tenant_select" ON "public"."program_targets" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "program_targets_tenant_update" ON "public"."program_targets" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_survey_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_survey_periods_tenant_delete" ON "public"."pulse_survey_periods" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_survey_periods_tenant_insert" ON "public"."pulse_survey_periods" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_survey_periods_tenant_select" ON "public"."pulse_survey_periods" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_survey_periods_tenant_update" ON "public"."pulse_survey_periods" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_survey_questions_tenant_isolation" ON "public"."pulse_survey_questions" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_survey_responses_tenant_isolation" ON "public"."pulse_survey_responses" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_templates_tenant_insert" ON "public"."pulse_templates" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_templates_tenant_select" ON "public"."pulse_templates" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_templates_tenant_update" ON "public"."pulse_templates" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."qr_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_audit_logs_tenant_delete" ON "public"."qr_audit_logs" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_audit_logs_tenant_insert" ON "public"."qr_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_audit_logs_tenant_select" ON "public"."qr_audit_logs" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_audit_logs_tenant_update" ON "public"."qr_audit_logs" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."qr_session_scans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_session_scans_tenant_delete" ON "public"."qr_session_scans" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_session_scans_tenant_insert" ON "public"."qr_session_scans" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_session_scans_tenant_select" ON "public"."qr_session_scans" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_session_scans_tenant_update" ON "public"."qr_session_scans" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."qr_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "qr_sessions_tenant_delete" ON "public"."qr_sessions" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_sessions_tenant_insert" ON "public"."qr_sessions" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_sessions_tenant_select" ON "public"."qr_sessions" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "qr_sessions_tenant_update" ON "public"."qr_sessions" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."questionnaire_answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_answers_delete" ON "public"."questionnaire_answers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaire_responses" "r"
  WHERE (("r"."id" = "questionnaire_answers"."response_id") AND ("r"."employee_id" = "public"."current_employee_id"()) AND ("r"."submitted_at" IS NULL)))));



CREATE POLICY "questionnaire_answers_insert" ON "public"."questionnaire_answers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."questionnaire_responses" "r"
  WHERE (("r"."id" = "questionnaire_answers"."response_id") AND ("r"."employee_id" = "public"."current_employee_id"()) AND ("r"."submitted_at" IS NULL)))));



CREATE POLICY "questionnaire_answers_select" ON "public"."questionnaire_answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaire_responses" "r"
  WHERE (("r"."id" = "questionnaire_answers"."response_id") AND ("r"."tenant_id" = "public"."current_tenant_id"()) AND (("r"."employee_id" = "public"."current_employee_id"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))))));



ALTER TABLE "public"."questionnaire_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_assignments_delete" ON "public"."questionnaire_assignments" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))));



CREATE POLICY "questionnaire_assignments_insert" ON "public"."questionnaire_assignments" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))));



CREATE POLICY "questionnaire_assignments_select" ON "public"."questionnaire_assignments" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."questionnaire_question_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_question_items_delete" ON "public"."questionnaire_question_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_items"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_question_items_insert" ON "public"."questionnaire_question_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_items"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_question_items_select" ON "public"."questionnaire_question_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_items"."question_id") AND (("q"."creator_type" = 'system'::"text") OR ("q"."tenant_id" = "public"."current_tenant_id"()))))));



CREATE POLICY "questionnaire_question_items_update" ON "public"."questionnaire_question_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_items"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



ALTER TABLE "public"."questionnaire_question_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_question_options_delete" ON "public"."questionnaire_question_options" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_options"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_question_options_insert" ON "public"."questionnaire_question_options" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_options"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_question_options_select" ON "public"."questionnaire_question_options" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_options"."question_id") AND (("q"."creator_type" = 'system'::"text") OR ("q"."tenant_id" = "public"."current_tenant_id"()))))));



CREATE POLICY "questionnaire_question_options_update" ON "public"."questionnaire_question_options" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."questionnaire_questions" "qq"
     JOIN "public"."questionnaires" "q" ON (("q"."id" = "qq"."questionnaire_id")))
  WHERE (("qq"."id" = "questionnaire_question_options"."question_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



ALTER TABLE "public"."questionnaire_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_questions_delete" ON "public"."questionnaire_questions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_questions"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_questions_insert" ON "public"."questionnaire_questions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_questions"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_questions_select" ON "public"."questionnaire_questions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_questions"."questionnaire_id") AND (("q"."creator_type" = 'system'::"text") OR ("q"."tenant_id" = "public"."current_tenant_id"()))))));



CREATE POLICY "questionnaire_questions_update" ON "public"."questionnaire_questions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_questions"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



ALTER TABLE "public"."questionnaire_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_responses_insert" ON "public"."questionnaire_responses" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "questionnaire_responses_select" ON "public"."questionnaire_responses" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("employee_id" = "public"."current_employee_id"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



CREATE POLICY "questionnaire_responses_update" ON "public"."questionnaire_responses" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"()) AND ("submitted_at" IS NULL))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



ALTER TABLE "public"."questionnaire_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaire_sections_delete" ON "public"."questionnaire_sections" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_sections"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_sections_insert" ON "public"."questionnaire_sections" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_sections"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



CREATE POLICY "questionnaire_sections_select" ON "public"."questionnaire_sections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_sections"."questionnaire_id") AND (("q"."creator_type" = 'system'::"text") OR ("q"."tenant_id" = "public"."current_tenant_id"()))))));



CREATE POLICY "questionnaire_sections_update" ON "public"."questionnaire_sections" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."questionnaires" "q"
  WHERE (("q"."id" = "questionnaire_sections"."questionnaire_id") AND ("q"."status" = 'draft'::"text") AND ((("q"."creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("q"."creator_type" = 'tenant'::"text") AND ("q"."tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))))));



ALTER TABLE "public"."questionnaires" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaires_delete" ON "public"."questionnaires" FOR DELETE TO "authenticated" USING ((("status" = ANY (ARRAY['draft'::"text", 'closed'::"text"])) AND ((("creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("creator_type" = 'tenant'::"text") AND ("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))));



CREATE POLICY "questionnaires_insert" ON "public"."questionnaires" FOR INSERT TO "authenticated" WITH CHECK (((("creator_type" = 'system'::"text") AND ("tenant_id" IS NULL) AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("creator_type" = 'tenant'::"text") AND ("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



CREATE POLICY "questionnaires_select" ON "public"."questionnaires" FOR SELECT TO "authenticated" USING ((("creator_type" = 'system'::"text") OR ("tenant_id" = "public"."current_tenant_id"())));



CREATE POLICY "questionnaires_update" ON "public"."questionnaires" FOR UPDATE TO "authenticated" USING (((("creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("creator_type" = 'tenant'::"text") AND ("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"]))))) WITH CHECK (((("creator_type" = 'system'::"text") AND ("public"."current_employee_app_role"() = 'developer'::"text")) OR (("creator_type" = 'tenant'::"text") AND ("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



ALTER TABLE "public"."recruitment_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recruitment_jobs_delete_same_tenant" ON "public"."recruitment_jobs" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_insert_same_tenant" ON "public"."recruitment_jobs" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_select_same_tenant" ON "public"."recruitment_jobs" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_update_same_tenant" ON "public"."recruitment_jobs" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "sc_group_select_authorized" ON "public"."stress_check_group_analysis" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'company_doctor'::"text", 'company_nurse'::"text", 'hsc'::"text"]))));



CREATE POLICY "sc_group_write_service_role" ON "public"."stress_check_group_analysis" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "sc_interviews_insert_doctor" ON "public"."stress_check_interviews" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_interviews_select_doctor" ON "public"."stress_check_interviews" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_interviews_select_hr_consented" ON "public"."stress_check_interviews" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."stress_check_submissions" "s"
  WHERE (("s"."period_id" = "stress_check_interviews"."period_id") AND ("s"."employee_id" = "stress_check_interviews"."employee_id") AND ("s"."consent_to_employer" = true))))));



CREATE POLICY "sc_interviews_select_own" ON "public"."stress_check_interviews" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_interviews_update_doctor" ON "public"."stress_check_interviews" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_periods_delete_same_tenant" ON "public"."stress_check_periods" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "sc_periods_insert_same_tenant" ON "public"."stress_check_periods" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "sc_periods_select_same_tenant" ON "public"."stress_check_periods" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "sc_periods_update_same_tenant" ON "public"."stress_check_periods" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "sc_questions_select_authenticated" ON "public"."stress_check_questions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "sc_questions_write_service_role" ON "public"."stress_check_questions" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "sc_responses_insert_own" ON "public"."stress_check_responses" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_responses_select_implementer" ON "public"."stress_check_responses" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_responses_select_own" ON "public"."stress_check_responses" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_responses_update_own" ON "public"."stress_check_responses" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_results_select_hr_consented" ON "public"."stress_check_results" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."stress_check_submissions" "s"
  WHERE (("s"."period_id" = "stress_check_results"."period_id") AND ("s"."employee_id" = "stress_check_results"."employee_id") AND ("s"."consent_to_employer" = true))))));



CREATE POLICY "sc_results_select_implementer" ON "public"."stress_check_results" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_results_select_own" ON "public"."stress_check_results" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_results_write_service_role" ON "public"."stress_check_results" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "sc_submissions_insert_own" ON "public"."stress_check_submissions" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_submissions_select_hr" ON "public"."stress_check_submissions" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"]))));



CREATE POLICY "sc_submissions_select_implementer" ON "public"."stress_check_submissions" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "sc_submissions_select_own" ON "public"."stress_check_submissions" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "sc_submissions_update_own" ON "public"."stress_check_submissions" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("employee_id" = "public"."current_employee_id"())));



CREATE POLICY "scale_conversions_select_all" ON "public"."stress_check_scale_conversions" FOR SELECT USING (true);



ALTER TABLE "public"."service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_assignments_tenant_delete" ON "public"."service_assignments" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_tenant_insert" ON "public"."service_assignments" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_tenant_select" ON "public"."service_assignments" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_tenant_update" ON "public"."service_assignments" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."service_assignments_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_assignments_users_tenant_delete" ON "public"."service_assignments_users" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_users_tenant_insert" ON "public"."service_assignments_users" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_users_tenant_select" ON "public"."service_assignments_users" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "service_assignments_users_tenant_update" ON "public"."service_assignments_users" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."service_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_group_analysis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_high_stress_criteria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_response_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_scale_conversions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_check_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stress_interview_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stress_interview_records_doctor_nurse_all" ON "public"."stress_interview_records" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['company_doctor'::"text", 'company_nurse'::"text"]))));



CREATE POLICY "stress_interview_records_employee_insert_own" ON "public"."stress_interview_records" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("interviewee_id" = "public"."current_employee_id"()) AND ("status" = 'scheduled'::"text")));



CREATE POLICY "stress_interview_records_employee_select_own" ON "public"."stress_interview_records" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("interviewee_id" = "public"."current_employee_id"())));



CREATE POLICY "stress_interview_records_employee_update_own" ON "public"."stress_interview_records" FOR UPDATE USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("interviewee_id" = "public"."current_employee_id"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("interviewee_id" = "public"."current_employee_id"()) AND ("status" = ANY (ARRAY['scheduled'::"text", 'cancelled'::"text"]))));



CREATE POLICY "stress_interview_records_hr_select_consented" ON "public"."stress_interview_records" FOR SELECT USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."stress_check_results" "sr"
     JOIN "public"."stress_check_submissions" "s" ON ((("s"."period_id" = "sr"."period_id") AND ("s"."employee_id" = "sr"."employee_id") AND ("s"."consent_to_employer" = true))))
  WHERE ("sr"."id" = "stress_interview_records"."stress_result_id")))));



CREATE POLICY "stress_interview_records_supa_all" ON "public"."stress_interview_records" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_access_logs_all" ON "public"."access_logs" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_divisions_all" ON "public"."divisions" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_employees_all" ON "public"."employees" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_recruitment_jobs_all" ON "public"."recruitment_jobs" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_group_all" ON "public"."stress_check_group_analysis" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_interviews_all" ON "public"."stress_check_interviews" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_periods_all" ON "public"."stress_check_periods" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_questions_all" ON "public"."stress_check_questions" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_responses_all" ON "public"."stress_check_responses" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_results_all" ON "public"."stress_check_results" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_sc_submissions_all" ON "public"."stress_check_submissions" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_tenant_service_all" ON "public"."tenant_service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_tenants_all" ON "public"."tenants" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_app_role" ON "public"."app_role" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_app_role_service" ON "public"."app_role_service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service" ON "public"."service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service_category" ON "public"."service_category" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service_v2" ON "public"."service" TO "authenticated" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



ALTER TABLE "public"."supervisor_qr_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supervisor_qr_permissions_supervisor_delete" ON "public"."supervisor_qr_permissions" FOR DELETE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("supervisor_user_id" = "auth"."uid"())));



CREATE POLICY "supervisor_qr_permissions_supervisor_insert" ON "public"."supervisor_qr_permissions" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("supervisor_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "supervisor_qr_permissions"."employee_user_id") AND ("e"."tenant_id" = "e"."tenant_id"))))));



CREATE POLICY "supervisor_qr_permissions_supervisor_update" ON "public"."supervisor_qr_permissions" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("supervisor_user_id" = "auth"."uid"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"]))))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."employees" "e"
  WHERE (("e"."user_id" = "supervisor_qr_permissions"."employee_user_id") AND ("e"."tenant_id" = "e"."tenant_id")))) AND (("supervisor_user_id" = "auth"."uid"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])))));



CREATE POLICY "supervisor_qr_permissions_tenant_select" ON "public"."supervisor_qr_permissions" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_questions_isolate" ON "public"."survey_questions" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_responses_isolate" ON "public"."survey_responses" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."telework_activity_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telework_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telework_pc_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telework_pc_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."telework_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_inquiry_chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_inquiry_chat_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_inquiry_messages_insert_own" ON "public"."tenant_inquiry_chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "tenant_inquiry_messages_select_session" ON "public"."tenant_inquiry_chat_messages" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("user_id" = "auth"."uid"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])))));



CREATE POLICY "tenant_inquiry_sessions_insert_own" ON "public"."tenant_inquiry_chat_sessions" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "tenant_inquiry_sessions_select_own_or_hr" ON "public"."tenant_inquiry_chat_sessions" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("user_id" = "auth"."uid"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"])))));



CREATE POLICY "tenant_inquiry_sessions_update_own" ON "public"."tenant_inquiry_chat_sessions" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"()))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."tenant_portal_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_portal_settings_tenant_insert" ON "public"."tenant_portal_settings" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_portal_settings_tenant_select" ON "public"."tenant_portal_settings" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_portal_settings_tenant_update" ON "public"."tenant_portal_settings" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenant_rag_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_rag_audit_logs_insert_tenant" ON "public"."tenant_rag_audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_audit_logs_select_tenant" ON "public"."tenant_rag_audit_logs" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"()));



ALTER TABLE "public"."tenant_rag_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_rag_chunks_delete_tenant" ON "public"."tenant_rag_chunks" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_chunks_insert_tenant" ON "public"."tenant_rag_chunks" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_chunks_select_tenant" ON "public"."tenant_rag_chunks" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_chunks_update_tenant" ON "public"."tenant_rag_chunks" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"())) WITH CHECK (("tenant_id" = "public"."rag_session_tenant_id"()));



ALTER TABLE "public"."tenant_rag_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_rag_documents_delete_tenant" ON "public"."tenant_rag_documents" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_documents_insert_tenant" ON "public"."tenant_rag_documents" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_documents_select_tenant" ON "public"."tenant_rag_documents" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"()));



CREATE POLICY "tenant_rag_documents_update_tenant" ON "public"."tenant_rag_documents" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."rag_session_tenant_id"())) WITH CHECK (("tenant_id" = "public"."rag_session_tenant_id"()));



ALTER TABLE "public"."tenant_service" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_service_delete_same_tenant" ON "public"."tenant_service" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_insert_same_tenant" ON "public"."tenant_service" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_select_same_tenant" ON "public"."tenant_service" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_update_same_tenant" ON "public"."tenant_service" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_select_same_tenant" ON "public"."tenants" FOR SELECT USING (("id" = "public"."current_tenant_id"()));



CREATE POLICY "tenants_update_same_tenant" ON "public"."tenants" FOR UPDATE USING (("id" = "public"."current_tenant_id"())) WITH CHECK (("id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."timecard_corrections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timecard_corrections_tenant_insert" ON "public"."timecard_corrections" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "timecard_corrections_tenant_select" ON "public"."timecard_corrections" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "timecard_corrections_tenant_update" ON "public"."timecard_corrections" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tw_audit_insert" ON "public"."telework_audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND (("actor_user_id" IS NULL) OR ("actor_user_id" = "auth"."uid"()))));



CREATE POLICY "tw_audit_select" ON "public"."telework_audit_logs" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tw_devices_hr_select" ON "public"."telework_pc_devices" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text"]))));



CREATE POLICY "tw_devices_insert" ON "public"."telework_pc_devices" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_devices_select" ON "public"."telework_pc_devices" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("approved" = true) OR ("auth"."uid"() = "user_id"))));



CREATE POLICY "tw_devices_update" ON "public"."telework_pc_devices" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_logs_insert" ON "public"."telework_pc_logs" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_logs_select" ON "public"."telework_pc_logs" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_sessions_insert" ON "public"."telework_sessions" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_sessions_select" ON "public"."telework_sessions" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tw_sessions_update" ON "public"."telework_sessions" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_stats_insert" ON "public"."telework_activity_stats" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_stats_select" ON "public"."telework_activity_stats" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "tw_stats_update" ON "public"."telework_activity_stats" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id"))) WITH CHECK ((("tenant_id" = "public"."current_tenant_id"()) AND ("auth"."uid"() = "user_id")));



CREATE POLICY "wip_delete_same_tenant" ON "public"."workplace_improvement_plans" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "wip_insert_same_tenant" ON "public"."workplace_improvement_plans" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "wip_select_same_tenant" ON "public"."workplace_improvement_plans" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "wip_update_same_tenant" ON "public"."workplace_improvement_plans" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."work_time_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_time_records_select_employee_or_hr" ON "public"."work_time_records" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."current_tenant_id"()) AND (("employee_id" = "public"."current_employee_id"()) OR ("public"."current_employee_app_role"() = ANY (ARRAY['hr'::"text", 'hr_manager'::"text", 'developer'::"text"])))));



CREATE POLICY "work_time_records_tenant_delete" ON "public"."work_time_records" FOR DELETE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "work_time_records_tenant_insert" ON "public"."work_time_records" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "work_time_records_tenant_update" ON "public"."work_time_records" FOR UPDATE TO "authenticated" USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."workplace_improvement_plans" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."qr_session_scans";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";




















































































































































































REVOKE ALL ON FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aggregate_monthly_closure"("p_closure_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_employee_app_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_employee_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_employee_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_employee_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_employee_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_employee_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_timecard_anomalies"("p_tenant_id" "uuid", "p_year_month" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_supervisor_qr_permission_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid", "p_audit_action" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid", "p_audit_action" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_bulk_import_apply"("p_tenant_id" "uuid", "p_supervisor_user_id" "uuid", "p_employee_user_id" "uuid", "p_can_display" boolean, "p_scope" "text", "p_actor_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_grant_self"("p_employee_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_supervisor_qr_permission_revoke_self"("p_permission_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_36_risk_employees"("p_tenant_id" "uuid", "p_year_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_department_overtime_summary"("p_tenant_id" "uuid", "p_year_month" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_overtime_gap_analysis"("p_tenant_id" "uuid", "p_year_month" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_overtime_trend"("p_tenant_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_employee_auth_email"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_work_time_record_monthly_counts"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_tenant_rag_chunks"("query_embedding" "public"."vector", "match_count" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rag_session_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rag_session_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."rag_session_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rag_session_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_service_assignment_users"("p_service_assignment_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_overtime_settings"("p_monthly_limit_hours" integer, "p_monthly_warning_hours" integer, "p_annual_limit_hours" integer, "p_average_limit_hours" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_tenant_portal_settings"("p_hr_inquiry_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";















GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."app_role" TO "anon";
GRANT ALL ON TABLE "public"."app_role" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role" TO "service_role";



GRANT ALL ON TABLE "public"."app_role_service" TO "anon";
GRANT ALL ON TABLE "public"."app_role_service" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role_service" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_pulses" TO "anon";
GRANT ALL ON TABLE "public"."candidate_pulses" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_pulses" TO "service_role";



GRANT ALL ON TABLE "public"."closure_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."closure_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."closure_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."closure_warnings" TO "anon";
GRANT ALL ON TABLE "public"."closure_warnings" TO "authenticated";
GRANT ALL ON TABLE "public"."closure_warnings" TO "service_role";



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."doctor_availability_slots" TO "anon";
GRANT ALL ON TABLE "public"."doctor_availability_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."doctor_availability_slots" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."health_assessments_link" TO "anon";
GRANT ALL ON TABLE "public"."health_assessments_link" TO "authenticated";
GRANT ALL ON TABLE "public"."health_assessments_link" TO "service_role";



GRANT ALL ON TABLE "public"."interventions" TO "anon";
GRANT ALL ON TABLE "public"."interventions" TO "authenticated";
GRANT ALL ON TABLE "public"."interventions" TO "service_role";



GRANT ALL ON TABLE "public"."job_postings" TO "anon";
GRANT ALL ON TABLE "public"."job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_employee_overtime" TO "anon";
GRANT ALL ON TABLE "public"."monthly_employee_overtime" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_employee_overtime" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_overtime_closures" TO "anon";
GRANT ALL ON TABLE "public"."monthly_overtime_closures" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_overtime_closures" TO "service_role";



GRANT ALL ON TABLE "public"."myou_alert_logs" TO "anon";
GRANT ALL ON TABLE "public"."myou_alert_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_alert_logs" TO "service_role";



GRANT ALL ON TABLE "public"."myou_companies" TO "anon";
GRANT ALL ON TABLE "public"."myou_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_companies" TO "service_role";



GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."myou_products" TO "anon";
GRANT ALL ON TABLE "public"."myou_products" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_products" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_alerts" TO "anon";
GRANT ALL ON TABLE "public"."overtime_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_analysis_results" TO "anon";
GRANT ALL ON TABLE "public"."overtime_analysis_results" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_analysis_results" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_applications" TO "anon";
GRANT ALL ON TABLE "public"."overtime_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_applications" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_corrections" TO "anon";
GRANT ALL ON TABLE "public"."overtime_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_monthly_stats" TO "anon";
GRANT ALL ON TABLE "public"."overtime_monthly_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_monthly_stats" TO "service_role";



GRANT ALL ON TABLE "public"."overtime_settings" TO "anon";
GRANT ALL ON TABLE "public"."overtime_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."overtime_settings" TO "service_role";



GRANT ALL ON TABLE "public"."program_targets" TO "anon";
GRANT ALL ON TABLE "public"."program_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."program_targets" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_periods" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_periods" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_templates" TO "anon";
GRANT ALL ON TABLE "public"."pulse_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_templates" TO "service_role";



GRANT ALL ON TABLE "public"."qr_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."qr_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."qr_session_scans" TO "anon";
GRANT ALL ON TABLE "public"."qr_session_scans" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_session_scans" TO "service_role";



GRANT ALL ON TABLE "public"."qr_sessions" TO "anon";
GRANT ALL ON TABLE "public"."qr_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_answers" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_answers" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_assignments" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_question_items" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_question_items" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_question_items" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_question_options" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_question_options" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_questions" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_questions" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_responses" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_responses" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_sections" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_sections" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_jobs" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."service" TO "anon";
GRANT ALL ON TABLE "public"."service" TO "authenticated";
GRANT ALL ON TABLE "public"."service" TO "service_role";



GRANT ALL ON TABLE "public"."service_assignments" TO "anon";
GRANT ALL ON TABLE "public"."service_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."service_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."service_assignments_users" TO "anon";
GRANT ALL ON TABLE "public"."service_assignments_users" TO "authenticated";
GRANT ALL ON TABLE "public"."service_assignments_users" TO "service_role";



GRANT ALL ON TABLE "public"."service_category" TO "anon";
GRANT ALL ON TABLE "public"."service_category" TO "authenticated";
GRANT ALL ON TABLE "public"."service_category" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_high_stress_criteria" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_high_stress_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_high_stress_criteria" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_interviews" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_periods" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_periods" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_questions" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_questions" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_response_options" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_response_options" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_response_options" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_responses" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_responses" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_results" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_results" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_results" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_submissions" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."stress_group_analysis" TO "anon";
GRANT ALL ON TABLE "public"."stress_group_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_group_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."stress_interview_records" TO "anon";
GRANT ALL ON TABLE "public"."stress_interview_records" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_interview_records" TO "service_role";



GRANT ALL ON TABLE "public"."supervisor_qr_permissions" TO "anon";
GRANT ALL ON TABLE "public"."supervisor_qr_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."supervisor_qr_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."telework_activity_stats" TO "anon";
GRANT ALL ON TABLE "public"."telework_activity_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."telework_activity_stats" TO "service_role";



GRANT ALL ON TABLE "public"."telework_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."telework_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."telework_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."telework_pc_devices" TO "anon";
GRANT ALL ON TABLE "public"."telework_pc_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."telework_pc_devices" TO "service_role";



GRANT ALL ON TABLE "public"."telework_pc_logs" TO "anon";
GRANT ALL ON TABLE "public"."telework_pc_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."telework_pc_logs" TO "service_role";



GRANT ALL ON TABLE "public"."telework_sessions" TO "anon";
GRANT ALL ON TABLE "public"."telework_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."telework_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_inquiry_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."tenant_inquiry_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_inquiry_chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_inquiry_chat_sessions" TO "anon";
GRANT ALL ON TABLE "public"."tenant_inquiry_chat_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_inquiry_chat_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_portal_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_portal_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_portal_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_rag_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."tenant_rag_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_rag_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_rag_chunks" TO "anon";
GRANT ALL ON TABLE "public"."tenant_rag_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_rag_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_rag_documents" TO "anon";
GRANT ALL ON TABLE "public"."tenant_rag_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_rag_documents" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_service" TO "anon";
GRANT ALL ON TABLE "public"."tenant_service" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_service" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."timecard_corrections" TO "anon";
GRANT ALL ON TABLE "public"."timecard_corrections" TO "authenticated";
GRANT ALL ON TABLE "public"."timecard_corrections" TO "service_role";



GRANT ALL ON TABLE "public"."work_time_records" TO "anon";
GRANT ALL ON TABLE "public"."work_time_records" TO "authenticated";
GRANT ALL ON TABLE "public"."work_time_records" TO "service_role";



GRANT ALL ON TABLE "public"."workplace_improvement_plans" TO "anon";
GRANT ALL ON TABLE "public"."workplace_improvement_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."workplace_improvement_plans" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































