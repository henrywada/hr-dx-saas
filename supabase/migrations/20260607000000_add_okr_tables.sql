-- 既存テーブルは一切変更しない。新規テーブルのみ追加。
-- OKR / 目標管理機能（NEW-2）

-- =========================================================
-- objectives — 目標（Objective）
-- =========================================================
CREATE TABLE public.objectives (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES public.tenants(id),
  parent_id           UUID        REFERENCES public.objectives(id),
  owner_type          TEXT        NOT NULL CHECK (owner_type IN ('company','division','employee')),
  owner_employee_id   UUID        REFERENCES public.employees(id),
  owner_division_id   UUID        REFERENCES public.divisions(id),
  period_label        TEXT        NOT NULL,
  fiscal_year         INTEGER     NOT NULL,
  half_year           TEXT        CHECK (half_year IN ('first','second')),
  title               TEXT        NOT NULL,
  description         TEXT,
  status              TEXT        NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','completed','cancelled')),
  progress            NUMERIC(5,2) NOT NULL DEFAULT 0
                      CHECK (progress >= 0 AND progress <= 100),
  sort_order          INTEGER     NOT NULL DEFAULT 0,
  evaluation_sheet_id UUID        REFERENCES public.evaluation_sheets(id),
  approved_at         TIMESTAMPTZ,
  approved_by         UUID        REFERENCES public.employees(id),
  created_by          UUID        REFERENCES public.employees(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.objectives
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_objectives_tenant_year
  ON public.objectives(tenant_id, fiscal_year, half_year);
CREATE INDEX idx_objectives_parent
  ON public.objectives(parent_id);
CREATE INDEX idx_objectives_owner_employee
  ON public.objectives(tenant_id, owner_employee_id);
CREATE INDEX idx_objectives_owner_division
  ON public.objectives(tenant_id, owner_division_id);

CREATE TRIGGER trg_objectives_updated_at
  BEFORE UPDATE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- key_results — 主要成果（Key Result）
-- =========================================================
CREATE TABLE public.key_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  objective_id    UUID        NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT,
  kr_type         TEXT        NOT NULL DEFAULT 'quantitative'
                  CHECK (kr_type IN ('quantitative','qualitative')),
  target_value    NUMERIC,
  current_value   NUMERIC     NOT NULL DEFAULT 0,
  unit            TEXT,
  start_value     NUMERIC     NOT NULL DEFAULT 0,
  progress        NUMERIC(5,2) NOT NULL DEFAULT 0
                  CHECK (progress >= 0 AND progress <= 100),
  weight          NUMERIC(5,2) NOT NULL DEFAULT 100,
  due_date        DATE,
  status          TEXT        NOT NULL DEFAULT 'on_track'
                  CHECK (status IN ('on_track','at_risk','off_track','completed','cancelled')),
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_by      UUID        REFERENCES public.employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.key_results
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_key_results_objective
  ON public.key_results(objective_id, sort_order);
CREATE INDEX idx_key_results_tenant
  ON public.key_results(tenant_id);

CREATE TRIGGER trg_key_results_updated_at
  BEFORE UPDATE ON public.key_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- checkins — 週次チェックイン
-- =========================================================
CREATE TABLE public.checkins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES public.tenants(id),
  key_result_id   UUID        NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES public.employees(id),
  confidence      INTEGER     NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  current_value   NUMERIC,
  comment         TEXT,
  checkin_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.checkins
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_checkins_kr
  ON public.checkins(key_result_id, checkin_date DESC);
CREATE INDEX idx_checkins_employee
  ON public.checkins(tenant_id, employee_id, checkin_date DESC);
