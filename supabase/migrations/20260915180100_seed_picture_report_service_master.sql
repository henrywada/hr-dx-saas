-- 20260915180100_seed_picture_report_service_master.sql
--
-- 画像送信（写真レポート）機能のメニュー表示用マスタ登録。
-- 参照した既存パターン: 20260907033241_seed_task_management_service_master.sql
--
-- service_class「勤退・タスク管理」、service_category「勤退｜打刻」を
-- 名前で解決し、無ければ新規作成する（冪等）。target_audience は
-- 'all_users' とし、一般従業員も画像送信できるようにする
-- （マネージャー限定の操作は app_role ではなく employees.is_manager で
-- 画面内分岐するため、app_role_service は全ロールに許可する）。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_send_service_id uuid;
  v_album_service_id uuid;
BEGIN
  -- service_class「勤退・タスク管理」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_class_id FROM public.service_class WHERE name = '勤退・タスク管理' ORDER BY sort_order ASC LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, sort_order, name)
    VALUES (gen_random_uuid(), 90, '勤退・タスク管理')
    RETURNING id INTO v_class_id;
  END IF;

  -- service_category「勤退｜打刻」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_category_id FROM public.service_category WHERE name = '勤退｜打刻' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 830, '勤退｜打刻')
    RETURNING id INTO v_category_id;
  END IF;

  -- service_class_index への紐付け（無ければ作成、冪等）
  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_category_id
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_category_id);
  END IF;

  -- service「画像送信」（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/picture-report') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '画像送信', '', '画像送信',
      '現場で撮影した写真に件名・本文・優先度を添えて報告できます。',
      100, '/tool/picture-report', 'all_users', '公開'
    )
    RETURNING id INTO v_send_service_id;
  ELSE
    SELECT id INTO v_send_service_id FROM public.service WHERE trim(route_path) = '/tool/picture-report';
  END IF;

  -- service「写真レポートホルダー」（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/picture-report/album') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '写真レポートホルダー', '', '写真レポートホルダー',
      '送信した写真の履歴を一覧で確認できます。マネージャーは部下の投稿も閲覧できます。',
      110, '/tool/picture-report/album', 'all_users', '公開'
    )
    RETURNING id INTO v_album_service_id;
  ELSE
    SELECT id INTO v_album_service_id FROM public.service WHERE trim(route_path) = '/tool/picture-report/album';
  END IF;

  -- app_role_service：全ロールに対して許可する（employee を含む）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, s.id
  FROM public.app_role ar
  CROSS JOIN (SELECT v_send_service_id AS id UNION ALL SELECT v_album_service_id) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
  );

  -- tenant_service：既存の全契約テナントに対して機能を有効化する
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, s.id
  FROM public.tenants t
  CROSS JOIN (SELECT v_send_service_id AS id UNION ALL SELECT v_album_service_id) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = s.id
  );
END $$;
