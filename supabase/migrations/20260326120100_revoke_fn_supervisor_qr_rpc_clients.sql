-- fn_supervisor_qr_permission_apply を service_role のみ実行可能にする（anon/authenticated から剥奪）

REVOKE ALL ON FUNCTION public.fn_supervisor_qr_permission_apply(
  uuid, uuid, uuid, boolean, text, uuid, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_supervisor_qr_permission_apply(
  uuid, uuid, uuid, boolean, text, uuid, text
) FROM anon;

REVOKE ALL ON FUNCTION public.fn_supervisor_qr_permission_apply(
  uuid, uuid, uuid, boolean, text, uuid, text
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_supervisor_qr_permission_apply(
  uuid, uuid, uuid, boolean, text, uuid, text
) TO service_role;
