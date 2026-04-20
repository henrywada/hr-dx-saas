-- パルス実施間隔は tenant_portal_settings に保持（tenants 直更新より RLS/スキーマの齟齬を避ける）
ALTER TABLE public.tenant_portal_settings
  ADD COLUMN IF NOT EXISTS pulse_survey_cadence text NOT NULL DEFAULT 'monthly'
  CHECK (pulse_survey_cadence IN ('monthly', 'weekly'));

COMMENT ON COLUMN public.tenant_portal_settings.pulse_survey_cadence IS
  'パルスサーベイ実施間隔: monthly=月1回, weekly=週1回（Echo 本番指定・パルス期間管理で共有）';

-- tenants.pulse_survey_cadence がある環境では既存値を portal 側へ引き継ぐ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'pulse_survey_cadence'
  ) THEN
    INSERT INTO public.tenant_portal_settings (tenant_id, pulse_survey_cadence)
    SELECT t.id, t.pulse_survey_cadence
    FROM public.tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenant_portal_settings p WHERE p.tenant_id = t.id
    );

    UPDATE public.tenant_portal_settings p
    SET pulse_survey_cadence = t.pulse_survey_cadence
    FROM public.tenants t
    WHERE p.tenant_id = t.id
      AND p.pulse_survey_cadence IS DISTINCT FROM t.pulse_survey_cadence;
  END IF;
END $$;
