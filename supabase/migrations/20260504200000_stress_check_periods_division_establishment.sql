-- ストレスチェック実施期間を拠点（division_establishments）に紐づけ可能にする
-- NULL は後方互換（従来のテナント単位のみのデータ）

ALTER TABLE public.stress_check_periods
  ADD COLUMN IF NOT EXISTS division_establishment_id uuid REFERENCES public.division_establishments(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.stress_check_periods.division_establishment_id IS '拠点マスタに紐づく実施期間。NULL はテナント全体（旧仕様）';

CREATE INDEX IF NOT EXISTS idx_sc_periods_establishment
  ON public.stress_check_periods(tenant_id, division_establishment_id);

-- 同一拠点で「実施中」は1期間まで（NULL 拠点の複数 active は従来データのため制約なし）
CREATE UNIQUE INDEX IF NOT EXISTS stress_check_periods_one_active_per_establishment
  ON public.stress_check_periods (tenant_id, division_establishment_id)
  WHERE status = 'active' AND division_establishment_id IS NOT NULL;
