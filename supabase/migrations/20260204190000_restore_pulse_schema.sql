
-- Pulse Survey Related Tables and Policies Restoration

-- pulse_packs
CREATE TABLE IF NOT EXISTS "public"."pulse_packs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "is_official" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."pulse_packs" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_packs"
    ADD CONSTRAINT "pulse_packs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_packs"
    ADD CONSTRAINT "pulse_packs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");

-- pulse_intents
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

ALTER TABLE "public"."pulse_intents" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "public"."pulse_packs"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_intents"
    ADD CONSTRAINT "pulse_intents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");

-- pulse_questions
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

ALTER TABLE "public"."pulse_questions" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_questions"
    ADD CONSTRAINT "pulse_questions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_questions"
    ADD CONSTRAINT "pulse_questions_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;

-- pulse_configs
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
ALTER TABLE "public"."pulse_configs" OWNER TO "postgres";
COMMENT ON COLUMN "public"."pulse_configs"."survey_frequency" IS 'サーベイ実施頻度 (daily, weekly, monthly)';
ALTER TABLE ONLY "public"."pulse_configs"
    ADD CONSTRAINT "pulse_configs_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_configs"
    ADD CONSTRAINT "pulse_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
CREATE INDEX "idx_pulse_configs_tenant_id" ON "public"."pulse_configs" USING "btree" ("tenant_id");

-- pulse_sessions
CREATE TABLE IF NOT EXISTS "public"."pulse_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "intent_id" "uuid" NOT NULL,
    "overall_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "feedback_comment" "text"
);
ALTER TABLE "public"."pulse_sessions" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "pulse_sessions_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_intent" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_sessions"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
CREATE INDEX "idx_pulse_sessions_created_at" ON "public"."pulse_sessions" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_pulse_sessions_employee_id" ON "public"."pulse_sessions" USING "btree" ("employee_id");
CREATE INDEX "idx_pulse_sessions_intent_id" ON "public"."pulse_sessions" USING "btree" ("intent_id");
CREATE INDEX "idx_pulse_sessions_tenant_id" ON "public"."pulse_sessions" USING "btree" ("tenant_id");

-- pulse_responses
CREATE TABLE IF NOT EXISTS "public"."pulse_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_value" integer,
    "answer_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."pulse_responses" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "pulse_responses_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_question" FOREIGN KEY ("question_id") REFERENCES "public"."pulse_questions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_responses"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
CREATE INDEX "idx_pulse_responses_question_id" ON "public"."pulse_responses" USING "btree" ("question_id");
CREATE INDEX "idx_pulse_responses_session_id" ON "public"."pulse_responses" USING "btree" ("session_id");
CREATE INDEX "idx_pulse_responses_tenant_id" ON "public"."pulse_responses" USING "btree" ("tenant_id");

-- pulse_alerts
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
ALTER TABLE "public"."pulse_alerts" OWNER TO "postgres";
ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "pulse_alerts_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_employee" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_intent" FOREIGN KEY ("intent_id") REFERENCES "public"."pulse_intents"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."pulse_alerts"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
CREATE INDEX "idx_pulse_alerts_created" ON "public"."pulse_alerts" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_pulse_alerts_employee" ON "public"."pulse_alerts" USING "btree" ("employee_id");
CREATE INDEX "idx_pulse_alerts_status" ON "public"."pulse_alerts" USING "btree" ("status");
CREATE INDEX "idx_pulse_alerts_tenant" ON "public"."pulse_alerts" USING "btree" ("tenant_id");

-- manager_comments
CREATE TABLE IF NOT EXISTS "public"."manager_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."manager_comments" OWNER TO "postgres";
ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "manager_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_manager" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_session" FOREIGN KEY ("session_id") REFERENCES "public"."pulse_sessions"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."manager_comments"
    ADD CONSTRAINT "fk_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
CREATE INDEX "idx_manager_comments_manager" ON "public"."manager_comments" USING "btree" ("manager_id");
CREATE INDEX "idx_manager_comments_session" ON "public"."manager_comments" USING "btree" ("session_id");

-- RLS Policies and Grants
ALTER TABLE "public"."pulse_packs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_intents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."manager_comments" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."pulse_packs" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_intents" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_questions" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_configs" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_sessions" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_responses" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."pulse_alerts" TO "anon", "authenticated", "service_role", "postgres";
GRANT ALL ON TABLE "public"."manager_comments" TO "anon", "authenticated", "service_role", "postgres";

-- Specific RLS Policies from schema dump
CREATE POLICY "従業員は自社のpulse_configsを作成・更新できる" ON "public"."pulse_configs" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のpulse_configsを参照できる" ON "public"."pulse_configs" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のpulse_configsを更新できる" ON "public"."pulse_configs" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));

CREATE POLICY "従業員は自社のpulse_responsesを作成できる" ON "public"."pulse_responses" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のpulse_responsesを参照できる" ON "public"."pulse_responses" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));

CREATE POLICY "従業員は自社のpulse_sessionsを作成できる" ON "public"."pulse_sessions" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のpulse_sessionsを参照できる" ON "public"."pulse_sessions" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のpulse_sessionsを更新できる" ON "public"."pulse_sessions" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));

CREATE POLICY "従業員は自社のアラートを作成できる" ON "public"."pulse_alerts" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のアラートを参照できる" ON "public"."pulse_alerts" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "従業員は自社のアラートを更新できる" ON "public"."pulse_alerts" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));

CREATE POLICY "マネージャーは自社のコメントを作成できる" ON "public"."manager_comments" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))) AND ("manager_id" = "auth"."uid"())));
CREATE POLICY "マネージャーは自社のコメントを参照できる" ON "public"."manager_comments" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
CREATE POLICY "マネージャーは自社のコメントを更新できる" ON "public"."manager_comments" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "employees"."tenant_id" FROM "public"."employees" WHERE ("employees"."id" = "auth"."uid"()))));
