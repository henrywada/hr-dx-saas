-- employeesテーブル: 自分のデータは見れるようにする
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own employee data"
ON public.employees FOR SELECT
USING (auth.uid() = id);

-- tenantsテーブル: 紐付いている会社のデータは見れるようにする
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own tenant"
ON public.tenants FOR SELECT
USING (
  id IN (
    SELECT tenant_id FROM public.employees WHERE id = auth.uid()
  )
);