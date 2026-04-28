-- myou_companies が後続の fix_myou_schema で作成されるため、ここで先行して作成
CREATE TABLE IF NOT EXISTS public.myou_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email_address text,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create myou_alert_logs table for expiration alerts tracking
CREATE TABLE IF NOT EXISTS public.myou_alert_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    target_serials text[] NOT NULL,
    status text DEFAULT 'success' NOT NULL,
    error_message text,
    
    CONSTRAINT myou_alert_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.myou_companies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.myou_alert_logs ENABLE ROW LEVEL SECURITY;

-- Policy (Allow all for authenticated users for now)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.myou_alert_logs;
CREATE POLICY "Enable all for authenticated users" ON public.myou_alert_logs
    FOR ALL TO authenticated USING (true);
