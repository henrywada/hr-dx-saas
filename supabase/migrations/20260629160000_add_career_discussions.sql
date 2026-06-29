-- キャリア面談（個人のキャリア志向に関する面談記録・履歴管理）
-- 1on1（one_on_one_sessions）と同じ構造をベースにしつつ、career_aspiration等の機密性の高い
-- 内容を扱うため、SELECTは「本人・記録者・HR系ロール」に限定する（consultation-deskと同方針）。

CREATE TABLE public.career_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),              -- 対象従業員
  conducted_by_employee_id UUID NOT NULL REFERENCES public.employees(id), -- 実施者（上長 or 人事）
  theme TEXT NOT NULL,
  career_aspiration TEXT,  -- 本人の志向・希望（succession-plan連携の参照データ）
  notes TEXT,
  next_date DATE,
  evaluation_period_id UUID REFERENCES public.evaluation_periods(id),     -- 任意。評価サイクルに紐付ける場合のみ
  conducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_career_discussions_employee ON public.career_discussions (tenant_id, employee_id, conducted_at DESC);
CREATE INDEX idx_career_discussions_conductor ON public.career_discussions (tenant_id, conducted_by_employee_id, conducted_at DESC);

CREATE TABLE public.career_discussion_theme_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.career_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_discussion_theme_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "career_discussions_select" ON public.career_discussions
  FOR SELECT USING (
    tenant_id = current_tenant_id() AND (
      employee_id = current_employee_id()
      OR conducted_by_employee_id = current_employee_id()
      OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'tenant_admin', 'developer'])
    )
  );

CREATE POLICY "career_discussions_insert" ON public.career_discussions
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id() AND conducted_by_employee_id = current_employee_id()
  );

CREATE POLICY "career_discussions_update" ON public.career_discussions
  FOR UPDATE USING (tenant_id = current_tenant_id() AND conducted_by_employee_id = current_employee_id())
  WITH CHECK (tenant_id = current_tenant_id() AND conducted_by_employee_id = current_employee_id());

CREATE POLICY "career_discussion_theme_templates_tenant" ON public.career_discussion_theme_templates
  FOR ALL USING (tenant_id = current_tenant_id());
