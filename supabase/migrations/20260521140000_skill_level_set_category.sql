-- スキルレベルセットに区分を追加（UI の「スキル名」登録時に設定し、関連する skill_items / requirements へ同期）
ALTER TABLE public.global_skill_level_sets
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);

ALTER TABLE public.tenant_skill_level_sets
  ADD COLUMN IF NOT EXISTS category VARCHAR(50);

COMMENT ON COLUMN public.global_skill_level_sets.category IS '区分（スキル/能力/資格/研修/その他）';
COMMENT ON COLUMN public.tenant_skill_level_sets.category IS '区分（スキル/能力/資格/研修/その他）';
