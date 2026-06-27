-- 悩み・相談窓口（Consultation Desk）
-- 匿名性は表示層のみで実現する。employee_id は匿名相談でも常に保存し、
-- 対応者向けUIで is_anonymous=true の場合に氏名解決をスキップする方針（設計: docs/superpowers/specs/2026-06-27-consultation-desk-design.md）。

CREATE TYPE consultation_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE consultation_category AS ENUM ('harassment', 'mental_health', 'workload', 'interpersonal', 'other');

CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  category consultation_category NOT NULL,
  body TEXT NOT NULL,
  status consultation_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.consultation_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  author_employee_id UUID NOT NULL REFERENCES public.employees(id),
  is_staff_reply BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consultations_tenant_employee ON public.consultations (tenant_id, employee_id);
CREATE INDEX idx_consultation_replies_consultation_id ON public.consultation_replies (consultation_id);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_select_self" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "consultations_select_staff" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultations_insert_self" ON public.consultations
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "consultations_update_staff" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
  );

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (
          c.employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
          OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc'])
        )
    )
  );
