-- ▼▼▼ ゾンビポリシー完全駆除 & 再設定 ▼▼▼

-- 1. まずRLSを無効化（エラーを物理的に止める）
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーを「名前を問わず」プログラムで全削除
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'employees' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', r.policyname);
        RAISE NOTICE 'Deleted Policy (employees): %', r.policyname;
    END LOOP;

    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tenants' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', r.policyname);
        RAISE NOTICE 'Deleted Policy (tenants): %', r.policyname;
    END LOOP;
END $$;

-- 3. 特権フラグ(is_super_admin)をユーザーに念押しで焼き直す
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{is_super_admin}',
  'true'
)
WHERE email = 'wada007@gmail.com';

-- 4. 最もシンプルな「ループしないルール」を作成
-- ※テーブルを見に行かず、ログイン情報(JWT)だけを見るのでループしません

-- employees用
CREATE POLICY "Simple_Meta_Policy_Emp" ON public.employees
FOR SELECT USING (
  auth.uid() = id 
  OR 
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

-- tenants用
CREATE POLICY "Simple_Meta_Policy_Ten" ON public.tenants
FOR SELECT USING (
  id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  OR 
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

-- 5. RLSを有効化
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;