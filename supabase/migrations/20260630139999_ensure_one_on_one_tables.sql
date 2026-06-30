-- リモートに未作成の one_on_one テーブルを先行確保する。
-- 20260604200000 が履歴のみ先行適用されている、または未 push の場合に 20260630140000 の FK が失敗するため。

CREATE TABLE IF NOT EXISTS public.one_on_one_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  manager_id      UUID NOT NULL REFERENCES public.employees(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  theme           TEXT NOT NULL,
  notes           TEXT,
  next_date       DATE,
  conducted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.one_on_one_sessions;
CREATE POLICY "tenant_isolation" ON public.one_on_one_sessions
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_one_on_one_tenant_manager
  ON public.one_on_one_sessions(tenant_id, manager_id, conducted_at DESC);

CREATE INDEX IF NOT EXISTS idx_one_on_one_tenant_employee
  ON public.one_on_one_sessions(tenant_id, employee_id, conducted_at DESC);

CREATE TABLE IF NOT EXISTS public.one_on_one_theme_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_theme_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.one_on_one_theme_templates;
CREATE POLICY "tenant_isolation" ON public.one_on_one_theme_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_theme_templates_tenant
  ON public.one_on_one_theme_templates(tenant_id, sort_order);
