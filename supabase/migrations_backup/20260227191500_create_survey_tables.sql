-- =============================================================================
-- Migration: 組織健康度アンケート（パルスサーベイ）データ保持用
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. 質問マスタ (survey_questions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."survey_questions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. 回答データ (survey_responses)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "auth"."users" ("id") ON DELETE CASCADE,
    "question_id" UUID NOT NULL REFERENCES "public"."survey_questions" ("id") ON DELETE CASCADE,
    "score" INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────
-- 3. RLS (Row Level Security) / テナント分離
-- ─────────────────────────────────────────────
ALTER TABLE "public"."survey_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "survey_questions_isolate" ON "public"."survey_questions";
  CREATE POLICY "survey_questions_isolate" ON "public"."survey_questions"
      FOR ALL USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'survey_questions policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "survey_responses_isolate" ON "public"."survey_responses";
  CREATE POLICY "survey_responses_isolate" ON "public"."survey_responses"
      FOR ALL USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'survey_responses policy error skipped';
END
$$;
