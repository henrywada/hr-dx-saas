-- プラン条件マスタ（旧 PLAN_CONFIG の永続化）
CREATE TABLE public.plan_config (
  plan_type            TEXT PRIMARY KEY
    CHECK (plan_type IN ('free', 'plan100', 'plan300', 'plan500', 'plan1000')),
  label                TEXT NOT NULL,
  max_employees        INTEGER NOT NULL CHECK (max_employees >= 1),
  initial_status       TEXT NOT NULL CHECK (initial_status IN ('active', 'pending')),
  payment_method       TEXT NOT NULL CHECK (payment_method IN ('free', 'card', 'bank_transfer')),
  payment_status       TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending_transfer', 'unpaid')),
  contract_months      INTEGER CHECK (contract_months IS NULL OR contract_months >= 1),
  available            BOOLEAN NOT NULL DEFAULT false,
  template_tenant_name TEXT NOT NULL,
  stripe_price_id_env  TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.plan_config IS
  'セルフサインアップ用プラン条件マスタ。コードの PLAN_CONFIG 相当';
COMMENT ON COLUMN public.plan_config.contract_months IS
  '契約月数。NULL は無期限';
COMMENT ON COLUMN public.plan_config.available IS
  'true のとき LP /signup から申込可能';
COMMENT ON COLUMN public.plan_config.template_tenant_name IS
  'tenant_service / ダッシュボードコピー元のテンプレートテナント名';

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.plan_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plan_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_config_select_public" ON public.plan_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "plan_config_saas_write" ON public.plan_config
  FOR ALL
  TO authenticated
  USING (public.current_employee_app_role() = 'developer')
  WITH CHECK (public.current_employee_app_role() = 'developer');

INSERT INTO public.plan_config (
  plan_type, label, max_employees, initial_status, payment_method, payment_status,
  contract_months, available, template_tenant_name, stripe_price_id_env, sort_order
) VALUES
  ('free',     '無料プラン',  30,   'active', 'free', 'unpaid', 3,    true,  'PlanFree',  NULL,                        1),
  ('plan100',  'プラン100',   100,  'active', 'card', 'paid',   12,   false, 'Plan100',   'STRIPE_PLAN100_PRICE_ID',   2),
  ('plan300',  'プラン300',   300,  'active', 'card', 'paid',   12,   false, 'Plan300',   'STRIPE_PLAN300_PRICE_ID',   3),
  ('plan500',  'プラン500',   500,  'active', 'card', 'paid',   12,   false, 'Plan500',   'STRIPE_PLAN500_PRICE_ID',   4),
  ('plan1000', 'プラン1000',  1000, 'active', 'card', 'paid',   12,   false, 'Plan1000',  'STRIPE_PLAN1000_PRICE_ID',  5);
