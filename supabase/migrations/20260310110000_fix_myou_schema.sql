-- Ensure myou_companies exists with tenant isolation
CREATE TABLE IF NOT EXISTS public.myou_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email_address text,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Force add tenant_id if it doesn't exist (in case table was created manually without it)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='myou_companies' AND column_name='tenant_id') THEN
        ALTER TABLE public.myou_companies ADD COLUMN tenant_id uuid NOT NULL DEFAULT current_tenant_id();
    END IF;
END $$;

ALTER TABLE public.myou_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_companies" ON public.myou_companies;
CREATE POLICY "Tenant Isolation for myou_companies" ON public.myou_companies
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());


-- Ensure myou_products exists with tenant isolation
CREATE TABLE IF NOT EXISTS public.myou_products (
    serial_number text PRIMARY KEY,
    expiration_date date,
    status text DEFAULT 'active' NOT NULL,
    last_delivery_at timestamp with time zone,
    current_company_id uuid REFERENCES public.myou_companies(id),
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='myou_products' AND column_name='tenant_id') THEN
        ALTER TABLE public.myou_products ADD COLUMN tenant_id uuid NOT NULL DEFAULT current_tenant_id();
    END IF;
END $$;

ALTER TABLE public.myou_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_products" ON public.myou_products;
CREATE POLICY "Tenant Isolation for myou_products" ON public.myou_products
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());


-- Ensure myou_delivery_logs exists with tenant isolation
CREATE TABLE IF NOT EXISTS public.myou_delivery_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_number text NOT NULL,
    company_id uuid NOT NULL REFERENCES public.myou_companies(id),
    delivery_date date DEFAULT CURRENT_DATE NOT NULL,
    delivered_by text,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='myou_delivery_logs' AND column_name='tenant_id') THEN
        ALTER TABLE public.myou_delivery_logs ADD COLUMN tenant_id uuid NOT NULL DEFAULT current_tenant_id();
    END IF;
END $$;

ALTER TABLE public.myou_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_delivery_logs" ON public.myou_delivery_logs;
CREATE POLICY "Tenant Isolation for myou_delivery_logs" ON public.myou_delivery_logs
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());

-- Ensure myou_alert_logs (created previously) also has the correct tenant isolation policy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='myou_alert_logs' AND column_name='tenant_id') THEN
        ALTER TABLE public.myou_alert_logs ADD COLUMN tenant_id uuid NOT NULL DEFAULT current_tenant_id();
    END IF;
END $$;

ALTER TABLE public.myou_alert_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_alert_logs" ON public.myou_alert_logs;
CREATE POLICY "Tenant Isolation for myou_alert_logs" ON public.myou_alert_logs
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
