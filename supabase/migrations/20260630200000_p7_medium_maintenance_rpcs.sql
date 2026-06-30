-- P7 MEDIUM: 部署削除・求人バリアント適用のトランザクション化

CREATE OR REPLACE FUNCTION public.delete_division_safe(
  p_division_id uuid,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.divisions d
    WHERE d.id = p_division_id AND d.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'division_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.divisions d
    WHERE d.parent_id = p_division_id AND d.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'child_divisions_exist';
  END IF;

  UPDATE public.employees
  SET division_id = NULL
  WHERE division_id = p_division_id
    AND tenant_id = p_tenant_id;

  DELETE FROM public.divisions
  WHERE id = p_division_id
    AND tenant_id = p_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_division_safe(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_job_posting_variant(
  p_variant_id uuid,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant public.job_posting_ai_variants%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_variant
  FROM public.job_posting_ai_variants
  WHERE id = p_variant_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'variant_not_found';
  END IF;

  UPDATE public.job_posting_ai_variants
  SET is_applied = true,
      applied_at = NOW()
  WHERE id = p_variant_id
    AND tenant_id = p_tenant_id;

  IF v_variant.job_posting_id IS NOT NULL THEN
    UPDATE public.job_postings
    SET title = v_variant.title,
        description = v_variant.description
    WHERE id = v_variant.job_posting_id
      AND tenant_id = p_tenant_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_job_posting_variant(uuid, uuid) TO authenticated;
