-- 1. まず、テーブルのセキュリティを一時停止（作業用）
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;

-- 2. 【重要】過去に作ったあらゆるポリシーを名前指定で全削除（ゾンビ退治）
DROP POLICY IF EXISTS "Users can view their own employee data" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for own user" ON public.employees;
DROP POLICY IF EXISTS "Read access for owners and developers" ON public.employees;
DROP POLICY IF EXISTS "Super Admin Access for Employees" ON public.employees;
DROP POLICY IF EXISTS "Final Policy for Employees" ON public.employees;
DROP POLICY IF EXISTS "Policy with recursion" ON public.employees;

DROP POLICY IF EXISTS "Employees can view their own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Read access for belonging tenant and developers" ON public.tenants;
DROP POLICY IF EXISTS "Super Admin Access for Tenants" ON public.tenants;
DROP POLICY IF EXISTS "Final Policy for Tenants" ON public.tenants;

-- 3. 「特権関数」も念のため削除（干渉を防ぐため）
DROP FUNCTION IF EXISTS public.check_tenant_access;
DROP FUNCTION IF EXISTS public.get_my_role;

-- 4. 最もシンプルで壊れないルール（Metadata方式）だけを適用する
-- これならテーブルを読みに行かないので、ループは絶対に起きません。

-- 【employeesテーブル】
CREATE POLICY "Simple Access for Employees"
ON public.employees FOR SELECT
USING (
  auth.uid() = id   -- 本人ならOK
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true' -- 特権(SaaS管理者)ならOK
);

-- 【tenantsテーブル】
CREATE POLICY "Simple Access for Tenants"
ON public.tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM public.employees WHERE id = auth.uid()
  ) -- 所属していればOK
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true' -- 特権(SaaS管理者)ならOK
);

-- 5. セキュリティを有効に戻す
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;