-- 単位変換・閾値を健診機関別に紐づける（他機関→標準の変換式）
-- 既存行はテナント内の非標準機関が1件だけならそれに付け替える。付け替えできない行は削除する。

ALTER TABLE public.health_check_unit_conversions
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.health_check_institutions(id) ON DELETE CASCADE;

ALTER TABLE public.health_check_item_thresholds
  ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.health_check_institutions(id) ON DELETE CASCADE;

UPDATE public.health_check_unit_conversions u
SET institution_id = s.id
FROM (
  SELECT tenant_id, MIN(id::text)::uuid AS id
  FROM public.health_check_institutions
  WHERE is_standard IS FALSE
  GROUP BY tenant_id
  HAVING COUNT(*) = 1
) s
WHERE u.institution_id IS NULL
  AND u.tenant_id = s.tenant_id;

UPDATE public.health_check_item_thresholds t
SET institution_id = s.id
FROM (
  SELECT tenant_id, MIN(id::text)::uuid AS id
  FROM public.health_check_institutions
  WHERE is_standard IS FALSE
  GROUP BY tenant_id
  HAVING COUNT(*) = 1
) s
WHERE t.institution_id IS NULL
  AND t.tenant_id = s.tenant_id;

DELETE FROM public.health_check_unit_conversions WHERE institution_id IS NULL;
DELETE FROM public.health_check_item_thresholds WHERE institution_id IS NULL;

ALTER TABLE public.health_check_unit_conversions
  ALTER COLUMN institution_id SET NOT NULL;

ALTER TABLE public.health_check_item_thresholds
  ALTER COLUMN institution_id SET NOT NULL;

ALTER TABLE public.health_check_unit_conversions
  DROP CONSTRAINT IF EXISTS health_check_unit_conversions_unique;

ALTER TABLE public.health_check_unit_conversions
  ADD CONSTRAINT health_check_unit_conversions_unique
  UNIQUE (institution_id, item_id, from_unit, to_unit);

CREATE INDEX IF NOT EXISTS idx_health_check_unit_conversions_institution
  ON public.health_check_unit_conversions (institution_id);

CREATE INDEX IF NOT EXISTS idx_health_check_item_thresholds_institution
  ON public.health_check_item_thresholds (institution_id);

COMMENT ON TABLE public.health_check_unit_conversions IS
  '他機関（institution_id）の単位 → そのテナントの標準機関単位';
COMMENT ON COLUMN public.health_check_unit_conversions.institution_id IS
  '変換元の健診機関。標準機関には作らない';
COMMENT ON TABLE public.health_check_item_thresholds IS
  '他機関（institution_id）の数値を標準判定へ再判定するカットオフ';
COMMENT ON COLUMN public.health_check_item_thresholds.institution_id IS
  '変換元の健診機関。標準機関には作らない';
