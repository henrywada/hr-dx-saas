


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_auth_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select tenant_id
  from employees
  where id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_auth_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_auth_tenant_id"() IS '現在ログイン中のユーザーのtenant_idを取得するセキュリティ定義関数';



CREATE OR REPLACE FUNCTION "public"."is_developer"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from employees
    where id = auth.uid()
    and app_role = 'developer'
  );
$$;


ALTER FUNCTION "public"."is_developer"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_developer"() IS 'Check if the current user has the developer role';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_role" (
    "app_role" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."app_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_role_service" (
    "app_role" "text" NOT NULL,
    "service_id" "uuid" NOT NULL
);


ALTER TABLE "public"."app_role_service" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "layer" integer,
    "code" "text",
    "description" "text",
    CONSTRAINT "divisions_layer_check" CHECK ((("layer" >= 1) AND ("layer" <= 10)))
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


COMMENT ON TABLE "public"."divisions" IS '部署マスタ';



COMMENT ON COLUMN "public"."divisions"."tenant_id" IS 'テナントID';



COMMENT ON COLUMN "public"."divisions"."name" IS '部署名';



COMMENT ON COLUMN "public"."divisions"."parent_id" IS '親部署ID';



COMMENT ON COLUMN "public"."divisions"."layer" IS 'レイヤーの深さ (1～10)';



COMMENT ON COLUMN "public"."divisions"."code" IS '部署コード（テナント内で一意）';



COMMENT ON COLUMN "public"."divisions"."description" IS '部署の説明。例: レイヤー1は全社/本部、レイヤー2は事業所/工場、レイヤー3は部門/課';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "division_id" "uuid",
    "name" "text",
    "app_role" "text",
    "is_contacted_person" boolean DEFAULT false,
    "contacted_date" "text",
    "is_manager" boolean DEFAULT false NOT NULL,
    "group_name" "text",
    CONSTRAINT "check_app_role" CHECK (("app_role" = ANY (ARRAY['employee'::"text", 'hr_manager'::"text", 'hr'::"text", 'boss'::"text", 'company_doctor'::"text", 'company_nurse'::"text", 'hsc'::"text", 'developer'::"text", 'test'::"text", 'saas_adm'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON TABLE "public"."employees" IS '従業員マスタ';



COMMENT ON COLUMN "public"."employees"."tenant_id" IS 'テナントID';



COMMENT ON COLUMN "public"."employees"."division_id" IS '所属部署ID';



COMMENT ON COLUMN "public"."employees"."name" IS '氏名（暗号化）';



COMMENT ON COLUMN "public"."employees"."app_role" IS 'アプリケーションロール';



COMMENT ON COLUMN "public"."employees"."is_contacted_person" IS '連絡窓口担当者フラグ';



COMMENT ON COLUMN "public"."employees"."contacted_date" IS '連絡日（暗号化）';



COMMENT ON COLUMN "public"."employees"."is_manager" IS 'マネージャーフラグ';



COMMENT ON COLUMN "public"."employees"."group_name" IS '従業員が所属するグループ・チーム名（例: 開発チームA、営業第二グループ等）';



CREATE TABLE IF NOT EXISTS "public"."manager_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."manager_comments" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "intent_id" "uuid" NOT NULL,
    "calculated_score" numeric(3,2) NOT NULL,
    "threshold" numeric(3,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulse_alerts" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_configs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "delivery_day" integer DEFAULT 5,
    "delivery_time" time without time zone DEFAULT '16:00:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "survey_frequency" character varying(20) DEFAULT 'monthly'::character varying NOT NULL,
    "active_pack_id" "uuid",
    "active_theme_ids" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."pulse_configs" OWNER TO "supabase_admin";


COMMENT ON COLUMN "public"."pulse_configs"."survey_frequency" IS 'サーベイ実施頻度 (daily, weekly, monthly)';



CREATE TABLE IF NOT EXISTS "public"."pulse_intents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "pack_id" "uuid",
    "slug" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "objective" "text",
    "usage_tips" "text",
    "alarm_threshold" double precision DEFAULT 2.5,
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."pulse_intents" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_packs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_official" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulse_packs" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "intent_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "weight" double precision DEFAULT 1.0,
    "question_type" "text" DEFAULT 'rating_5'::"text",
    "choices" "jsonb",
    "order_index" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulse_questions" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_value" integer,
    "answer_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pulse_responses" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."pulse_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "intent_id" "uuid" NOT NULL,
    "overall_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "feedback_comment" "text"
);


ALTER TABLE "public"."pulse_sessions" OWNER TO "supabase_admin";


CREATE TABLE IF NOT EXISTS "public"."service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "service_category_id" "uuid" NOT NULL,
    "category" "text",
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "route_path" "text",
    "release_status" "text",
    "target_audience" "text",
    "title" "text",
    CONSTRAINT "service_release_status_check" CHECK (("release_status" = ANY (ARRAY['released'::"text", 'unreleased'::"text"]))),
    CONSTRAINT "service_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all_users'::"text", 'admins_only'::"text", 'saas_adm'::"text"])))
);


ALTER TABLE "public"."service" OWNER TO "postgres";


COMMENT ON TABLE "public"."service" IS 'サービスマスタ';



COMMENT ON COLUMN "public"."service"."name" IS 'サービス名';



COMMENT ON COLUMN "public"."service"."service_category_id" IS 'カテゴリID';



COMMENT ON COLUMN "public"."service"."category" IS 'カテゴリ分類テキスト';



COMMENT ON COLUMN "public"."service"."description" IS '説明';



COMMENT ON COLUMN "public"."service"."sort_order" IS 'ソート順';



COMMENT ON COLUMN "public"."service"."route_path" IS '遷移先パス';



COMMENT ON COLUMN "public"."service"."release_status" IS 'リリース状況 (released/unreleased)';



COMMENT ON COLUMN "public"."service"."target_audience" IS '利用対象 (all_users/admins_only/saas_adm)';



COMMENT ON COLUMN "public"."service"."title" IS 'タイトル';



CREATE TABLE IF NOT EXISTS "public"."service_category" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."service_category" OWNER TO "postgres";


COMMENT ON TABLE "public"."service_category" IS 'サービスカテゴリマスタ';



COMMENT ON COLUMN "public"."service_category"."name" IS 'カテゴリ名';



COMMENT ON COLUMN "public"."service_category"."description" IS '説明';



COMMENT ON COLUMN "public"."service_category"."sort_order" IS 'ソート順';



CREATE TABLE IF NOT EXISTS "public"."tenant_service" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "start_date" "date",
    "status" "text"
);


ALTER TABLE "public"."tenant_service" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_service" IS 'テナント契約サービス状況';



COMMENT ON COLUMN "public"."tenant_service"."tenant_id" IS 'テナントID';



COMMENT ON COLUMN "public"."tenant_service"."service_id" IS '契約サービスID';



COMMENT ON COLUMN "public"."tenant_service"."start_date" IS '利用開始日';



COMMENT ON COLUMN "public"."tenant_service"."status" IS 'ステータス';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_date" "date",
    "paid_amount" integer,
    "employee_count" integer,
    "paied_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenants" IS 'テナント管理テーブル';



COMMENT ON COLUMN "public"."tenants"."name" IS 'テナント名';



COMMENT ON COLUMN "public"."tenants"."contact_date" IS '連絡日';



COMMENT ON COLUMN "public"."tenants"."paid_amount" IS '支払金額';



COMMENT ON COLUMN "public"."tenants"."employee_count" IS '従業員数';



COMMENT ON COLUMN "public"."tenants"."paied_date" IS '支払日';



ALTER TABLE ONLY "public"."app_role"
    ADD CONSTRAINT "app_role_pkey" PRIMARY KEY ("app_role");



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_pkey" PRIMARY KEY ("app_role", "service_id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "manager_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "pulse_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_configs"
    ADD CONSTRAINT "pulse_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_packs"
    ADD CONSTRAINT "pulse_packs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_questions"
    ADD CONSTRAINT "pulse_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "pulse_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "pulse_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_category"
    ADD CONSTRAINT "service_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_divisions_tenant_layer" ON "public"."divisions" USING "btree" ("tenant_id", "layer");



CREATE INDEX "idx_divisions_tenant_parent" ON "public"."divisions" USING "btree" ("tenant_id", "parent_id");



CREATE INDEX "idx_manager_comments_manager" ON "public"."manager_comments" USING "btree" ("manager_id");



CREATE INDEX "idx_manager_comments_session" ON "public"."manager_comments" USING "btree" ("session_id");



CREATE INDEX "idx_pulse_alerts_created" ON "public"."pulse_alerts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pulse_alerts_employee" ON "public"."pulse_alerts" USING "btree" ("employee_id");



CREATE INDEX "idx_pulse_alerts_status" ON "public"."pulse_alerts" USING "btree" ("status");



CREATE INDEX "idx_pulse_alerts_tenant" ON "public"."pulse_alerts" USING "btree" ("tenant_id");



CREATE INDEX "idx_pulse_configs_tenant_id" ON "public"."pulse_configs" USING "btree" ("tenant_id");



CREATE INDEX "idx_pulse_responses_question_id" ON "public"."pulse_responses" USING "btree" ("question_id");



CREATE INDEX "idx_pulse_responses_session_id" ON "public"."pulse_responses" USING "btree" ("session_id");



CREATE INDEX "idx_pulse_responses_tenant_id" ON "public"."pulse_responses" USING "btree" ("tenant_id");



CREATE INDEX "idx_pulse_sessions_created_at" ON "public"."pulse_sessions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pulse_sessions_employee_id" ON "public"."pulse_sessions" USING "btree" ("employee_id");



CREATE INDEX "idx_pulse_sessions_intent_id" ON "public"."pulse_sessions" USING "btree" ("intent_id");



CREATE INDEX "idx_pulse_sessions_tenant_id" ON "public"."pulse_sessions" USING "btree" ("tenant_id");



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_app_role_fkey" FOREIGN KEY ("app_role") REFERENCES "public"."app_role"("app_role") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_role_service"
    ADD CONSTRAINT "app_role_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."divisions"("id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_intent" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_intent" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_manager" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_question" FOREIGN KEY ("question_id") REFERENCES "public"."pulse_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_configs"
    ADD CONSTRAINT "pulse_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."pulse_packs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pulse_packs"
    ADD CONSTRAINT "pulse_packs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."pulse_questions"
    ADD CONSTRAINT "pulse_questions_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."service_category"("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



CREATE POLICY "Developers can manage app_role" ON "public"."app_role" TO "authenticated" USING ("public"."is_developer"()) WITH CHECK ("public"."is_developer"());



CREATE POLICY "Developers can manage app_role_service" ON "public"."app_role_service" TO "authenticated" USING ("public"."is_developer"()) WITH CHECK ("public"."is_developer"());



CREATE POLICY "Developers can manage service" ON "public"."service" TO "authenticated" USING ("public"."is_developer"()) WITH CHECK ("public"."is_developer"());



CREATE POLICY "Developers can manage service_category" ON "public"."service_category" TO "authenticated" USING ("public"."is_developer"()) WITH CHECK ("public"."is_developer"());



CREATE POLICY "Global read access for app_role" ON "public"."app_role" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Global read access for app_role_service" ON "public"."app_role_service" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Global read access for service" ON "public"."service" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Global read access for service_category" ON "public"."service_category" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Tenant isolation for divisions" ON "public"."divisions" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'superuser'::"text") OR ("tenant_id" = "public"."get_auth_tenant_id"())));



CREATE POLICY "Tenant isolation for employees" ON "public"."employees" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'superuser'::"text") OR ("tenant_id" = "public"."get_auth_tenant_id"())));



CREATE POLICY "Tenant isolation for tenant_service" ON "public"."tenant_service" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'superuser'::"text") OR ("tenant_id" = "public"."get_auth_tenant_id"())));



CREATE POLICY "Tenant isolation for tenants" ON "public"."tenants" USING ((((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'superuser'::"text") OR ("id" = "public"."get_auth_tenant_id"())));



ALTER TABLE "public"."app_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_role_service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."manager_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pulse_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "マネージャーは自社のコメントを作成できる" ON "public"."manager_comments" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))) AND ("manager_id" = "auth"."uid"())));



CREATE POLICY "マネージャーは自社のコメントを参照できる" ON "public"."manager_comments" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "マネージャーは自社のコメントを更新できる" ON "public"."manager_comments" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_configsを作成・更新できる" ON "public"."pulse_configs" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_configsを参照できる" ON "public"."pulse_configs" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_configsを更新できる" ON "public"."pulse_configs" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_responsesを作成できる" ON "public"."pulse_responses" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_responsesを参照できる" ON "public"."pulse_responses" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_sessionsを作成できる" ON "public"."pulse_sessions" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_sessionsを参照できる" ON "public"."pulse_sessions" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のpulse_sessionsを更新できる" ON "public"."pulse_sessions" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のアラートを作成できる" ON "public"."pulse_alerts" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のアラートを参照できる" ON "public"."pulse_alerts" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



CREATE POLICY "従業員は自社のアラートを更新できる" ON "public"."pulse_alerts" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id"
   FROM "public"."employees"
  WHERE ("employees"."id" = "auth"."uid"()))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_developer"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_developer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_developer"() TO "service_role";



GRANT ALL ON TABLE "public"."app_role" TO "anon";
GRANT ALL ON TABLE "public"."app_role" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role" TO "service_role";



GRANT ALL ON TABLE "public"."app_role_service" TO "anon";
GRANT ALL ON TABLE "public"."app_role_service" TO "authenticated";
GRANT ALL ON TABLE "public"."app_role_service" TO "service_role";



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."manager_comments" TO "postgres";
GRANT ALL ON TABLE "public"."manager_comments" TO "anon";
GRANT ALL ON TABLE "public"."manager_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_comments" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_alerts" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_alerts" TO "anon";
GRANT ALL ON TABLE "public"."pulse_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_configs" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_configs" TO "anon";
GRANT ALL ON TABLE "public"."pulse_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_configs" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_intents" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_intents" TO "anon";
GRANT ALL ON TABLE "public"."pulse_intents" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_intents" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_packs" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_packs" TO "anon";
GRANT ALL ON TABLE "public"."pulse_packs" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_packs" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_questions" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_questions" TO "anon";
GRANT ALL ON TABLE "public"."pulse_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_questions" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_responses" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_responses" TO "anon";
GRANT ALL ON TABLE "public"."pulse_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pulse_sessions" TO "postgres";
GRANT ALL ON TABLE "public"."pulse_sessions" TO "anon";
GRANT ALL ON TABLE "public"."pulse_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."pulse_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."service" TO "anon";
GRANT ALL ON TABLE "public"."service" TO "authenticated";
GRANT ALL ON TABLE "public"."service" TO "service_role";



GRANT ALL ON TABLE "public"."service_category" TO "anon";
GRANT ALL ON TABLE "public"."service_category" TO "authenticated";
GRANT ALL ON TABLE "public"."service_category" TO "service_role";



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







