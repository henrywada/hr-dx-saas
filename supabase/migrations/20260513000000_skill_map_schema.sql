-- ============================================================
-- グローバルテンプレート（tenant_id なし）
-- ============================================================

CREATE TABLE public.global_skill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type TEXT NOT NULL CHECK (industry_type IN ('manufacturing', 'it')),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.global_skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.global_skill_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.global_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.global_skill_templates(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.global_skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE public.global_proficiency_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.global_skill_templates(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  label TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  UNIQUE (template_id, level)
);

-- グローバルテーブルのRLS: SELECT全員、変更はservice_roleのみ
ALTER TABLE public.global_skill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_proficiency_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_templates_select" ON public.global_skill_templates FOR SELECT USING (true);
CREATE POLICY "global_categories_select" ON public.global_skill_categories FOR SELECT USING (true);
CREATE POLICY "global_skills_select" ON public.global_skills FOR SELECT USING (true);
CREATE POLICY "global_proficiency_defs_select" ON public.global_proficiency_defs FOR SELECT USING (true);

-- ============================================================
-- テナント固有テーブル
-- ============================================================

CREATE TABLE public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_template_id UUID REFERENCES public.global_skill_templates(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.skill_proficiency_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  label TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  UNIQUE (tenant_id, level)
);

CREATE TABLE public.employee_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_level INTEGER NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_by UUID REFERENCES public.employees(id),
  UNIQUE (tenant_id, employee_id, skill_id)
);

CREATE TABLE public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_body TEXT,
  renewal_years INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.employee_qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  qualification_id UUID NOT NULL REFERENCES public.qualifications(id) ON DELETE CASCADE,
  acquired_date DATE,
  expiry_date DATE,
  cert_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.skill_map_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.employees(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  snapshot JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_skill_categories_tenant ON public.skill_categories(tenant_id);
CREATE INDEX idx_skills_tenant ON public.skills(tenant_id);
CREATE INDEX idx_skills_category ON public.skills(category_id);
CREATE INDEX idx_employee_skills_tenant ON public.employee_skills(tenant_id);
CREATE INDEX idx_employee_skills_employee ON public.employee_skills(employee_id);
CREATE INDEX idx_employee_qualifications_tenant ON public.employee_qualifications(tenant_id);
CREATE INDEX idx_employee_qualifications_expiry ON public.employee_qualifications(expiry_date);
CREATE INDEX idx_skill_map_drafts_tenant ON public.skill_map_drafts(tenant_id);

-- RLSポリシー（既存パターンと同一）
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_proficiency_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_map_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.skill_categories
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.skills
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.skill_proficiency_defs
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.employee_skills
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.qualifications
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.employee_qualifications
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.skill_map_drafts
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
