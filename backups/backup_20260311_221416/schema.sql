


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


CREATE SCHEMA IF NOT EXISTS "api";


ALTER SCHEMA "api" OWNER TO "supabase_admin";


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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
    phone_change, phone_change_token,
    reauthentication_token,
    is_super_admin, raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    p_email, v_encrypted_password,
    NOW(), NOW(), NOW(),
    '', '',
    '', '', '',
    '', '',
    '',
    false,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    created_at, updated_at, last_sign_in_at
  ) VALUES (
    gen_random_uuid(), v_user_id, p_email,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email, 'email_verified', true, 'provider', 'email'),
    'email', NOW(), NOW(), NOW()
  );

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") OWNER TO "supabase_admin";


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
    -- 外部キー制約のあるテーブルから削除
    DELETE FROM public.employees WHERE user_id = p_user_id;
    -- Identityを削除
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    -- ユーザー本体を削除
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer DEFAULT 168) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- 32バイトのランダム hex トークンを生成（平文のまま保存）
  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE auth.users
  SET 
    recovery_token = v_token,
    recovery_sent_at = NOW()
  WHERE id = p_user_id;

  RETURN v_token;
END;
$$;


ALTER FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public'
    AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;


ALTER FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


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
      recovery_token = '',
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") OWNER TO "supabase_admin";


CREATE OR REPLACE FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer DEFAULT 336) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'auth', 'public', 'extensions'
    AS $$
DECLARE
  v_user_id UUID;
  v_stored_token TEXT;
  v_sent_at TIMESTAMPTZ;
BEGIN
  -- メールアドレスでユーザーを検索（トークン比較はWHERE外で行う）
  SELECT id, recovery_token, recovery_sent_at
  INTO v_user_id, v_stored_token, v_sent_at
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません';
  END IF;

  IF v_stored_token IS NULL OR v_stored_token = '' THEN
    RAISE EXCEPTION 'リカバリートークンが設定されていません';
  END IF;

  -- 有効期限チェック
  IF v_sent_at IS NULL OR v_sent_at + (p_expiry_hours || ' hours')::interval < NOW() THEN
    RAISE EXCEPTION 'トークンの有効期限が切れています';
  END IF;

  -- 平文で直接比較
  IF v_stored_token != p_token THEN
    RAISE EXCEPTION 'トークンが一致しません';
  END IF;

  -- トークン消費（再利用防止）
  UPDATE auth.users
  SET recovery_token = '', recovery_sent_at = NULL
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;


ALTER FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) OWNER TO "supabase_admin";

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


ALTER TABLE "public"."ai_usage_logs" OWNER TO "supabase_admin";


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


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text",
    "parent_id" "uuid",
    "layer" integer,
    "code" "text"
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."myou_alert_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "target_serials" "text"[],
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_alert_logs" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."myou_companies" (
    "company_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_name" "text" NOT NULL,
    "email_address" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_companies" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."myou_delivery_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "serial_number" "text",
    "company_id" "uuid",
    "delivery_date" timestamp with time zone DEFAULT "now"(),
    "scanned_by" "uuid",
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_delivery_logs" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."myou_products" (
    "serial_number" "text" NOT NULL,
    "expiration_date" "date" NOT NULL,
    "product_name" "text" DEFAULT 'セルフィールMS'::"text",
    "status" "text" DEFAULT 'shipped'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" DEFAULT "public"."current_tenant_id"() NOT NULL
);


ALTER TABLE "public"."myou_products" OWNER TO "supabase_admin";


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


ALTER TABLE "public"."stress_check_high_stress_criteria" OWNER TO "supabase_admin";


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


ALTER TABLE "public"."stress_check_response_options" OWNER TO "supabase_admin";


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


ALTER TABLE "public"."stress_check_scale_conversions" OWNER TO "supabase_admin";


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
    "onboarding_completed_at" timestamp with time zone
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."plan_type" IS 'テナントの契約プラン (free / pro / enterprise)';



COMMENT ON COLUMN "public"."tenants"."max_employees" IS 'テナントの従業員登録上限数';



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_role"
    ADD CONSTRAINT "app_role_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."myou_alert_logs"
    ADD CONSTRAINT "myou_alert_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."myou_companies"
    ADD CONSTRAINT "myou_companies_pkey" PRIMARY KEY ("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."myou_products"
    ADD CONSTRAINT "myou_products_pkey" PRIMARY KEY ("serial_number");



ALTER TABLE ONLY "public"."pulse_survey_questions"
    ADD CONSTRAINT "pulse_survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_survey_responses"
    ADD CONSTRAINT "pulse_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_templates"
    ADD CONSTRAINT "pulse_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "access_logs_created_at_idx" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "access_logs_tenant_id_idx" ON "public"."access_logs" USING "btree" ("tenant_id");



CREATE INDEX "access_logs_user_id_idx" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_access_logs_created_at" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_access_logs_tenant_created" ON "public"."access_logs" USING "btree" ("tenant_id", "created_at" DESC);



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



CREATE OR REPLACE TRIGGER "set_job_postings_updated_at" BEFORE UPDATE ON "public"."job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_check_max_employees" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."check_max_employees"();



CREATE OR REPLACE TRIGGER "trg_sc_interviews_updated_at" BEFORE UPDATE ON "public"."stress_check_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sc_periods_updated_at" BEFORE UPDATE ON "public"."stress_check_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_sc_submissions_updated_at" BEFORE UPDATE ON "public"."stress_check_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."access_logs"
    ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ai_usage_logs"
    ADD CONSTRAINT "ai_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "public"."app_role"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pulse_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."candidate_pulses"
    ADD CONSTRAINT "candidate_pulses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_app_role_id_fkey" FOREIGN KEY ("app_role_id") REFERENCES "public"."app_role"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."myou_alert_logs"
    ADD CONSTRAINT "myou_alert_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."myou_companies"("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."myou_companies"("company_id");



ALTER TABLE ONLY "public"."myou_delivery_logs"
    ADD CONSTRAINT "myou_delivery_logs_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "public"."myou_products"("serial_number");



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



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."survey_questions"
    ADD CONSTRAINT "survey_questions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."survey_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE "public"."app_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_role_service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidate_pulses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidate_pulses_tenant_delete" ON "public"."candidate_pulses" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_insert" ON "public"."candidate_pulses" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_select" ON "public"."candidate_pulses" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "candidate_pulses_tenant_update" ON "public"."candidate_pulses" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "divisions_delete_same_tenant" ON "public"."divisions" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_insert_same_tenant" ON "public"."divisions" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_select_same_tenant" ON "public"."divisions" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "divisions_update_same_tenant" ON "public"."divisions" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



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



ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_postings_public_select" ON "public"."job_postings" FOR SELECT USING (("status" = 'published'::"text"));



CREATE POLICY "job_postings_tenant_delete" ON "public"."job_postings" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_insert" ON "public"."job_postings" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_select" ON "public"."job_postings" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "job_postings_tenant_update" ON "public"."job_postings" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."myou_alert_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_delivery_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."myou_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_survey_questions_tenant_isolation" ON "public"."pulse_survey_questions" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_survey_responses_tenant_isolation" ON "public"."pulse_survey_responses" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."pulse_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pulse_templates_tenant_insert" ON "public"."pulse_templates" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_templates_tenant_select" ON "public"."pulse_templates" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "pulse_templates_tenant_update" ON "public"."pulse_templates" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"()));



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



ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_questions_isolate" ON "public"."survey_questions" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_responses_isolate" ON "public"."survey_responses" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenant_service" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_service_delete_same_tenant" ON "public"."tenant_service" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_insert_same_tenant" ON "public"."tenant_service" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_select_same_tenant" ON "public"."tenant_service" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_update_same_tenant" ON "public"."tenant_service" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_select_same_tenant" ON "public"."tenants" FOR SELECT USING (("id" = "public"."current_tenant_id"()));



CREATE POLICY "tenants_update_same_tenant" ON "public"."tenants" FOR UPDATE USING (("id" = "public"."current_tenant_id"())) WITH CHECK (("id" = "public"."current_tenant_id"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "api" TO "anon";
GRANT USAGE ON SCHEMA "api" TO "authenticated";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_auth_user"("p_email" "text", "p_password" "text") TO "postgres";
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



GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_auth_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recovery_token"("p_user_id" "uuid", "p_expiry_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "postgres";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_email"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_password"("p_user_id" "uuid", "p_new_password" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_recovery_token"("p_email" "text", "p_token" "text", "p_expiry_hours" integer) TO "service_role";
























GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_logs" TO "postgres";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."app_role" TO "anon";
GRANT ALL ON TABLE "public"."app_role" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role" TO "service_role";



GRANT ALL ON TABLE "public"."app_role_service" TO "anon";
GRANT ALL ON TABLE "public"."app_role_service" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role_service" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_pulses" TO "anon";
GRANT ALL ON TABLE "public"."candidate_pulses" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_pulses" TO "service_role";



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."job_postings" TO "anon";
GRANT ALL ON TABLE "public"."job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings" TO "service_role";



GRANT ALL ON TABLE "public"."myou_alert_logs" TO "postgres";
GRANT ALL ON TABLE "public"."myou_alert_logs" TO "anon";
GRANT ALL ON TABLE "public"."myou_alert_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_alert_logs" TO "service_role";



GRANT ALL ON TABLE "public"."myou_companies" TO "postgres";
GRANT ALL ON TABLE "public"."myou_companies" TO "anon";
GRANT ALL ON TABLE "public"."myou_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_companies" TO "service_role";



GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "postgres";
GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "anon";
GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_delivery_logs" TO "service_role";



GRANT ALL ON TABLE "public"."myou_products" TO "postgres";
GRANT ALL ON TABLE "public"."myou_products" TO "anon";
GRANT ALL ON TABLE "public"."myou_products" TO "authenticated";
GRANT ALL ON TABLE "public"."myou_products" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_templates" TO "anon";
GRANT ALL ON TABLE "public"."pulse_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_templates" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_jobs" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."service" TO "anon";
GRANT ALL ON TABLE "public"."service" TO "authenticated";
GRANT ALL ON TABLE "public"."service" TO "service_role";



GRANT ALL ON TABLE "public"."service_category" TO "anon";
GRANT ALL ON TABLE "public"."service_category" TO "authenticated";
GRANT ALL ON TABLE "public"."service_category" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_group_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_high_stress_criteria" TO "postgres";
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



GRANT ALL ON TABLE "public"."stress_check_response_options" TO "postgres";
GRANT ALL ON TABLE "public"."stress_check_response_options" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_response_options" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_response_options" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_responses" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_responses" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_results" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_results" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_results" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "postgres";
GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_scale_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."stress_check_submissions" TO "anon";
GRANT ALL ON TABLE "public"."stress_check_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."stress_check_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_questions" TO "anon";
GRANT ALL ON TABLE "public"."survey_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_service" TO "anon";
GRANT ALL ON TABLE "public"."tenant_service" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_service" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";









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































