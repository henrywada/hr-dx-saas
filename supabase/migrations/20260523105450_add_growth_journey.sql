-- skill_growth_milestones
CREATE TABLE public.skill_growth_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
  employee_id   UUID NOT NULL REFERENCES public.employees(id),
  title         TEXT NOT NULL,
  description   TEXT,
  target_date   DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed', 'confirmed', 'in_progress', 'completed', 'changed')),
  proposed_by   UUID NOT NULL REFERENCES public.employees(id),
  confirmed_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_growth_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.skill_growth_milestones
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- employee_career_goals にステータス列追加
ALTER TABLE public.employee_career_goals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('proposed', 'confirmed', 'active', 'achieved')),
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS message TEXT;

-- skill_consultations
CREATE TABLE public.skill_consultations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  manager_id      UUID NOT NULL REFERENCES public.employees(id),
  category_tags   TEXT[] NOT NULL DEFAULT '{}',
  message         TEXT,
  manager_reply   TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'replied', 'resolved')),
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_or_manager" ON public.skill_consultations
  FOR ALL USING (
    employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    OR
    manager_id  = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );
