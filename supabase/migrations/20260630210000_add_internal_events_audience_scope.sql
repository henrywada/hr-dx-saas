-- E-O1 v2: 社内イベントの対象範囲（全社 / 部署限定）

ALTER TABLE public.internal_events
  ADD COLUMN IF NOT EXISTS audience_type TEXT NOT NULL DEFAULT 'tenant'
    CHECK (audience_type IN ('tenant', 'division')),
  ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;

ALTER TABLE public.internal_events
  DROP CONSTRAINT IF EXISTS internal_events_audience_division_check;

ALTER TABLE public.internal_events
  ADD CONSTRAINT internal_events_audience_division_check
  CHECK (
    (audience_type = 'tenant' AND division_id IS NULL)
    OR (audience_type = 'division' AND division_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_internal_events_division
  ON public.internal_events (tenant_id, division_id)
  WHERE audience_type = 'division';

COMMENT ON COLUMN public.internal_events.audience_type IS 'tenant=全社, division=部署限定（配下部署の従業員も可視）';
COMMENT ON COLUMN public.internal_events.division_id IS 'audience_type=division のとき対象部署 ID';

-- 従業員の所属部署がイベント対象部署と一致、または対象部署の配下に属するか
CREATE OR REPLACE FUNCTION public.employee_can_view_division_event(
  p_event_division_id uuid,
  p_employee_division_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_event_division_id IS NOT NULL
    AND p_employee_division_id IS NOT NULL
    AND (
      p_employee_division_id = p_event_division_id
      OR EXISTS (
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id
          FROM public.divisions
          WHERE id = p_employee_division_id
          UNION ALL
          SELECT d.id, d.parent_id
          FROM public.divisions d
          INNER JOIN ancestors a ON d.id = a.parent_id
        )
        SELECT 1 FROM ancestors WHERE id = p_event_division_id
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.employee_can_view_division_event(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "internal_events_select_tenant" ON public.internal_events;

CREATE POLICY "internal_events_select_scoped" ON public.internal_events
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (
      current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
      OR audience_type = 'tenant'
      OR employee_can_view_division_event(
        division_id,
        (SELECT e.division_id FROM public.employees e WHERE e.id = current_employee_id())
      )
    )
  );

DROP POLICY IF EXISTS "internal_events_insert_hr" ON public.internal_events;

CREATE POLICY "internal_events_insert_hr" ON public.internal_events
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
    AND (
      (audience_type = 'tenant' AND division_id IS NULL)
      OR (
        audience_type = 'division'
        AND division_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.divisions d
          WHERE d.id = division_id AND d.tenant_id = current_tenant_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "internal_events_update_hr" ON public.internal_events;

CREATE POLICY "internal_events_update_hr" ON public.internal_events
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager'])
    AND (
      (audience_type = 'tenant' AND division_id IS NULL)
      OR (
        audience_type = 'division'
        AND division_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.divisions d
          WHERE d.id = division_id AND d.tenant_id = current_tenant_id()
        )
      )
    )
  );
