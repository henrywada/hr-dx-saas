-- =============================================================================
-- Migration: TalentDraft AI ベース整備
-- 作成日: 2026-02-22
-- 
-- 内容:
--   1. tenants テーブルにプラン関連カラム追加 (plan_type, max_employees)
--   2. recruitment_jobs テーブル作成 (RLS付き)
--   3. employees INSERT 前の max_employees チェックトリガー
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. tenants テーブルにプラン関連カラムを追加
-- ─────────────────────────────────────────────
ALTER TABLE "public"."tenants"
  ADD COLUMN IF NOT EXISTS "plan_type" text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "max_employees" integer NOT NULL DEFAULT 30;

COMMENT ON COLUMN "public"."tenants"."plan_type" IS 'テナントの契約プラン (free / pro / enterprise)';
COMMENT ON COLUMN "public"."tenants"."max_employees" IS 'テナントの従業員登録上限数';


-- ─────────────────────────────────────────────
-- 2. recruitment_jobs テーブル作成
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."recruitment_jobs" (
    "id"              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "tenant_id"       uuid NOT NULL REFERENCES "public"."tenants"("id") ON DELETE CASCADE,
    "title"           text NOT NULL,
    "department"      text,
    "employment_type" text DEFAULT '正社員',
    "description"     text,
    "requirements"    text,
    "salary_min"      integer,
    "salary_max"      integer,
    "location"        text,
    "status"          text NOT NULL DEFAULT '下書き',
    "ai_catchphrase"  text,
    "ai_scout_text"   text,
    "ai_interview_guide" text,
    "created_by"      uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "created_at"      timestamptz DEFAULT now(),
    "updated_at"      timestamptz DEFAULT now()
);

-- ALTER TABLE "public"."recruitment_jobs" OWNER TO "supabase_admin";

COMMENT ON TABLE "public"."recruitment_jobs" IS 'TalentDraft AI: 採用求人管理テーブル';
COMMENT ON COLUMN "public"."recruitment_jobs"."status" IS '求人ステータス (下書き / 公開 / 締切 / アーカイブ)';
COMMENT ON COLUMN "public"."recruitment_jobs"."ai_catchphrase" IS 'AI生成キャッチコピー (全プラン利用可)';
COMMENT ON COLUMN "public"."recruitment_jobs"."ai_scout_text" IS 'AI生成スカウト文 (Pro以上)';
COMMENT ON COLUMN "public"."recruitment_jobs"."ai_interview_guide" IS 'AI生成面接ガイド (Pro以上)';

-- RLS 有効化
ALTER TABLE "public"."recruitment_jobs" ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー (CRUD)
DROP POLICY IF EXISTS "recruitment_jobs_select_same_tenant" ON "public"."recruitment_jobs";
CREATE POLICY "recruitment_jobs_select_same_tenant"
  ON "public"."recruitment_jobs" FOR SELECT
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "recruitment_jobs_insert_same_tenant" ON "public"."recruitment_jobs";
CREATE POLICY "recruitment_jobs_insert_same_tenant"
  ON "public"."recruitment_jobs" FOR INSERT
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "recruitment_jobs_update_same_tenant" ON "public"."recruitment_jobs";
CREATE POLICY "recruitment_jobs_update_same_tenant"
  ON "public"."recruitment_jobs" FOR UPDATE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "recruitment_jobs_delete_same_tenant" ON "public"."recruitment_jobs";
CREATE POLICY "recruitment_jobs_delete_same_tenant"
  ON "public"."recruitment_jobs" FOR DELETE
  USING (tenant_id = public.current_tenant_id());

-- supaUser (SaaS管理者) フルアクセスポリシー
DROP POLICY IF EXISTS "supa_recruitment_jobs_all" ON "public"."recruitment_jobs";
CREATE POLICY "supa_recruitment_jobs_all"
  ON "public"."recruitment_jobs"
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

-- GRANTS
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "postgres";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "anon";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."recruitment_jobs" TO "service_role";


-- ─────────────────────────────────────────────
-- 3. employees INSERT 前の max_employees チェックトリガー
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION "public"."check_max_employees"()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
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

-- 既存トリガーがあれば削除して再作成
DROP TRIGGER IF EXISTS "trg_check_max_employees" ON "public"."employees";

CREATE TRIGGER "trg_check_max_employees"
  BEFORE INSERT ON "public"."employees"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."check_max_employees"();

COMMENT ON FUNCTION "public"."check_max_employees"() IS 'employees INSERT前にテナントのmax_employees上限をチェック';
