-- 廃止テーブル削除（global_skill_level_sets / global_skill_levels のデータは保持）

DROP TRIGGER IF EXISTS global_skill_items_skill_level_set_same_role_trg ON public.global_skill_items;
DROP FUNCTION IF EXISTS public.global_skill_items_skill_level_set_same_role();
DROP FUNCTION IF EXISTS public.global_skill_items_skill_level_same_role();

DROP TABLE IF EXISTS public.global_skill_items;
DROP TABLE IF EXISTS public.global_job_roles;
DROP TABLE IF EXISTS public.global_job_categories;
