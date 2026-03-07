-- =============================================================================
-- Migration: access_logs テーブル復旧
-- 作成日: 2026-02-23
--
-- 消失した access_logs テーブルを再作成する。
-- カラム構造は以下3ファイルの INSERT/SELECT 文から逆算:
--   - src/middleware.ts (PAGE_VIEW ログ)
--   - src/lib/log/actions.ts (監査ログ: writeAuditLog)
--   - src/features/saas-dashboard/queries.ts (集計クエリ)
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. テーブル作成
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "public"."access_logs" (
    "id"          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "action"      text NOT NULL,
    "path"        text,
    "method"      text,
    "ip_address"  text,
    "user_agent"  text,
    "tenant_id"   uuid REFERENCES "public"."tenants"("id") ON DELETE SET NULL,
    "user_id"     uuid REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    "details"     jsonb DEFAULT '{}'::jsonb,
    "created_at"  timestamptz DEFAULT now()
);

COMMENT ON TABLE "public"."access_logs" IS 'アクセス履歴・監査ログ（Middleware + writeAuditLog から記録）';


-- ─────────────────────────────────────────────
-- 2. インデックス（ダッシュボード集計の高速化）
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_access_logs_created_at"
  ON "public"."access_logs" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_access_logs_tenant_created"
  ON "public"."access_logs" ("tenant_id", "created_at" DESC);


-- ─────────────────────────────────────────────
-- 3. RLS 有効化 + ポリシー
-- ─────────────────────────────────────────────
ALTER TABLE "public"."access_logs" ENABLE ROW LEVEL SECURITY;

-- authenticated ユーザーは自テナントのログを INSERT できる（Middleware / Server Action 用）
DROP POLICY IF EXISTS "access_logs_insert_authenticated" ON "public"."access_logs";
CREATE POLICY "access_logs_insert_authenticated"
  ON "public"."access_logs" FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- SELECT は service_role（SaaSダッシュボード集計用 createAdminClient）のみ
DROP POLICY IF EXISTS "access_logs_select_service_role" ON "public"."access_logs";
CREATE POLICY "access_logs_select_service_role"
  ON "public"."access_logs" FOR SELECT
  TO service_role
  USING (true);

-- supaUser (SaaS管理者) フルアクセス
DROP POLICY IF EXISTS "supa_access_logs_all" ON "public"."access_logs";
CREATE POLICY "supa_access_logs_all"
  ON "public"."access_logs"
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);


-- ─────────────────────────────────────────────
-- 4. GRANTS
-- ─────────────────────────────────────────────
GRANT ALL ON TABLE "public"."access_logs" TO "postgres";
GRANT ALL ON TABLE "public"."access_logs" TO "anon";
GRANT ALL ON TABLE "public"."access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."access_logs" TO "service_role";
