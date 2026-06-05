-- =============================================================================
-- サクセッションプラン（後継者管理）テーブル
-- =============================================================================
-- 重要ポジションマスタ + 後継候補テーブル
-- RLS: current_tenant_id() を使用してテナント隔離

-- ────────────────────────────────────────────────
-- 重要ポジションマスタ
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.succession_positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  division_id       UUID REFERENCES public.divisions(id),
  current_holder_id UUID REFERENCES public.employees(id),
  risk_level        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (risk_level IN ('high', 'medium', 'low')),
  notes             TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_succession_positions_tenant
  ON public.succession_positions(tenant_id, sort_order);

CREATE INDEX idx_succession_positions_division
  ON public.succession_positions(division_id);

CREATE INDEX idx_succession_positions_holder
  ON public.succession_positions(current_holder_id);

-- RLS（セキュリティ）
ALTER TABLE public.succession_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select_same_tenant" ON public.succession_positions
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "sp_insert_same_tenant" ON public.succession_positions
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sp_update_same_tenant" ON public.succession_positions
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sp_delete_same_tenant" ON public.succession_positions
  FOR DELETE USING (tenant_id = public.current_tenant_id());

-- ────────────────────────────────────────────────
-- 後継候補テーブル
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.succession_candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  position_id         UUID NOT NULL REFERENCES public.succession_positions(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES public.employees(id),
  readiness           TEXT NOT NULL DEFAULT 'three_to_five_years'
                      CHECK (readiness IN ('ready_now', 'one_to_two_years', 'three_to_five_years')),
  performance_score   INTEGER NOT NULL DEFAULT 2
                      CHECK (performance_score BETWEEN 1 AND 3),
  potential_score     INTEGER NOT NULL DEFAULT 2
                      CHECK (potential_score BETWEEN 1 AND 3),
  development_actions TEXT,
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (position_id, employee_id)
);

-- インデックス
CREATE INDEX idx_succession_candidates_position
  ON public.succession_candidates(position_id);

CREATE INDEX idx_succession_candidates_tenant_emp
  ON public.succession_candidates(tenant_id, employee_id);

CREATE INDEX idx_succession_candidates_employee
  ON public.succession_candidates(employee_id);

-- RLS（セキュリティ）
ALTER TABLE public.succession_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_select_same_tenant" ON public.succession_candidates
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_insert_same_tenant" ON public.succession_candidates
  FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_update_same_tenant" ON public.succession_candidates
  FOR UPDATE USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "sc_delete_same_tenant" ON public.succession_candidates
  FOR DELETE USING (tenant_id = public.current_tenant_id());
