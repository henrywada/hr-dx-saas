-- tenants に契約終了日時を追加（NULL = 未設定または期限なしの運用可）
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS contract_end_at timestamptz NULL;

COMMENT ON COLUMN public.tenants.contract_end_at IS '契約終了日時。この時刻を過ぎたテナントを契約期限切れとして扱う想定。NULL の場合は期限未設定。';
