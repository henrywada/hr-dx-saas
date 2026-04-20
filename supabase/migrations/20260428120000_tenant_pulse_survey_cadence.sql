-- パルスサーベイの実施間隔（月1回 / 週1回）
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS pulse_survey_cadence text NOT NULL DEFAULT 'monthly'
  CHECK (pulse_survey_cadence IN ('monthly', 'weekly'));

COMMENT ON COLUMN public.tenants.pulse_survey_cadence IS
  'パルスサーベイの実施間隔: monthly=月1回（期間キー YYYY-MM）, weekly=週1回（ISO週・期間キー YYYY-Www）';
