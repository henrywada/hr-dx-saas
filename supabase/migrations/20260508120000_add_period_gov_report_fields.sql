-- 官庁報告（様式第6号相当）に必要な事業場情報を stress_check_periods に追加
ALTER TABLE public.stress_check_periods
  ADD COLUMN IF NOT EXISTS workplace_name    text,
  ADD COLUMN IF NOT EXISTS workplace_address text,
  ADD COLUMN IF NOT EXISTS labor_office_name text;

COMMENT ON COLUMN public.stress_check_periods.workplace_name    IS '事業場名（官庁報告用）';
COMMENT ON COLUMN public.stress_check_periods.workplace_address IS '事業場所在地（官庁報告用）';
COMMENT ON COLUMN public.stress_check_periods.labor_office_name IS '管轄労働基準監督署名（官庁報告用）';
