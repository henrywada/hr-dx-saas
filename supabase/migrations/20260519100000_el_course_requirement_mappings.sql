-- eラーニングコース × スキル要件マッピング
-- コース修了時にスキル要件を自動達成するための紐付けテーブル
CREATE TABLE public.el_course_requirement_mappings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id      UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, requirement_id)
);

ALTER TABLE public.el_course_requirement_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.el_course_requirement_mappings
  FOR ALL
  USING  (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE INDEX ON public.el_course_requirement_mappings (tenant_id, course_id);
CREATE INDEX ON public.el_course_requirement_mappings (tenant_id, requirement_id);
