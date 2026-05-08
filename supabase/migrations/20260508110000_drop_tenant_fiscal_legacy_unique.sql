-- 新方式（division ベース実施グループ）では同一年度に複数グループを作成可能とするため
-- テナント×年度の一意制約（拠点未設定の旧仕様）を廃止する
-- 拠点に紐づく期間の制約（stress_check_periods_unique_establishment_fiscal）は引き続き有効
DROP INDEX IF EXISTS public.stress_check_periods_unique_tenant_fiscal_legacy;
