-- スキルレベルセット: 職種ごとに複数の「レベルラダー」（例: 初級/中級/上級 と 検定1/検定2）を持てるようにする。
-- global_skill_levels はセットに属し、global_skill_items は skill_level_set を参照する。

CREATE TABLE public.global_skill_level_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role_id UUID NOT NULL REFERENCES public.global_job_roles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT global_skill_level_sets_role_name_key UNIQUE (job_role_id, name)
);

CREATE INDEX global_skill_level_sets_job_role_id_idx ON public.global_skill_level_sets (job_role_id);

COMMENT ON TABLE public.global_skill_level_sets IS '職種に紐づくスキルレベルのセット（評価軸）。セット内に複数の global_skill_levels を持つ。';

-- 既存データ用: レベルまたは項目がある職種ごとに既定セット「標準」を1件
INSERT INTO public.global_skill_level_sets (job_role_id, name, sort_order)
SELECT DISTINCT r.id, '標準', 0
FROM public.global_job_roles r
WHERE EXISTS (
    SELECT 1 FROM public.global_skill_levels l WHERE l.job_role_id = r.id
  )
   OR EXISTS (
    SELECT 1 FROM public.global_skill_items i WHERE i.job_role_id = r.id
  )
ON CONFLICT (job_role_id, name) DO NOTHING;

-- global_skill_levels にセット FK を追加して埋める
ALTER TABLE public.global_skill_levels
  ADD COLUMN skill_level_set_id UUID REFERENCES public.global_skill_level_sets(id) ON DELETE CASCADE;

UPDATE public.global_skill_levels gsl
SET skill_level_set_id = s.id
FROM public.global_skill_level_sets s
WHERE s.job_role_id = gsl.job_role_id
  AND s.name = '標準';

-- 職種にセットが無いのにレベルだけある場合は念のためセットを足す（通常は上でカバー）
INSERT INTO public.global_skill_level_sets (job_role_id, name, sort_order)
SELECT DISTINCT gsl.job_role_id, '標準', 0
FROM public.global_skill_levels gsl
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_skill_level_sets g WHERE g.job_role_id = gsl.job_role_id
)
ON CONFLICT (job_role_id, name) DO NOTHING;

UPDATE public.global_skill_levels gsl
SET skill_level_set_id = s.id
FROM public.global_skill_level_sets s
WHERE gsl.skill_level_set_id IS NULL
  AND s.job_role_id = gsl.job_role_id
  AND s.name = '標準';

ALTER TABLE public.global_skill_levels
  ALTER COLUMN skill_level_set_id SET NOT NULL;

-- 旧ユニーク・職種直結カラムを廃止（レベル名はセット単位で一意）
ALTER TABLE public.global_skill_levels DROP CONSTRAINT IF EXISTS global_skill_levels_role_name_key;
ALTER TABLE public.global_skill_levels DROP COLUMN job_role_id;

ALTER TABLE public.global_skill_levels
  ADD CONSTRAINT global_skill_levels_set_name_key UNIQUE (skill_level_set_id, name);

CREATE INDEX global_skill_levels_skill_level_set_id_idx ON public.global_skill_levels (skill_level_set_id);

-- スキル項目: skill_level_id を skill_level_set_id に移行
ALTER TABLE public.global_skill_items
  ADD COLUMN skill_level_set_id UUID REFERENCES public.global_skill_level_sets(id) ON DELETE RESTRICT;

UPDATE public.global_skill_items gsi
SET skill_level_set_id = gsl.skill_level_set_id
FROM public.global_skill_levels gsl
WHERE gsi.skill_level_id IS NOT NULL
  AND gsi.skill_level_id = gsl.id;

-- skill_level_id が NULL の項目は職種の既定セットへ
UPDATE public.global_skill_items gsi
SET skill_level_set_id = s.id
FROM public.global_skill_level_sets s
WHERE gsi.skill_level_set_id IS NULL
  AND s.job_role_id = gsi.job_role_id
  AND s.name = '標準';

INSERT INTO public.global_skill_level_sets (job_role_id, name, sort_order)
SELECT DISTINCT gsi.job_role_id, '標準', 0
FROM public.global_skill_items gsi
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_skill_level_sets g WHERE g.job_role_id = gsi.job_role_id
)
ON CONFLICT (job_role_id, name) DO NOTHING;

UPDATE public.global_skill_items gsi
SET skill_level_set_id = s.id
FROM public.global_skill_level_sets s
WHERE gsi.skill_level_set_id IS NULL
  AND s.job_role_id = gsi.job_role_id
  AND s.name = '標準';

ALTER TABLE public.global_skill_items
  ALTER COLUMN skill_level_set_id SET NOT NULL;

DROP TRIGGER IF EXISTS global_skill_items_skill_level_same_role_trg ON public.global_skill_items;
DROP FUNCTION IF EXISTS public.global_skill_items_skill_level_same_role();

ALTER TABLE public.global_skill_items DROP COLUMN IF EXISTS skill_level_id;

CREATE OR REPLACE FUNCTION public.global_skill_items_skill_level_set_same_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.global_skill_level_sets gss
    WHERE gss.id = NEW.skill_level_set_id
      AND gss.job_role_id = NEW.job_role_id
  ) THEN
    RAISE EXCEPTION 'skill_level_set_id must reference global_skill_level_sets of the same job_role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER global_skill_items_skill_level_set_same_role_trg
  BEFORE INSERT OR UPDATE OF skill_level_set_id, job_role_id ON public.global_skill_items
  FOR EACH ROW
  EXECUTE FUNCTION public.global_skill_items_skill_level_set_same_role();

CREATE INDEX global_skill_items_skill_level_set_id_idx ON public.global_skill_items (skill_level_set_id);

COMMENT ON COLUMN public.global_skill_items.skill_level_set_id IS 'このスキル項目が使用するスキルレベルセット（同一職種のセットのみ）。';
