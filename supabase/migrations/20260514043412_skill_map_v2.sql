-- スキルマップ v2: 旧マトリクス型テーブルを削除し新型に置き換え

-- 1. 旧テーブル削除（依存順）
DROP TABLE IF EXISTS public.employee_skills CASCADE;
DROP TABLE IF EXISTS public.skill_proficiency_defs CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.skill_categories CASCADE;
DROP TABLE IF EXISTS public.global_proficiency_defs CASCADE;
DROP TABLE IF EXISTS public.global_skills CASCADE;
DROP TABLE IF EXISTS public.global_skill_categories CASCADE;
DROP TABLE IF EXISTS public.global_skill_templates CASCADE;

-- 2. テナント技能マスタ
CREATE TABLE public.tenant_skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.tenant_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.tenant_skills
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- 3. 従業員技能割り当て（履歴テーブル兼用）
CREATE TABLE public.employee_skill_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES public.tenant_skills(id) ON DELETE CASCADE,
  started_at  DATE NOT NULL,
  reason      TEXT,
  assigned_by UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.employee_skill_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.employee_skill_assignments
  FOR ALL USING (tenant_id = public.current_tenant_id());
CREATE INDEX ON public.employee_skill_assignments (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_assignments (tenant_id, skill_id);

-- 4. スキルレベルマスタ（テナント自由定義）
CREATE TABLE public.skill_levels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color_hex   TEXT NOT NULL DEFAULT '#6b7280',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.skill_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.skill_levels
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- 5. 技能別要件定義
CREATE TABLE public.skill_requirements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES public.tenant_skills(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT,
  level_id    UUID REFERENCES public.skill_levels(id) ON DELETE SET NULL,
  criteria    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.skill_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.skill_requirements
  FOR ALL USING (tenant_id = public.current_tenant_id());
CREATE INDEX ON public.skill_requirements (tenant_id, skill_id);
