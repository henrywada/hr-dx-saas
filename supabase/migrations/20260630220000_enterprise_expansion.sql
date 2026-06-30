-- エンタープライズ拡張: 1on1 予定・アジェンダ + 評価リマインドメール追跡

CREATE TABLE public.one_on_one_upcoming (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  manager_id   UUID NOT NULL REFERENCES public.employees(id),
  employee_id  UUID NOT NULL REFERENCES public.employees(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  theme        TEXT NOT NULL,
  agenda       TEXT,
  status       TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  reminded_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.one_on_one_upcoming ENABLE ROW LEVEL SECURITY;

CREATE POLICY "one_on_one_upcoming_scoped" ON public.one_on_one_upcoming
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
    AND (
      employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
      OR manager_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        JOIN public.app_role ar ON ar.id = e.app_role_id
        WHERE e.user_id = auth.uid()
          AND ar.app_role IN ('hr', 'hr_manager', 'tenant_admin', 'developer')
      )
    )
  );

CREATE INDEX idx_one_on_one_upcoming_tenant_scheduled
  ON public.one_on_one_upcoming (tenant_id, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX idx_one_on_one_upcoming_employee
  ON public.one_on_one_upcoming (tenant_id, employee_id, scheduled_at DESC);

ALTER TABLE public.evaluation_reminders
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_error TEXT;
