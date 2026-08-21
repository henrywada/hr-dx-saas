-- セキュリティレビュー是正: post_system_announcement() は authenticated に無制限 EXECUTE 権限があり、
-- 呼び出し元のロール・投稿先の妥当性を検証しないまま、自テナント内の任意の従業員へ
-- 自由文字列の「システム通知」をなりすまし投稿できてしまう欠陥があった（CRITICAL）。
-- 加えて recipient_employee_id がテナント所属かも検証しておらず、クロステナントの
-- 従業員ID存在確認オラクルになっていた（HIGH）。
-- 汎用RPCを廃止し、実際に必要な3用途（Kudos・コンディションアラート・健診面談推奨）ごとに
-- DB側で正当性を検証し、固定テンプレートから本文を組み立てる専用RPCへ置き換える。
-- 呼び出し元から自由な title/body を受け取らないことで、なりすまし投稿を構造的に防ぐ。

DROP FUNCTION IF EXISTS public.post_system_announcement(UUID, UUID, TEXT, TEXT, TEXT, INT);

-- ---------------------------------------------------------------------------
-- 1) Kudos受信通知
--    自分が送信者として作成した実在の kudos / kudos_recipients 行にのみ紐付けて投稿できる。
--    title/body は呼び出し元の自由入力を受け付けず、kudos テーブルの実データから生成する。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_kudos_announcement(
  p_kudos_id UUID,
  p_recipient_employee_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.current_tenant_id();
  v_sender_employee_id UUID := public.current_employee_id();
  v_sender_name TEXT;
  v_message TEXT;
  v_value_tag TEXT;
  v_id UUID;
BEGIN
  IF v_tenant_id IS NULL OR v_sender_employee_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT k.message, k.value_tag INTO v_message, v_value_tag
  FROM public.kudos k
  WHERE k.id = p_kudos_id
    AND k.tenant_id = v_tenant_id
    AND k.sender_employee_id = v_sender_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kudos not found or not owned by caller';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.kudos_recipients
    WHERE kudos_id = p_kudos_id AND employee_id = p_recipient_employee_id
  ) THEN
    RAISE EXCEPTION 'recipient is not a kudos recipient';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.employees WHERE id = p_recipient_employee_id AND tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'recipient not in tenant';
  END IF;

  SELECT name INTO v_sender_name FROM public.employees WHERE id = v_sender_employee_id;

  INSERT INTO public.announcements (
    tenant_id, title, body, target_audience, recipient_employee_id, is_new, sort_order
  ) VALUES (
    v_tenant_id,
    format('💛 %sさんから感謝・称賛が届きました%s',
      COALESCE(v_sender_name, '同僚'),
      CASE WHEN v_value_tag IS NOT NULL THEN format('（%s）', v_value_tag) ELSE '' END
    ),
    left(v_message, 120) || CASE WHEN length(v_message) > 120 THEN '…' ELSE '' END
      || E'\n\n詳細は「感謝・称賛」画面でご確認ください。',
    'あなた宛',
    p_recipient_employee_id,
    true,
    10
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.post_kudos_announcement IS
  'Kudos受信を announcements へ橋渡しする専用RPC。実在するkudos/kudos_recipients行の検証を必須とし、
   title/bodyの自由入力によるなりすまし投稿を防ぐ。';

GRANT EXECUTE ON FUNCTION public.post_kudos_announcement(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) コンディション低下アラート通知
--    宛先は呼び出し元テナント内の産業医・保健師ロールに限定し、RPC内部で解決する
--    （呼び出し元は宛先ロールを指定できない）。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_condition_alert_announcement(
  p_employee_id UUID,
  p_alert_label TEXT,
  p_dedupe_marker TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.current_tenant_id();
  v_employee_name TEXT;
  v_recipient RECORD;
  v_count INT := 0;
BEGIN
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- 通知対象の従業員が呼び出し元自身のテナントに属することを確認
  SELECT name INTO v_employee_name
  FROM public.employees
  WHERE id = p_employee_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'employee not in tenant';
  END IF;

  FOR v_recipient IN
    SELECT e.id
    FROM public.employees e
    JOIN public.app_role ar ON ar.id = e.app_role_id
    WHERE e.tenant_id = v_tenant_id
      AND e.active_status = 'active'
      AND ar.app_role IN ('company_doctor', 'company_nurse')
  LOOP
    INSERT INTO public.announcements (
      tenant_id, title, body, target_audience, recipient_employee_id, is_new, sort_order
    ) VALUES (
      v_tenant_id,
      format('⚠️ コンディション低下アラート: %s', COALESCE(v_employee_name, '')),
      left(p_alert_label, 200)
        || E'\n\n/adm/condition-trend で詳細を確認してください。\n'
        || left(p_dedupe_marker, 200),
      '産業医・保健師',
      v_recipient.id,
      true,
      20
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.post_condition_alert_announcement IS
  'コンディション低下アラートを産業医・保健師へ通知する専用RPC。宛先ロールはRPC内部で固定解決し、
   呼び出し元が任意の宛先を指定することはできない。';

GRANT EXECUTE ON FUNCTION public.post_condition_alert_announcement(UUID, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) 健診面談推奨通知
--    呼び出し元が company_doctor ロールであり、対象レコードが自テナントに属する場合のみ投稿できる。
--    宛先従業員はレコードから解決し、呼び出し元が任意のUUIDを指定することはできない。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_health_check_interview_announcement(
  p_record_id UUID,
  p_kind TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := public.current_tenant_id();
  v_employee_id UUID;
  v_id UUID;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF v_tenant_id IS NULL OR public.current_employee_app_role() IS DISTINCT FROM 'company_doctor' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_kind NOT IN ('nurse', 'doctor') THEN
    RAISE EXCEPTION 'invalid kind';
  END IF;

  SELECT employee_id INTO v_employee_id
  FROM public.health_check_records
  WHERE id = p_record_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'record not in tenant';
  END IF;

  IF p_kind = 'nurse' THEN
    v_title := '保健師との面談が推奨されています';
    v_body := '定期健康診断の結果を踏まえ、保健師との面談が推奨されています。結果画面から予約できます。';
  ELSE
    v_title := '産業医との面談が推奨されています';
    v_body := '定期健康診断の結果を踏まえ、産業医との面談が推奨されています。結果画面から予約できます。';
  END IF;

  INSERT INTO public.announcements (
    tenant_id, title, body, target_audience, recipient_employee_id, is_new, sort_order
  ) VALUES (
    v_tenant_id, v_title, v_body, '個別', v_employee_id, true, 0
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.post_health_check_interview_announcement IS
  '健診結果を踏まえた面談推奨を本人へ通知する専用RPC。呼び出し元が company_doctor ロールであり、
   対象レコードが自テナントに属することを検証する。宛先従業員はレコードから解決し、
   呼び出し元が任意のUUIDを指定することはできない。';

GRANT EXECUTE ON FUNCTION public.post_health_check_interview_announcement(UUID, TEXT) TO authenticated;
