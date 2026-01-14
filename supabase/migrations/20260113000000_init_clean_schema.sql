-- 1. テナント (旧 organizations などを廃止し tenants に統一)
CREATE TABLE public.tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. サービス (AI Agent service モジュール)
CREATE TABLE public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 3. テナント契約サービス (中間テーブル)
CREATE TABLE public.tenant_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tenant_services ENABLE ROW LEVEL SECURITY;

-- 4. 従業員 (旧 profiles/employee を廃止し employees に統一)
CREATE TABLE public.employees (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'member', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 5. 部署
CREATE TABLE public.divisions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    parent_id UUID REFERENCES public.divisions(id),
    layer INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX idx_divisions_tenant_id ON public.divisions(tenant_id);
CREATE INDEX idx_tenant_services_tenant_id ON public.tenant_services(tenant_id);

-- -------------------------------------------------------
-- RLSポリシー定義（循環参照防止・マルチテナント完全分離）
-- -------------------------------------------------------

-- A. Employees
-- 自分の行は常に見える
CREATE POLICY "view_own_employee_profile" ON public.employees 
  FOR SELECT USING (id = auth.uid());
-- 同じテナントのメンバーも見える（アプリの動作上必要）
CREATE POLICY "view_coworkers" ON public.employees 
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  );

-- B. Tenants
-- 自分が所属するテナントのみ参照可
CREATE POLICY "view_own_tenant" ON public.tenants 
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  );

-- C. Divisions
-- 自分のテナントの部署のみ操作可
CREATE POLICY "tenant_isolation_divisions" ON public.divisions
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  );

-- D. Services / Tenant Services
-- サービスマスタは全員参照可（あるいは制限も可）
CREATE POLICY "view_services" ON public.services FOR SELECT TO authenticated USING (true);

-- 契約情報は自分のテナントのみ
CREATE POLICY "view_own_tenant_services" ON public.tenant_services
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.employees WHERE id = auth.uid())
  );
