-- まず既存のポリシーをクリア
DROP POLICY IF EXISTS "Read access for owners and developers" ON public.employees;
DROP POLICY IF EXISTS "Read access for belonging tenant and developers" ON public.tenants;
DROP POLICY IF EXISTS "Users can view their own employee data" ON public.employees;
DROP POLICY IF EXISTS "Employees can view their own tenant" ON public.tenants;

-- RLSを有効化（念のため）
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 【employeesテーブルの最強ポリシー】
-- 条件: 「自分のデータ」 OR 「免許証に is_super_admin = true と書いてある人」
CREATE POLICY "Super Admin Access for Employees"
ON public.employees FOR SELECT
USING (
  auth.uid() = id
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);

-- 【tenantsテーブルの最強ポリシー】
-- 条件: 「自分の所属テナント」 OR 「免許証に is_super_admin = true と書いてある人」
CREATE POLICY "Super Admin Access for Tenants"
ON public.tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM public.employees WHERE id = auth.uid()
  )
  OR
  (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
);