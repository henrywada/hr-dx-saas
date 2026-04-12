-- RLS 内で auth.jwt() の user_metadata が取れず tenant が NULL になるケースへの対策
-- auth.users の raw_user_meta_data / raw_app_meta_data を参照する（SECURITY DEFINER）

CREATE OR REPLACE FUNCTION public.rag_session_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  v_employee uuid;
  t text;
BEGIN
  SELECT public.current_tenant_id() INTO v_employee;
  IF v_employee IS NOT NULL THEN
    RETURN v_employee;
  END IF;

  SELECT trim(
    COALESCE(
      raw_user_meta_data->>'tenant_id',
      raw_app_meta_data->>'tenant_id'
    )
  )
  INTO t
  FROM auth.users
  WHERE id = auth.uid();

  IF t IS NULL OR t = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN t::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;
END;
$$;

COMMENT ON FUNCTION public.rag_session_tenant_id() IS
  'RAG 用: employees 由来のテナント、なければ auth.users の tenant_id メタデータ';

REVOKE ALL ON FUNCTION public.rag_session_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rag_session_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rag_session_tenant_id() TO service_role;
