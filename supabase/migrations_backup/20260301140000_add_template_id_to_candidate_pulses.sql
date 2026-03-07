-- =============================================================================
-- Migration: pulse_templates 
-- =============================================================================

CREATE TABLE IF NOT EXISTS "public"."pulse_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "question_1_text" TEXT NOT NULL DEFAULT '1. 今のお気持ちを5段階で教えてください',
    "question_2_text" TEXT NOT NULL DEFAULT '2. 懸念点やもっと知りたいことがあれば選択してください（複数選択可）',
    "question_3_text" TEXT DEFAULT '3. その他、自由にご記入ください',
    "concerns_list" TEXT[] NOT NULL DEFAULT ARRAY['給与・待遇について', '業務内容について', '働き方（リモート/残業）について', '評価制度について', '社員の雰囲気について', 'その他'],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "public"."pulse_templates" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "pulse_templates_tenant_select" ON "public"."pulse_templates";
  CREATE POLICY "pulse_templates_tenant_select" ON "public"."pulse_templates"
      FOR SELECT USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "pulse_templates_tenant_insert" ON "public"."pulse_templates";
  CREATE POLICY "pulse_templates_tenant_insert" ON "public"."pulse_templates"
      FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "pulse_templates_tenant_update" ON "public"."pulse_templates";
  CREATE POLICY "pulse_templates_tenant_update" ON "public"."pulse_templates"
      FOR UPDATE USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

-- =============================================================================
-- Migration: candidate_pulses に template_id フィールドを追加
-- =============================================================================

ALTER TABLE "public"."candidate_pulses"
ADD COLUMN IF NOT EXISTS "template_id" UUID REFERENCES "public"."pulse_templates"("id") ON DELETE SET NULL;
