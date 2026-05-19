CREATE TABLE public.skill_requirement_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requirement_id      UUID NOT NULL REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending_manager'
                      CHECK (status IN ('pending_manager','pending_hr','approved','rejected')),
  evidence            TEXT,
  manager_comment     TEXT,
  hr_comment          TEXT,
  manager_approved_by UUID REFERENCES public.employees(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by      UUID REFERENCES public.employees(id),
  hr_approved_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_requirement_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.skill_requirement_applications
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );