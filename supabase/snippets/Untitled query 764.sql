-- 1. まず、employeesテーブルの既存ポリシーを全て削除してクリーンにする
DROP POLICY IF EXISTS "Users can view their own employee data" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.employees;
DROP POLICY IF EXISTS "Enable read access for own user" ON public.employees;
DROP POLICY IF EXISTS "Policy with recursion" ON public.employees;

-- 2. tenantsテーブルのポリシーも念のため削除
DROP POLICY IF EXISTS "Employees can view their own tenant" ON public.tenants;

-- 3. 安全なポリシー（無限ループしない版）を作成する

-- 【employeesテーブル】
-- 「自分のID（auth.uid）と一致する行だけ見れる」という単純なルールにします。
-- これなら他のテーブルや自分自身を再検索しないのでループしません。
CREATE POLICY "Users can view their own employee data"
ON public.employees FOR SELECT
USING (auth.uid() = id);

-- 【tenantsテーブル】
-- 「自分が所属しているテナント（会社）だけ見れる」ようにします。
-- employeesテーブルを参照しますが、employees側のルールが単純化されたのでループしません。
CREATE POLICY "Employees can view their own tenant"
ON public.tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM public.employees WHERE id = auth.uid()
  )
);