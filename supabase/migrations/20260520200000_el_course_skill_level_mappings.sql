-- eラーニングコース × スキルレベルマッピング
-- コース修了時にスキルレベル達成を自動記録するための紐付けテーブル
CREATE TABLE public.el_course_skill_level_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  skill_level_id UUID NOT NULL REFERENCES public.skill_levels(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, skill_level_id)
);

ALTER TABLE public.el_course_skill_level_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.el_course_skill_level_mappings
  FOR ALL
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.el_course_skill_level_mappings (tenant_id, course_id);
CREATE INDEX ON public.el_course_skill_level_mappings (tenant_id, skill_level_id);

-- 従業員がコース修了を通じてスキルレベルを達成した記録
CREATE TABLE public.employee_skill_level_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_level_id UUID NOT NULL REFERENCES public.skill_levels(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  achieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, skill_level_id, course_id)
);

ALTER TABLE public.employee_skill_level_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.employee_skill_level_achievements
  FOR ALL
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.employee_skill_level_achievements (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_level_achievements (tenant_id, skill_level_id);
