-- ============================================================
-- 要員アサイン・シミュレータ ＆ キャリアパス分析 拡張スキーマ
-- ============================================================

-- 1. シミュレーション（プロジェクト・仮チーム）の親テーブル
CREATE TABLE public.project_simulations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL, -- 例: 「2026年度 新規開発Aチーム編成案」
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by    UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. シミュレーション内の「求めるポジション（枠）」
CREATE TABLE public.simulation_positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.project_simulations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL, -- 例: 「リードエンジニア」, 「PM」
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ポジションが求める「具体的なスキル要件」とその重み
CREATE TABLE public.simulation_position_requirements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  position_id   UUID NOT NULL REFERENCES public.simulation_positions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.skill_requirements(id) ON DELETE CASCADE,
  is_essential  BOOLEAN NOT NULL DEFAULT true, -- TRUE: 必須要件（足切り）, FALSE: 歓迎要件（加点）
  weight        INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1 AND weight <= 5), -- 重要度重み (1〜5)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. シミュレーションに仮アサインしたメンバー
CREATE TABLE public.simulation_assigned_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.project_simulations(id) ON DELETE CASCADE,
  position_id   UUID NOT NULL REFERENCES public.simulation_positions(id) ON DELETE CASCADE,
  employee_id   UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (simulation_id, position_id) -- 1つのポジション枠には1名のみ仮アサイン
);

-- 5. 従業員のキャリア目標職種を保持するテーブル
CREATE TABLE public.employee_career_goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  target_skill_id UUID NOT NULL REFERENCES public.tenant_skills(id) ON DELETE CASCADE, -- 目標とする職種
  target_date     DATE, -- いつまでに達成したいか
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, target_skill_id)
);

-- 6. 充足率・レベルアップの経時変化を分析するための「履歴スナップショット（月次・イベント時）」
CREATE TABLE public.employee_skill_requirement_history (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id            UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recorded_at            DATE NOT NULL DEFAULT CURRENT_DATE, -- 記録日（通常は月末）
  skill_id               UUID NOT NULL REFERENCES public.tenant_skills(id) ON DELETE CASCADE,
  total_requirements     INTEGER NOT NULL DEFAULT 0,
  completed_requirements INTEGER NOT NULL DEFAULT 0,
  completion_rate        NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) ポリシー設定
-- ============================================================
ALTER TABLE public.project_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_position_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_assigned_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skill_requirement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.project_simulations
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.simulation_positions
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.simulation_position_requirements
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.simulation_assigned_members
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.employee_career_goals
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "tenant_isolation" ON public.employee_skill_requirement_history
  FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

-- ============================================================
-- 高速化インデックス
-- ============================================================
CREATE INDEX ON public.project_simulations (tenant_id);
CREATE INDEX ON public.simulation_positions (tenant_id, simulation_id);
CREATE INDEX ON public.simulation_position_requirements (tenant_id, position_id);
CREATE INDEX ON public.simulation_assigned_members (tenant_id, simulation_id, employee_id);
CREATE INDEX ON public.employee_career_goals (tenant_id, employee_id);
CREATE INDEX ON public.employee_skill_requirement_history (tenant_id, employee_id, recorded_at);
