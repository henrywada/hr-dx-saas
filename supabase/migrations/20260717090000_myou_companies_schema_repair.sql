-- ============================================================
-- myou_* テーブルのリモート・ローカル間スキーマ乖離を修正する
--
-- リモートの myou_companies は company_id/company_name という別名で
-- 作成されていた（経緯不明・恐らく初期に手動作成）ため、以降の全マイグレーション
-- （id/name前提の CREATE TABLE IF NOT EXISTS）が実質的に無効化され、
-- 列名・NULL制約がリモートとローカルで長期間乖離していた。
-- myou_* テーブル群の実データはほぼ存在しないことを確認済みのため、
-- 一旦削除し、ローカルの正しいスキーマ（現行マイグレーション適用後の最終形）で
-- 再作成する。myou_* 以外のテーブルには一切影響しない。
-- ============================================================

-- 依存関係の順に削除（IF EXISTS: リモートでの部分適用状態にも対応）
DROP TABLE IF EXISTS public.myou_delivery_logs;
DROP TABLE IF EXISTS public.myou_alert_logs;
DROP TABLE IF EXISTS public.myou_trace_labels;
DROP TABLE IF EXISTS public.myou_products;
DROP TABLE IF EXISTS public.myou_companies;

-- myou_companies（company_no は後続の 20260718150000 マイグレーションで追加される）
CREATE TABLE public.myou_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email_address text,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX idx_myou_companies_tenant ON public.myou_companies USING btree (tenant_id);
ALTER TABLE public.myou_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_companies" ON public.myou_companies
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());

-- myou_products
CREATE TABLE public.myou_products (
    serial_number text NOT NULL,
    expiration_date date,
    status text DEFAULT 'issued'::text NOT NULL,
    last_delivery_at timestamp with time zone,
    current_company_id uuid REFERENCES public.myou_companies(id),
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    received_at date,
    issued_at timestamp with time zone,
    PRIMARY KEY (tenant_id, serial_number),
    CONSTRAINT myou_products_status_check CHECK (status = ANY (ARRAY['issued'::text, 'in_stock'::text, 'delivered'::text]))
);
CREATE INDEX idx_myou_products_tenant_status_exp ON public.myou_products USING btree (tenant_id, status, expiration_date);
ALTER TABLE public.myou_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_products" ON public.myou_products
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());

-- myou_delivery_logs
CREATE TABLE public.myou_delivery_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    serial_number text NOT NULL,
    company_id uuid NOT NULL REFERENCES public.myou_companies(id),
    delivery_date date DEFAULT CURRENT_DATE NOT NULL,
    delivered_by text,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    CONSTRAINT myou_delivery_logs_product_fkey FOREIGN KEY (tenant_id, serial_number) REFERENCES public.myou_products(tenant_id, serial_number)
);
CREATE INDEX idx_myou_delivery_logs_serial ON public.myou_delivery_logs USING btree (serial_number);
CREATE INDEX idx_myou_delivery_logs_tenant_company ON public.myou_delivery_logs USING btree (tenant_id, company_id);
ALTER TABLE public.myou_delivery_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_delivery_logs" ON public.myou_delivery_logs
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());

-- myou_alert_logs
-- 注: ローカルには重複する "Enable all for authenticated users"（全テナント許可）という
-- 過去の緩いポリシーも残存しているが、テナント分離を無効化する不具合のため引き継がない。
CREATE TABLE public.myou_alert_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES public.myou_companies(id) ON DELETE CASCADE,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    target_serials text[] NOT NULL,
    status text DEFAULT 'success'::text NOT NULL,
    error_message text,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id()
);
CREATE INDEX idx_myou_alert_logs_tenant_sent ON public.myou_alert_logs USING btree (tenant_id, sent_at DESC);
ALTER TABLE public.myou_alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_alert_logs" ON public.myou_alert_logs
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());
