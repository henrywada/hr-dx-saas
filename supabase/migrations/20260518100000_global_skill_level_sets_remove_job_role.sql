-- スキルレベルセットを職種から切り離し、テンプレート全体で共有するマスタとする（セット名は全体で一意）。

-- 既存データで同名セットが複数ある場合は、最も古い1件以外に UUID 由来のサフィックスを付けて衝突を解消する
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at, id) AS rn
  FROM public.global_skill_level_sets
)
UPDATE public.global_skill_level_sets g
SET name = g.name || ' （' || SUBSTRING(g.id::text FROM 1 FOR 8) || '）'
FROM ranked r
WHERE g.id = r.id
  AND r.rn > 1;

-- スキル項目が参照するセットは職種と一致する必要がなくなる
DROP TRIGGER IF EXISTS global_skill_items_skill_level_set_same_role_trg ON public.global_skill_items;
DROP FUNCTION IF EXISTS public.global_skill_items_skill_level_set_same_role();

ALTER TABLE public.global_skill_level_sets DROP CONSTRAINT global_skill_level_sets_role_name_key;
ALTER TABLE public.global_skill_level_sets DROP CONSTRAINT global_skill_level_sets_job_role_id_fkey;

DROP INDEX IF EXISTS public.global_skill_level_sets_job_role_id_idx;

ALTER TABLE public.global_skill_level_sets DROP COLUMN job_role_id;

ALTER TABLE public.global_skill_level_sets
  ADD CONSTRAINT global_skill_level_sets_name_key UNIQUE (name);

COMMENT ON TABLE public.global_skill_level_sets IS 'スキルレベルのセット（評価軸）。職種に依存せず SaaS テンプレート全体で共有する。セット内に複数の global_skill_levels を持つ。';

COMMENT ON COLUMN public.global_skill_items.skill_level_set_id IS 'このスキル項目が使用するスキルレベルセット。';
