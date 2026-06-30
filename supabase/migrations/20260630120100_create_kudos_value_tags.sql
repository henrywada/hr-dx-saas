-- 感謝・称賛のバリュータグマスタ（K-S1）
CREATE TABLE public.kudos_value_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kudos_value_tags_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX idx_kudos_value_tags_tenant_active
  ON public.kudos_value_tags (tenant_id, is_active, sort_order);

ALTER TABLE public.kudos_value_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kudos_value_tags_select_tenant" ON public.kudos_value_tags
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "kudos_value_tags_manage_hr" ON public.kudos_value_tags
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  );
