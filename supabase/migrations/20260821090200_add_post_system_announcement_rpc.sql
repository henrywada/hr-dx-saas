-- ドメイン機能（Kudos・コンディションアラート・健診面談推奨等）が実行者のロールに関わらず
-- 個人宛のシステム通知を announcements に投稿できるようにする SECURITY DEFINER RPC。
-- announcements の INSERT RLS が hr/hr_manager/developer のみに制限されたため、
-- 一般従業員のセッションから実行されるこれらの自動投稿はこの RPC を経由する。

CREATE OR REPLACE FUNCTION public.post_system_announcement(
  p_tenant_id UUID,
  p_recipient_employee_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_target_audience TEXT DEFAULT NULL,
  p_sort_order INT DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 呼び出し元が対象テナントに所属する認証済みユーザーであることを確認（RLSバイパスの濫用防止）
  IF p_tenant_id IS DISTINCT FROM public.current_tenant_id() THEN
    RAISE EXCEPTION 'tenant mismatch';
  END IF;

  -- 個人宛システム通知専用。全社ブロードキャストへの濫用を防ぐため recipient を必須にする
  IF p_recipient_employee_id IS NULL THEN
    RAISE EXCEPTION 'recipient_employee_id is required';
  END IF;

  INSERT INTO public.announcements (
    tenant_id, title, body, target_audience, recipient_employee_id, is_new, sort_order
  ) VALUES (
    p_tenant_id, p_title, p_body, p_target_audience, p_recipient_employee_id, true, p_sort_order
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.post_system_announcement IS
  'ドメイン機能からの個人宛システム通知専用の投稿関数。announcements の通常RLSをバイパスするため、
   呼び出し元テナントの検証と recipient 必須化で濫用を防ぐ。全社ブロードキャストには使用しないこと。';

GRANT EXECUTE ON FUNCTION public.post_system_announcement(UUID, UUID, TEXT, TEXT, TEXT, INT) TO authenticated;
