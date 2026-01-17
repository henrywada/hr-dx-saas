-- 1. まず、テーブルのRLSを一時的に無効化（エラーを止める）
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 2. 既存のポリシーを、名前を問わず全て削除する（クリーンアップ）
DROP POLICY IF EXISTS "Users can view their own employee data" ON public.employees;
DROP POLICY IF EXISTS "Read access for owners and developers" ON public.employees;
DROP POLICY IF EXISTS "Super Admin Access for Employees" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;

DROP POLICY IF EXISTS "Employees can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Read access for belonging tenant and developers" ON public.tenants;
DROP POLICY IF EXISTS "Super Admin Access for Tenants" ON public.tenants;

-- 3. 【重要】ループ遮断用の「特権関数」を作成
-- SECURITY DEFINERを指定することで、この関数内だけはRLSを無視して実行されます。
-- これにより「チェックのためのチェック」という無限ループが物理的に発生しなくなります。
CREATE OR REPLACE FUNCTION public.check_tenant_access(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM employees 
    WHERE tenant_id = _tenant_id 
    AND id = auth.uid()
  );
$$;

-- 4. RLSを再度有効化
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 5. 最強かつ安全なポリシーを作成

-- 【employeesテーブル】
-- 条件: 「自分のID」 OR 「SaaS管理者フラグ持ち」
CREATE POLICY "Final Policy for Employees"
ON public.employees FOR SELECT
USING (
  auth.uid() = id
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

-- 【tenantsテーブル】
-- 条件: 「ループ遮断関数で所属確認」 OR 「SaaS管理者フラグ持ち」
CREATE POLICY "Final Policy for Tenants"
ON public.tenants FOR SELECT
USING (
  check_tenant_access(id) -- ★ここで特権関数を使うのでループしない
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);