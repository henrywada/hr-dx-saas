


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
    "updated_at" timestamp with time zone DEFAULT "now"()
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
    "max_employees" integer DEFAULT 30 NOT NULL
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



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_category"
    ADD CONSTRAINT "service_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



CREATE INDEX "access_logs_created_at_idx" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "access_logs_tenant_id_idx" ON "public"."access_logs" USING "btree" ("tenant_id");



CREATE INDEX "access_logs_user_id_idx" ON "public"."access_logs" USING "btree" ("user_id");



CREATE INDEX "idx_access_logs_created_at" ON "public"."access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_access_logs_tenant_created" ON "public"."access_logs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "trg_check_max_employees" BEFORE INSERT ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."check_max_employees"();



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



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recruitment_jobs"
    ADD CONSTRAINT "recruitment_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service"
    ADD CONSTRAINT "service_service_category_id_fkey" FOREIGN KEY ("service_category_id") REFERENCES "public"."service_category"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_service"
    ADD CONSTRAINT "tenant_service_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "SaaS admins can view all access logs" ON "public"."access_logs" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'supaUser'::"text"));



CREATE POLICY "Tenant admins can view their tenant's logs" ON "public"."access_logs" FOR SELECT TO "authenticated" USING ((("tenant_id" = ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'tenant_id'::"text"))::"uuid") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Users can insert their own access logs" ON "public"."access_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "access_logs_insert_authenticated" ON "public"."access_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "access_logs_select_service_role" ON "public"."access_logs" FOR SELECT TO "service_role" USING (true);



ALTER TABLE "public"."ai_usage_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ai_usage_logs_tenant_isolation" ON "public"."ai_usage_logs" USING (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."app_role" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_role_service" ENABLE ROW LEVEL SECURITY;


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



ALTER TABLE "public"."recruitment_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recruitment_jobs_delete_same_tenant" ON "public"."recruitment_jobs" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_insert_same_tenant" ON "public"."recruitment_jobs" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_select_same_tenant" ON "public"."recruitment_jobs" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "recruitment_jobs_update_same_tenant" ON "public"."recruitment_jobs" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."service" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_category" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "supa_access_logs_all" ON "public"."access_logs" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_divisions_all" ON "public"."divisions" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_employees_all" ON "public"."employees" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_recruitment_jobs_all" ON "public"."recruitment_jobs" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_tenant_service_all" ON "public"."tenant_service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_tenants_all" ON "public"."tenants" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_app_role" ON "public"."app_role" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_app_role_service" ON "public"."app_role_service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service" ON "public"."service" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service_category" ON "public"."service_category" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



CREATE POLICY "supa_write_service_v2" ON "public"."service" TO "authenticated" USING (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid")) WITH CHECK (("auth"."uid"() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::"uuid"));



ALTER TABLE "public"."tenant_service" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_service_delete_same_tenant" ON "public"."tenant_service" FOR DELETE USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_insert_same_tenant" ON "public"."tenant_service" FOR INSERT WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_select_same_tenant" ON "public"."tenant_service" FOR SELECT USING (("tenant_id" = "public"."current_tenant_id"()));



CREATE POLICY "tenant_service_update_same_tenant" ON "public"."tenant_service" FOR UPDATE USING (("tenant_id" = "public"."current_tenant_id"())) WITH CHECK (("tenant_id" = "public"."current_tenant_id"()));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_select_same_tenant" ON "public"."tenants" FOR SELECT USING (("id" = "public"."current_tenant_id"()));



CREATE POLICY "tenants_update_same_tenant" ON "public"."tenants" FOR UPDATE USING (("id" = "public"."current_tenant_id"())) WITH CHECK (("id" = "public"."current_tenant_id"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_max_employees"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_tenant_id"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."divisions" TO "anon";
GRANT ALL ON TABLE "public"."divisions" TO "authenticated";
GRANT ALL ON TABLE "public"."divisions" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."recruitment_jobs" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "service_role";



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































