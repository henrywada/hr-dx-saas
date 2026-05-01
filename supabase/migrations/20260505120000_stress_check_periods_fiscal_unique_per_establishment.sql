-- 拠点別の実施期間を許容するため、(tenant_id, fiscal_year) の一意制約を廃止する
-- 旧：テナント全体で年度1件のみ → 新：拠点ごとに同一年度1件、拠点NULL（旧データ）はテナント×年度1件のまま

ALTER TABLE public.stress_check_periods
  DROP CONSTRAINT IF EXISTS unique_tenant_fiscal;

-- 拠点未設定（従来のテナント単位期間）はテナント×年度で1件まで
CREATE UNIQUE INDEX IF NOT EXISTS stress_check_periods_unique_tenant_fiscal_legacy
  ON public.stress_check_periods (tenant_id, fiscal_year)
  WHERE division_establishment_id IS NULL;

-- 拠点に紐づく期間は、同一拠点×同一年度は1件まで（別拠点なら同じ年度で併存可能）
CREATE UNIQUE INDEX IF NOT EXISTS stress_check_periods_unique_establishment_fiscal
  ON public.stress_check_periods (tenant_id, division_establishment_id, fiscal_year)
  WHERE division_establishment_id IS NOT NULL;

COMMENT ON INDEX public.stress_check_periods_unique_tenant_fiscal_legacy IS '拠点未設定の期間はテナント×年度で一意（旧仕様）';
COMMENT ON INDEX public.stress_check_periods_unique_establishment_fiscal IS '拠点ごとの実施期間はテナント×拠点×年度で一意';
