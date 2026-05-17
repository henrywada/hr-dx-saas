-- スキル項目が参照するスキルレベル（同一職種 global_job_roles に属するレベルのみ）
ALTER TABLE public.global_skill_items
  ADD COLUMN skill_level_id UUID REFERENCES public.global_skill_levels(id) ON DELETE RESTRICT;

COMMENT ON COLUMN public.global_skill_items.skill_level_id IS 'スキル項目が属するスキルレベル（global_skill_levels）。同一 job_role_id のレベルのみ可。';

CREATE INDEX global_skill_items_skill_level_id_idx ON public.global_skill_items (skill_level_id);

CREATE OR REPLACE FUNCTION public.global_skill_items_skill_level_same_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.skill_level_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.global_skill_levels gsl
      WHERE gsl.id = NEW.skill_level_id
        AND gsl.job_role_id = NEW.job_role_id
    ) THEN
      RAISE EXCEPTION 'skill_level_id must reference global_skill_levels of the same job_role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS global_skill_items_skill_level_same_role_trg ON public.global_skill_items;

CREATE TRIGGER global_skill_items_skill_level_same_role_trg
  BEFORE INSERT OR UPDATE OF skill_level_id, job_role_id ON public.global_skill_items
  FOR EACH ROW
  EXECUTE FUNCTION public.global_skill_items_skill_level_same_role();
