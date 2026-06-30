-- EL-C2: SCORM 1.2 / xAPI（LRS ライト）

ALTER TABLE public.el_courses
  ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'native'
    CHECK (content_format IN ('native', 'scorm_12', 'xapi_launch'));

CREATE TABLE public.el_scorm_packages (
  course_id UUID PRIMARY KEY REFERENCES public.el_courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL CHECK (package_type IN ('scorm_12', 'xapi_launch')),
  storage_prefix TEXT,
  launch_path TEXT NOT NULL,
  original_filename TEXT,
  uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_el_scorm_packages_tenant ON public.el_scorm_packages (tenant_id);

CREATE TABLE public.el_scorm_runtime (
  assignment_id UUID PRIMARY KEY REFERENCES public.el_assignments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  cmi_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  lesson_status TEXT,
  score_raw TEXT,
  suspend_data TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_el_scorm_runtime_tenant ON public.el_scorm_runtime (tenant_id);

CREATE TABLE public.el_xapi_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.el_assignments(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  verb_id TEXT NOT NULL,
  activity_id TEXT,
  result_score NUMERIC,
  statement JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_el_xapi_statements_tenant_recorded
  ON public.el_xapi_statements (tenant_id, recorded_at DESC);
CREATE INDEX idx_el_xapi_statements_assignment
  ON public.el_xapi_statements (assignment_id, recorded_at DESC);

ALTER TABLE public.el_scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_scorm_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.el_xapi_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_scorm_packages_select_tenant" ON public.el_scorm_packages
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "el_scorm_packages_manage_hr" ON public.el_scorm_packages
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
  );

CREATE POLICY "el_scorm_runtime_select" ON public.el_scorm_runtime
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND (
      assignment_id IN (
        SELECT id FROM public.el_assignments
        WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
      )
      OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
    )
  );

CREATE POLICY "el_scorm_runtime_upsert_self" ON public.el_scorm_runtime
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND assignment_id IN (
      SELECT id FROM public.el_assignments
      WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND assignment_id IN (
      SELECT id FROM public.el_assignments
      WHERE employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "el_xapi_statements_insert_self" ON public.el_xapi_statements
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  );

CREATE POLICY "el_xapi_statements_select" ON public.el_xapi_statements
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.employees WHERE user_id = auth.uid())
    AND (
      employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
      OR current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'developer'])
    )
  );
