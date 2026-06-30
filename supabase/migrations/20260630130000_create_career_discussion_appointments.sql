-- キャリア面談予約（CR-S1: 1on1 の next_date / リマインダー相当を予約として明示化）
CREATE TABLE public.career_discussion_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  scheduled_by_employee_id UUID NOT NULL REFERENCES public.employees(id),
  theme TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_appointments_tenant_scheduled
  ON public.career_discussion_appointments (tenant_id, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX idx_career_appointments_employee
  ON public.career_discussion_appointments (tenant_id, employee_id, scheduled_at DESC);

CREATE INDEX idx_career_appointments_scheduler
  ON public.career_discussion_appointments (tenant_id, scheduled_by_employee_id, scheduled_at DESC);

ALTER TABLE public.career_discussion_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career_appointments_select" ON public.career_discussion_appointments
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      employee_id = current_employee_id()
      OR scheduled_by_employee_id = current_employee_id()
      OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])
    )
  );

CREATE POLICY "career_appointments_insert" ON public.career_discussion_appointments
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND scheduled_by_employee_id = current_employee_id()
  );

CREATE POLICY "career_appointments_update" ON public.career_discussion_appointments
  FOR UPDATE USING (
    tenant_id = current_tenant_id() AND (
      scheduled_by_employee_id = current_employee_id()
      OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])
    )
  )
  WITH CHECK (tenant_id = current_tenant_id());
