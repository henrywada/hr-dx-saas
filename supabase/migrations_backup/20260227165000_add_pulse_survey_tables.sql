-- =============================================================================
-- Migration: 組織健康度アンケート（パルスサーベイ）機能のテーブル作成
-- 作成日: 2026-02-27
-- 
-- 内容:
--   1. pulse_survey_questions (質問マスタ)
--   2. pulse_survey_responses (回答データ)
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. 質問マスタ (pulse_survey_questions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."pulse_survey_questions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "category" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer_type" TEXT NOT NULL DEFAULT 'rating', -- 'rating' (5段階) または 'text' (フリー)
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "public"."pulse_survey_questions" IS 'パルスサーベイ: 質問マスタ';

-- ─────────────────────────────────────────────
-- 2. 回答データ (pulse_survey_responses)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."pulse_survey_responses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "auth"."users" ("id") ON DELETE CASCADE,
    "question_id" UUID REFERENCES "public"."pulse_survey_questions" ("id") ON DELETE SET NULL,
    "survey_period" TEXT NOT NULL, -- 例: '2026-02' (対象の年月など)
    "score" INTEGER CHECK (score BETWEEN 1 AND 5), -- 5段階評価のスコア
    "comment" TEXT, -- フリーテキスト回答用
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "public"."pulse_survey_responses" IS 'パルスサーベイ: 従業員の回答データ';

-- ─────────────────────────────────────────────
-- 3. RLS (Row Level Security) / テナント分離
-- ─────────────────────────────────────────────
ALTER TABLE "public"."pulse_survey_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pulse_survey_responses" ENABLE ROW LEVEL SECURITY;

-- 質問マスタ：自テナントのものだけ参照・操作可能
DROP POLICY IF EXISTS "pulse_survey_questions_tenant_isolation" ON "public"."pulse_survey_questions";
CREATE POLICY "pulse_survey_questions_tenant_isolation" ON "public"."pulse_survey_questions"
    FOR ALL
    USING (tenant_id = public.current_tenant_id());

-- 回答データ：自テナントのものだけ操作可能 (※さらに一般ユーザーは「自分の回答だけ」などの追加制御が可能です)
DROP POLICY IF EXISTS "pulse_survey_responses_tenant_isolation" ON "public"."pulse_survey_responses";
CREATE POLICY "pulse_survey_responses_tenant_isolation" ON "public"."pulse_survey_responses"
    FOR ALL
    USING (tenant_id = public.current_tenant_id());
