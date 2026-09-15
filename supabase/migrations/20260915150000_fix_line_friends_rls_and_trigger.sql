-- =============================================================================
-- LINE友だち連携テーブルの RLS ポリシーとトリガーを修正
--
-- 変更内容:
--   1. line_friends_select ポリシーを再作成
--      - developer ロールに加えて、レガシー supaUser（user_metadata.role）も許可
--      - テナントユーザーは従来どおり自テナント行のみ閲覧可
--   2. set_line_friends_updated_at トリガーを再作成
--      - moddatetime() → update_updated_at_column()（リポジトリ標準の関数）に統一
--      - moddatetime 拡張は削除しない（他テーブルで使用中の可能性があるため）
-- =============================================================================

-- =============================================================================
-- 1. line_friends SELECT ポリシー再作成
-- =============================================================================

-- 既存ポリシーをべき等に削除（データは一切消えない）
DROP POLICY IF EXISTS line_friends_select ON public.line_friends;

-- 再作成: developer ロール OR レガシー supaUser OR 自テナント行
CREATE POLICY line_friends_select ON public.line_friends
  FOR SELECT TO authenticated
  USING (
    -- 現行 SaaS 管理者ロール
    public.current_employee_app_role() = 'developer'
    -- レガシー supaUser ロール（user_metadata.role = 'supaUser'）
    OR ((auth.jwt() -> 'user_metadata') ->> 'role') = 'supaUser'
    -- テナントユーザーは自テナント行のみ
    OR tenant_id = public.current_tenant_id()
  );

-- =============================================================================
-- 2. updated_at トリガーをリポジトリ標準関数に統一
-- =============================================================================

-- 既存トリガーをべき等に削除
DROP TRIGGER IF EXISTS set_line_friends_updated_at ON public.line_friends;

-- リポジトリ標準の update_updated_at_column() 関数で再作成
-- （moddatetime() と同等の動作だが依存拡張が不要）
CREATE TRIGGER set_line_friends_updated_at
  BEFORE UPDATE ON public.line_friends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
