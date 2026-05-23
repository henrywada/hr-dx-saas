-- Fix CRITICAL: Add tenant isolation to skill_consultations RLS
-- Previous policy only checked employee_id/manager_id but not tenant_id
DROP POLICY IF EXISTS "employee_or_manager" ON public.skill_consultations;

CREATE POLICY "employee_or_manager" ON public.skill_consultations
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND (
      employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
      OR
      manager_id  = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

-- Fix HIGH: Add missing indexes for performance
-- Index on skill_growth_milestones for tenant + employee lookups
CREATE INDEX IF NOT EXISTS idx_skill_growth_milestones_tenant_employee
  ON public.skill_growth_milestones (tenant_id, employee_id);

-- Index on skill_consultations for tenant + employee lookups
CREATE INDEX IF NOT EXISTS idx_skill_consultations_tenant_employee
  ON public.skill_consultations (tenant_id, employee_id);

-- Index on skill_consultations for tenant + manager lookups
CREATE INDEX IF NOT EXISTS idx_skill_consultations_tenant_manager
  ON public.skill_consultations (tenant_id, manager_id);
