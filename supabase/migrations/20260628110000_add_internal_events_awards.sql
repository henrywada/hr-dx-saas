-- 社内イベント告知・参加管理 ＋ 表彰登録
-- 設計: docs/implementation-plan-internal-events-awards.md

CREATE TABLE public.internal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_internal_events_tenant_date ON public.internal_events (tenant_id, event_date);

CREATE TABLE public.internal_event_attendees (
  event_id UUID NOT NULL REFERENCES public.internal_events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  rsvp_status TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, employee_id)
);

CREATE TABLE public.awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  recipient_employee_id UUID NOT NULL REFERENCES public.employees(id),
  award_type TEXT NOT NULL,
  period_label TEXT NOT NULL,
  comment TEXT,
  created_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_awards_tenant_created ON public.awards (tenant_id, created_at DESC);

ALTER TABLE public.internal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

-- internal_events: テナント全員がSELECT可能、作成・編集・削除はhr/hr_managerのみ
CREATE POLICY "internal_events_select_tenant" ON public.internal_events
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "internal_events_insert_hr" ON public.internal_events
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );

CREATE POLICY "internal_events_update_hr" ON public.internal_events
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );

CREATE POLICY "internal_events_delete_hr" ON public.internal_events
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );

-- internal_event_attendees: 本人は自分のRSVPをSELECT/INSERT/UPDATE可能。hr/hr_managerは同テナント全行をSELECT可能（参加者管理用）
CREATE POLICY "internal_event_attendees_select_self" ON public.internal_event_attendees
  FOR SELECT USING (employee_id = current_employee_id());

CREATE POLICY "internal_event_attendees_select_hr" ON public.internal_event_attendees
  FOR SELECT USING (
    current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
    AND EXISTS (
      SELECT 1 FROM public.internal_events e
      WHERE e.id = internal_event_attendees.event_id AND e.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "internal_event_attendees_insert_self" ON public.internal_event_attendees
  FOR INSERT WITH CHECK (
    employee_id = current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.internal_events e
      WHERE e.id = internal_event_attendees.event_id AND e.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "internal_event_attendees_update_self" ON public.internal_event_attendees
  FOR UPDATE USING (employee_id = current_employee_id())
  WITH CHECK (employee_id = current_employee_id());

-- awards: テナント全員がSELECT可能（称賛文化の可視化）、登録・編集・削除はhr/hr_managerのみ
CREATE POLICY "awards_select_tenant" ON public.awards
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "awards_insert_hr" ON public.awards
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );

CREATE POLICY "awards_update_hr" ON public.awards
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );

CREATE POLICY "awards_delete_hr" ON public.awards
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  );
