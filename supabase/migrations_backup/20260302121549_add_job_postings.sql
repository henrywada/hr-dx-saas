-- =============================================================================
-- Migration: AI Smart Job Publisher (job_postings)
-- =============================================================================

CREATE TABLE "public"."job_postings" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "public"."tenants" ("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "raw_memo" TEXT,
    "description" TEXT,
    "employment_type" TEXT,
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_unit" TEXT,
    "postal_code" TEXT,
    "address_region" TEXT,
    "address_locality" TEXT,
    "street_address" TEXT,
    "published_at" TIMESTAMPTZ,
    "valid_through" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) の設定
ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;

-- 人事（テナント）向け: 自分のテナントのデータのみ参照・作成・更新・削除可能
DO $$
BEGIN
  DROP POLICY IF EXISTS "job_postings_tenant_select" ON "public"."job_postings";
  CREATE POLICY "job_postings_tenant_select" ON "public"."job_postings"
      FOR SELECT USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "job_postings_tenant_insert" ON "public"."job_postings";
  CREATE POLICY "job_postings_tenant_insert" ON "public"."job_postings"
      FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "job_postings_tenant_update" ON "public"."job_postings";
  CREATE POLICY "job_postings_tenant_update" ON "public"."job_postings"
      FOR UPDATE USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "job_postings_tenant_delete" ON "public"."job_postings";
  CREATE POLICY "job_postings_tenant_delete" ON "public"."job_postings"
      FOR DELETE USING (tenant_id = public.current_tenant_id());
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

-- 一般の求職者（未認証ブラウザ・クローラー等）向け: published なもののみ SELECT 可能
DO $$
BEGIN
  DROP POLICY IF EXISTS "job_postings_public_select" ON "public"."job_postings";
  CREATE POLICY "job_postings_public_select" ON "public"."job_postings"
      FOR SELECT USING (status = 'published');
EXCEPTION
  WHEN OTHERS THEN RAISE NOTICE 'policy error skipped';
END
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_job_postings_updated_at ON public.job_postings;
CREATE TRIGGER set_job_postings_updated_at
BEFORE UPDATE ON public.job_postings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
