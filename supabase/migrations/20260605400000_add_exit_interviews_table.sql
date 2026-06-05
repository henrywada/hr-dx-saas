CREATE TABLE IF NOT EXISTS public.exit_interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  employee_name   TEXT NOT NULL,
  department_name TEXT,
  exit_date       DATE NOT NULL,
  tenure_months   INT NOT NULL DEFAULT 0,
  age_group       TEXT NOT NULL DEFAULT 'unknown'
                  CHECK (age_group IN ('under_25', '25_to_34', '35_to_44', '45_to_54', '55_plus', 'unknown')),
  main_reason     TEXT NOT NULL
                  CHECK (main_reason IN (
                    'compensation', 'interpersonal', 'career',
                    'life_event', 'management', 'work_style',
                    'company_direction', 'other'
                  )),
  sub_reasons     TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  recorded_by     UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exit_interviews_tenant   ON public.exit_interviews(tenant_id, exit_date DESC);
CREATE INDEX idx_exit_interviews_employee ON public.exit_interviews(employee_id);
CREATE INDEX idx_exit_interviews_reason   ON public.exit_interviews(tenant_id, main_reason);

ALTER TABLE public.exit_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ei_select" ON public.exit_interviews
  FOR SELECT USING (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_insert" ON public.exit_interviews
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_update" ON public.exit_interviews
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY "ei_delete" ON public.exit_interviews
  FOR DELETE USING (tenant_id = public.current_tenant_id());
