-- =============================================================================
-- Migration: 候補者パルスサーベイデータ用 (candidate_pulses)
-- =============================================================================

CREATE TABLE "public"."candidate_pulses" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "candidate_name" TEXT NOT NULL,
    "selection_step" TEXT,
    "sentiment_score" INTEGER CHECK ("sentiment_score" >= 1 AND "sentiment_score" <= 5),
    "concerns" TEXT[] DEFAULT '{}',
    "comment" TEXT,
    "is_answered" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE "public"."candidate_pulses" ENABLE ROW LEVEL SECURITY;

-- 人事（テナント）向け: 自分のテナントのデータのみ参照・作成可能
-- (未認証向けのポリシーは service_role でバイパスするため作成しない)
DO $$
BEGIN
  DROP POLICY IF EXISTS "candidate_pulses_tenant_select" ON "public"."candidate_pulses";
  CREATE POLICY "candidate_pulses_tenant_select" ON "public"."candidate_pulses"
      FOR SELECT USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'candidate_pulses_tenant_select policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "candidate_pulses_tenant_insert" ON "public"."candidate_pulses";
  CREATE POLICY "candidate_pulses_tenant_insert" ON "public"."candidate_pulses"
      FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'candidate_pulses_tenant_insert policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "candidate_pulses_tenant_update" ON "public"."candidate_pulses";
  CREATE POLICY "candidate_pulses_tenant_update" ON "public"."candidate_pulses"
      FOR UPDATE USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'candidate_pulses_tenant_update policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "candidate_pulses_tenant_delete" ON "public"."candidate_pulses";
  CREATE POLICY "candidate_pulses_tenant_delete" ON "public"."candidate_pulses"
      FOR DELETE USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'candidate_pulses_tenant_delete policy error skipped';
END
$$;
