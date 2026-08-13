-- 就業判定に「保留」(hold) を追加。未判定(pending) と区別する
ALTER TABLE public.health_check_records
  DROP CONSTRAINT IF EXISTS health_check_records_employment_judgment_check;

ALTER TABLE public.health_check_records
  ADD CONSTRAINT health_check_records_employment_judgment_check
  CHECK (employment_judgment IN ('fit', 'restricted', 'leave', 'pending', 'hold'));

COMMENT ON COLUMN public.health_check_records.employment_judgment IS
  '安衛法66条の4の就業判定。pending=未判定, hold=保留, fit=通常勤務, restricted=就業制限, leave=要休業。取込時は必ず pending';
