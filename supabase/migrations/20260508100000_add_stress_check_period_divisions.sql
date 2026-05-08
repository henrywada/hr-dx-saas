-- =============================================================================
-- ストレスチェック「実施グループ（division ベース）」対応
-- stress_check_periods に comment カラムを追加し、
-- division との N:M ジャンクションテーブルを新設する。
-- 従業員の所属 division（+ 祖先）から有効な実施期間を解決する RPC も追加。
-- 旧データ（division_establishment_id ベース）は後方互換で動作継続。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. stress_check_periods に comment カラムを追加
-- -----------------------------------------------------------------------------
ALTER TABLE public.stress_check_periods
  ADD COLUMN IF NOT EXISTS comment text;

COMMENT ON COLUMN public.stress_check_periods.comment
  IS '実施グループへのコメント・備考（任意）';

-- -----------------------------------------------------------------------------
-- 2. stress_check_period_divisions（period ↔ division の N:M ジャンクション）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stress_check_period_divisions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id   uuid        NOT NULL REFERENCES public.stress_check_periods(id) ON DELETE CASCADE,
  division_id uuid        NOT NULL REFERENCES public.divisions(id)            ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id)              ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, division_id)
);

COMMENT ON TABLE public.stress_check_period_divisions
  IS '実施グループ（stress_check_periods）と対象部署（divisions）の紐付け。
      親 division を登録すると配下の全従業員が対象となる（RPC 側で ancestor 解決）';

-- RLS
ALTER TABLE public.stress_check_period_divisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "period_divisions_select"
  ON public.stress_check_period_divisions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());

CREATE POLICY "period_divisions_insert"
  ON public.stress_check_period_divisions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "period_divisions_delete"
  ON public.stress_check_period_divisions FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- インデックス
CREATE INDEX idx_period_divisions_period   ON public.stress_check_period_divisions(period_id);
CREATE INDEX idx_period_divisions_division ON public.stress_check_period_divisions(division_id);
CREATE INDEX idx_period_divisions_tenant   ON public.stress_check_period_divisions(tenant_id);

-- -----------------------------------------------------------------------------
-- 3. RPC: resolve_active_period_for_employee_v2
--    employee の division から祖先チェーンを遡り、
--    stress_check_period_divisions に一致する active な period_id を返す。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_active_period_for_employee_v2(
  p_employee_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_div_id    uuid;
  v_tenant_id uuid;
  v_period_id uuid;
  v_today     date := CURRENT_DATE;
BEGIN
  -- 従業員の division_id と tenant_id を取得
  SELECT division_id, tenant_id
    INTO v_div_id, v_tenant_id
    FROM employees
   WHERE id = p_employee_id;

  IF NOT FOUND OR v_div_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 自身 + 祖先 division ID を再帰で展開し、一致する active period を探す
  WITH RECURSIVE ancestors AS (
    -- ベース: 従業員の所属 division
    SELECT id, parent_id
      FROM divisions
     WHERE id = v_div_id
       AND tenant_id = v_tenant_id

    UNION

    -- 再帰: 親 division を辿る
    SELECT d.id, d.parent_id
      FROM divisions d
      JOIN ancestors a ON d.id = a.parent_id
     WHERE a.parent_id IS NOT NULL
  )
  SELECT p.id
    INTO v_period_id
    FROM stress_check_periods p
    JOIN stress_check_period_divisions pd ON p.id = pd.period_id
   WHERE p.tenant_id  = v_tenant_id
     AND p.status     = 'active'
     AND p.start_date <= v_today
     AND p.end_date   >= v_today
     AND pd.division_id IN (SELECT id FROM ancestors)
   ORDER BY p.created_at DESC
   LIMIT 1;

  RETURN v_period_id;
END;
$$;

COMMENT ON FUNCTION public.resolve_active_period_for_employee_v2(uuid)
  IS '従業員の division + 祖先チェーンから有効な stress_check_period を解決する（division ベース新方式）';

GRANT EXECUTE ON FUNCTION public.resolve_active_period_for_employee_v2(uuid)
  TO anon, authenticated, service_role;
