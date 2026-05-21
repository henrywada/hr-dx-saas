-- 20260521000000_skill_improvement_synergy.sql

CREATE TABLE public.employee_skill_self_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  self_level_id UUID REFERENCES public.skill_levels(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, requirement_id)
);

CREATE TABLE public.skill_feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  receiver_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('skill_approval', '1on1', 'career_goal')),
  related_id UUID,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_recommended_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recommender_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, course_id)
);

ALTER TABLE public.employee_skill_self_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_recommended_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.employee_skill_self_evaluations
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_isolation" ON public.skill_feedback_comments
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_isolation" ON public.employee_recommended_courses
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX ON public.employee_skill_self_evaluations (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_self_evaluations (tenant_id, requirement_id);
CREATE INDEX ON public.skill_feedback_comments (tenant_id, receiver_employee_id);
CREATE INDEX ON public.skill_feedback_comments (tenant_id, sender_employee_id);
CREATE INDEX ON public.employee_recommended_courses (tenant_id, employee_id);
CREATE INDEX ON public.employee_recommended_courses (tenant_id, recommender_id);
