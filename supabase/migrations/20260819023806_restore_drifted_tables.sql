-- =============================================================================
-- 本番で欠落していた3テーブルの復元
--
--   背景: 2026-08-19、「調べる」機能のマイグレーションを本番へ適用した後に
--         ローカルと本番の public スキーマを突き合わせたところ、2ファイル分・
--         3テーブルが「履歴上は適用済み」なのに本番に実在しないことが判明した。
--         2026-08-18 に復元した8テーブル（20260818110000）とは別のテーブルで、
--         同じ故障モードの再発である。ローカルには全て正常に存在する。
--
--     - 20260314000000_add_dashboard_tables.sql
--         -> pulse_survey_periods
--            src/features/dashboard/queries.ts と hr-kpi/queries.ts が参照。
--            /adm/hr-kpi は本番で1テナントが契約中。
--     - 20260605200000_add_succession_plan_tables.sql
--         -> succession_positions, succession_candidates
--            src/features/succession-plan/{actions,queries}.ts が参照。
--            /adm/succession は本番で1テナントが契約中。
--
--   つまり契約中のテナントがこれらの画面を開くとエラーになる状態だった。
--
--   原因: scripts/supabase-migration-repair.sh のコメントにあるとおり、
--         `supabase migration repair --status applied` は「履歴にだけ載せる」
--         操作で SQL を再実行しない。実際に SQL が流れていない DB に対して
--         これを使うと、本件のドリフトがそのまま発生する。
--         今後 repair を使うときは、対象テーブルが実在することを確認してから
--         applied を付けること。
--
--   本マイグレーションは元ファイルの定義をそのまま復元する。列定義・CHECK制約・
--   RLSポリシー・インデックス・トリガーはいずれも元ファイルと同一で、変更点は
--   冪等化のみ（CREATE INDEX IF NOT EXISTS、ポリシーとトリガーは存在チェックで
--   ガード）。既に実在するローカルでは何も起きない（適用時に全て skipping）。
--
--   これは新規作成であってデータ復旧ではない。テーブル自体が無かった期間は
--   書き込みができなかったため、失われた実データは存在しない。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. pulse_survey_periods（元: 20260314000000_add_dashboard_tables.sql）
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pulse_survey_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  survey_period text NOT NULL,
  title text NOT NULL,
  description text,
  deadline_date date NOT NULL,
  link_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, survey_period)
);

COMMENT ON TABLE public.pulse_survey_periods IS '月次パルス調査の期間・期限・トップの重要タスク表示用';
COMMENT ON COLUMN public.pulse_survey_periods.survey_period IS '期間キー（例: 2026-02）';
COMMENT ON COLUMN public.pulse_survey_periods.link_path IS '「今すぐ回答する」のリンク先（例: /survey/answer）';

ALTER TABLE public.pulse_survey_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pulse_survey_periods' AND policyname='pulse_survey_periods_tenant_select') THEN
    CREATE POLICY "pulse_survey_periods_tenant_select"
      ON public.pulse_survey_periods FOR SELECT TO authenticated
      USING (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pulse_survey_periods' AND policyname='pulse_survey_periods_tenant_insert') THEN
    CREATE POLICY "pulse_survey_periods_tenant_insert"
      ON public.pulse_survey_periods FOR INSERT TO authenticated
      WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pulse_survey_periods' AND policyname='pulse_survey_periods_tenant_update') THEN
    CREATE POLICY "pulse_survey_periods_tenant_update"
      ON public.pulse_survey_periods FOR UPDATE TO authenticated
      USING (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pulse_survey_periods' AND policyname='pulse_survey_periods_tenant_delete') THEN
    CREATE POLICY "pulse_survey_periods_tenant_delete"
      ON public.pulse_survey_periods FOR DELETE TO authenticated
      USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'pulse_survey_periods' AND t.tgname = 'set_pulse_survey_periods_updated_at'
  ) THEN
    CREATE TRIGGER set_pulse_survey_periods_updated_at
      BEFORE UPDATE ON public.pulse_survey_periods
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. succession_positions / succession_candidates
--    （元: 20260605200000_add_succession_plan_tables.sql）
--    FK の依存順に作成する: positions -> candidates
-- -----------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_succession_positions_tenant
  ON public.succession_positions(tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_succession_positions_division
  ON public.succession_positions(division_id);
CREATE INDEX IF NOT EXISTS idx_succession_positions_holder
  ON public.succession_positions(current_holder_id);

ALTER TABLE public.succession_positions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_positions' AND policyname='sp_select_same_tenant') THEN
    CREATE POLICY "sp_select_same_tenant" ON public.succession_positions
      FOR SELECT USING (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_positions' AND policyname='sp_insert_same_tenant') THEN
    CREATE POLICY "sp_insert_same_tenant" ON public.succession_positions
      FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_positions' AND policyname='sp_update_same_tenant') THEN
    CREATE POLICY "sp_update_same_tenant" ON public.succession_positions
      FOR UPDATE USING (tenant_id = public.current_tenant_id())
      WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_positions' AND policyname='sp_delete_same_tenant') THEN
    CREATE POLICY "sp_delete_same_tenant" ON public.succession_positions
      FOR DELETE USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_succession_candidates_position
  ON public.succession_candidates(position_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidates_tenant_emp
  ON public.succession_candidates(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_succession_candidates_employee
  ON public.succession_candidates(employee_id);

ALTER TABLE public.succession_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_candidates' AND policyname='sc_select_same_tenant') THEN
    CREATE POLICY "sc_select_same_tenant" ON public.succession_candidates
      FOR SELECT USING (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_candidates' AND policyname='sc_insert_same_tenant') THEN
    CREATE POLICY "sc_insert_same_tenant" ON public.succession_candidates
      FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_candidates' AND policyname='sc_update_same_tenant') THEN
    CREATE POLICY "sc_update_same_tenant" ON public.succession_candidates
      FOR UPDATE USING (tenant_id = public.current_tenant_id())
      WITH CHECK (tenant_id = public.current_tenant_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='succession_candidates' AND policyname='sc_delete_same_tenant') THEN
    CREATE POLICY "sc_delete_same_tenant" ON public.succession_candidates
      FOR DELETE USING (tenant_id = public.current_tenant_id());
  END IF;
END $$;
