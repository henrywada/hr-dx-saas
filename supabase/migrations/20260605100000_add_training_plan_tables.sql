-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- 育成計画テンプレート（職種 × 研修コース群の定義）
CREATE TABLE public.training_plan_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  skill_id    UUID REFERENCES public.tenant_skills(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.training_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.training_plan_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_training_plan_templates_tenant
  ON public.training_plan_templates(tenant_id, sort_order);

-- テンプレートに含まれるコース
CREATE TABLE public.training_plan_template_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  course_id   UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, course_id)
);

ALTER TABLE public.training_plan_template_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.training_plan_template_courses
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_training_plan_template_courses_template
  ON public.training_plan_template_courses(template_id, sort_order);

-- 個人育成計画（テンプレートを従業員に適用した記録）
CREATE TABLE public.employee_training_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id),
  due_date    DATE,
  created_by  UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.employee_training_plans
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_employee_training_plans_tenant_employee
  ON public.employee_training_plans(tenant_id, employee_id, created_at DESC);
