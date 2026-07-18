-- 出荷先No（company_no）をmyou_companiesに追加し、既存行へテナント単位で連番をバックフィルする
ALTER TABLE public.myou_companies ADD COLUMN IF NOT EXISTS company_no integer;

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.myou_companies
  WHERE company_no IS NULL
)
UPDATE public.myou_companies AS c
SET company_no = numbered.rn
FROM numbered
WHERE c.id = numbered.id;

ALTER TABLE public.myou_companies ALTER COLUMN company_no SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'myou_companies_tenant_company_no_key'
    ) THEN
        ALTER TABLE public.myou_companies
            ADD CONSTRAINT myou_companies_tenant_company_no_key UNIQUE (tenant_id, company_no);
    END IF;
END $$;

-- トレーサビリティQRラベル発行履歴（発行のたび1件記録し、当日通番の採番元になる）
CREATE TABLE IF NOT EXISTS public.myou_trace_labels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    company_id uuid NOT NULL REFERENCES public.myou_companies(id),
    serial_number text NOT NULL,
    expiration_date date NOT NULL,
    trace_no text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.myou_trace_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for myou_trace_labels" ON public.myou_trace_labels;
CREATE POLICY "Tenant Isolation for myou_trace_labels" ON public.myou_trace_labels
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
