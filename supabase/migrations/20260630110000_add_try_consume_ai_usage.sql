-- AI 利用回数の原子的消費（TOCTOU 対策）
CREATE OR REPLACE FUNCTION public.try_consume_ai_usage(
  p_tenant_id uuid,
  p_feature_name text,
  p_max_count integer DEFAULT 10
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_month_start timestamptz;
BEGIN
  IF p_max_count IS NULL OR p_max_count < 0 THEN
    INSERT INTO ai_usage_logs (tenant_id, feature_name)
    VALUES (p_tenant_id, p_feature_name);
    RETURN true;
  END IF;

  v_month_start := date_trunc('month', now() AT TIME ZONE 'Asia/Tokyo') AT TIME ZONE 'Asia/Tokyo';

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text || ':' || p_feature_name));

  SELECT COUNT(*)::integer INTO v_count
  FROM ai_usage_logs
  WHERE tenant_id = p_tenant_id
    AND feature_name = p_feature_name
    AND created_at >= v_month_start;

  IF v_count >= p_max_count THEN
    RETURN false;
  END IF;

  INSERT INTO ai_usage_logs (tenant_id, feature_name)
  VALUES (p_tenant_id, p_feature_name);

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_consume_ai_usage(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_consume_ai_usage(uuid, text, integer) TO service_role;
