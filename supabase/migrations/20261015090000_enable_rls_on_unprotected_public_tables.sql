-- Security Advisor (rls_disabled_in_public) 対応。
-- public スキーマで Row Level Security が無効なテーブルを有効化する。
-- 既存行は変更しない（ENABLE ROW LEVEL SECURITY とポリシー追加のみ）。
--
-- マイグレーションを時系列に適用した最終状態で RLS が無効な public テーブルは
-- global_skill_level_sets / global_skill_levels のみ。
-- どちらも tenant_id を持たない SaaS 共通マスタ。
--
-- 読み取り（認証済みクライアント = createClient）:
--   - src/app/(tenant)/(tenant-admin)/adm/(skill_map)/skill-tempCopy/page.tsx
--   - src/features/skill-map/actions.ts の importFromGlobalSkillLevelSet
-- 書き込み（service_role = createAdminClient。RLS をバイパス）:
--   - src/features/global-skill-templates/actions.ts
-- anon キーからの参照・変更はポリシーを置かないことで拒否する。

ALTER TABLE public.global_skill_level_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_skill_levels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_skill_level_sets'
      AND policyname = 'global_skill_level_sets_select'
  ) THEN
    CREATE POLICY "global_skill_level_sets_select"
      ON public.global_skill_level_sets
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'global_skill_levels'
      AND policyname = 'global_skill_levels_select'
  ) THEN
    CREATE POLICY "global_skill_levels_select"
      ON public.global_skill_levels
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- task_comment_one_on_one_links は src/lib/supabase/types.ts に現れるが、
-- リポジトリ内に CREATE TABLE が無く、アプリコードからも参照されない。
-- 型生成元 DB にだけ存在し、かつ RLS が無効な場合に備えて有効化する。
-- ポリシーは追加しない（anon / authenticated は拒否。service_role はバイパス）。
-- 既にポリシーがある場合も、ここでは既存ポリシーを変更しない。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'task_comment_one_on_one_links'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ) THEN
    ALTER TABLE public.task_comment_one_on_one_links ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
