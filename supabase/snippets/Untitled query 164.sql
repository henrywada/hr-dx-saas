-- 1. ユーザー(wada007)に特権フラグ(is_super_admin)を確実に埋め込む
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_super_admin}',
  'true'
)
WHERE email = 'wada007@gmail.com';

-- 2. 念のため、現在適用されているRLSポリシーを「Metadata方式」に強制統一する
-- (以前のゾンビポリシーが復活していないか念押しのリセット)

-- 一旦無効化
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 既存ポリシー削除
DROP POLICY IF EXISTS "Simple Access for Employees" ON public.employees;
DROP POLICY IF EXISTS "Simple Access for Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Final_Simple_Employees" ON public.employees;
DROP POLICY IF EXISTS "Final_Simple_Tenants" ON public.tenants;

-- 再作成 (Metadataがあれば無条件で見せる最強ルール)
CREATE POLICY "Final_Fix_Employees"
ON public.employees FOR SELECT
USING (
  auth.uid() = id
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

CREATE POLICY "Final_Fix_Tenants"
ON public.tenants FOR SELECT
USING (
  id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

-- 有効化
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;