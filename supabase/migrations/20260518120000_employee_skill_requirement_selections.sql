-- 従業員×技能要件の「選択済み」行（存在＝On、未選択＝Off）
CREATE TABLE public.employee_skill_requirement_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, requirement_id)
);

ALTER TABLE public.employee_skill_requirement_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.employee_skill_requirement_selections
  FOR ALL
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.employee_skill_requirement_selections (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_requirement_selections (tenant_id, requirement_id);
