-- =============================================================================
-- 拠点マスタ: 複数アンカー部署（junction）へ拡張
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.division_establishment_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  division_establishment_id uuid NOT NULL REFERENCES public.division_establishments(id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT division_establishment_anchors_unique_pair UNIQUE (division_establishment_id, division_id),
  CONSTRAINT division_establishment_anchors_tenant_division_unique UNIQUE (tenant_id, division_id)
);

COMMENT ON TABLE public.division_establishment_anchors IS '拠点に紐づくアンカー部署。所属の祖先チェーンでいずれかのアンカーに一致すれば当該拠点。同一部署はテナント内で1拠点のみ';

CREATE INDEX IF NOT EXISTS idx_dea_tenant ON public.division_establishment_anchors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dea_establishment ON public.division_establishment_anchors(division_establishment_id);
CREATE INDEX IF NOT EXISTS idx_dea_division ON public.division_establishment_anchors(division_id);

ALTER TABLE public.division_establishment_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "division_establishment_anchors_select_same_tenant"
  ON public.division_establishment_anchors
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishment_anchors_insert_same_tenant"
  ON public.division_establishment_anchors
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishment_anchors_update_same_tenant"
  ON public.division_establishment_anchors
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "division_establishment_anchors_delete_same_tenant"
  ON public.division_establishment_anchors
  FOR DELETE USING (tenant_id = public.current_tenant_id());

CREATE POLICY "supa_division_establishment_anchors_all" ON public.division_establishment_anchors
  USING (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid)
  WITH CHECK (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999'::uuid);

GRANT ALL ON TABLE public.division_establishment_anchors TO anon;
GRANT ALL ON TABLE public.division_establishment_anchors TO authenticated;
GRANT ALL ON TABLE public.division_establishment_anchors TO service_role;

INSERT INTO public.division_establishment_anchors (tenant_id, division_establishment_id, division_id)
SELECT de.tenant_id, de.id, de.anchor_division_id
FROM public.division_establishments de
WHERE de.anchor_division_id IS NOT NULL
ON CONFLICT (tenant_id, division_id) DO NOTHING;

ALTER TABLE public.division_establishments
  DROP CONSTRAINT IF EXISTS division_establishments_tenant_anchor_unique;

ALTER TABLE public.division_establishments
  DROP CONSTRAINT IF EXISTS division_establishments_anchor_division_id_fkey;

DROP INDEX IF EXISTS public.idx_division_establishments_anchor;

ALTER TABLE public.division_establishments
  DROP COLUMN IF EXISTS anchor_division_id;

COMMENT ON TABLE public.division_establishments IS '拠点マスタ。アンカー部署は division_establishment_anchors で複数登録';

CREATE OR REPLACE FUNCTION public.resolve_division_establishment_for_division(
  p_division_id uuid,
  p_tenant_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current uuid := p_division_id;
  v_est uuid;
BEGIN
  IF p_division_id IS NULL OR p_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  WHILE v_current IS NOT NULL LOOP
    SELECT dea.division_establishment_id INTO v_est
    FROM public.division_establishment_anchors dea
    WHERE dea.tenant_id = p_tenant_id
      AND dea.division_id = v_current
    LIMIT 1;
    IF FOUND AND v_est IS NOT NULL THEN
      RETURN v_est;
    END IF;
    SELECT d.parent_id INTO v_current
    FROM public.divisions d
    WHERE d.id = v_current;
  END LOOP;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.resolve_division_establishment_for_division IS '所属 division から親を遡り、最初に一致する拠点アンカーに対応する division_establishments.id を返す';
