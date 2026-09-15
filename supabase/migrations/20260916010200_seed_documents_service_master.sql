-- 20260916010200_seed_documents_service_master.sql
--
-- 文書ホルダー（名刺・請求書・発注書・領収書）機能のメニュー表示用マスタ登録。
-- 参照した既存パターン:
--   - 20260915180100_seed_picture_report_service_master.sql
--   - 20260907033241_seed_task_management_service_master.sql
--
-- service_class「便利ツール」、service_category「文書ホルダー」を
-- 名前で解決し、無ければ新規作成する（冪等）。target_audience は
-- 'all_users' とし、一般従業員も文書撮影・閲覧できるようにする。
-- app_role_service は全ロールに許可する。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_service_ids uuid[] := ARRAY[]::uuid[];
  v_service_id uuid;
BEGIN
  -- service_class「便利ツール」を名前で解決（無ければ作成、冪等）
  -- sort_order ASC で一般ユーザー向け（sort_order=80）を決定的に選ぶ
  SELECT id INTO v_class_id FROM public.service_class WHERE name = '便利ツール' ORDER BY sort_order ASC LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, sort_order, name)
    VALUES (gen_random_uuid(), 80, '便利ツール')
    RETURNING id INTO v_class_id;
  END IF;

  -- service_category「文書ホルダー」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_category_id FROM public.service_category WHERE name = '文書ホルダー' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 840, '文書ホルダー')
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

  -- service「名刺を撮る」（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=business_card') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '名刺を撮る', '', '名刺を撮る',
      '名刺を撮影してOCR解析し、連絡先情報を保存できます。',
      100, '/tool/documents/new?type=business_card', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=business_card';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「名刺ホルダー」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents?type=business_card') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '名刺ホルダー', '', '名刺ホルダー',
      '保存した名刺の一覧を確認・検索できます。',
      110, '/tool/documents?type=business_card', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents?type=business_card';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「請求書を撮る」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=invoice') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '請求書を撮る', '', '請求書を撮る',
      '請求書を撮影してOCR解析し、内容を保存できます。',
      120, '/tool/documents/new?type=invoice', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=invoice';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「請求書ホルダー」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents?type=invoice') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '請求書ホルダー', '', '請求書ホルダー',
      '保存した請求書の一覧を確認・検索できます。',
      130, '/tool/documents?type=invoice', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents?type=invoice';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「発注書を撮る」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=purchase_order') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '発注書を撮る', '', '発注書を撮る',
      '発注書を撮影してOCR解析し、内容を保存できます。',
      140, '/tool/documents/new?type=purchase_order', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=purchase_order';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「発注書ホルダー」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents?type=purchase_order') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '発注書ホルダー', '', '発注書ホルダー',
      '保存した発注書の一覧を確認・検索できます。',
      150, '/tool/documents?type=purchase_order', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents?type=purchase_order';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「領収書を撮る」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=receipt') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '領収書を撮る', '', '領収書を撮る',
      '領収書を撮影してOCR解析し、内容を保存できます。',
      160, '/tool/documents/new?type=receipt', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents/new?type=receipt';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- service「領収書ホルダー」
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tool/documents?type=receipt') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, '領収書ホルダー', '', '領収書ホルダー',
      '保存した領収書の一覧を確認・検索できます。',
      170, '/tool/documents?type=receipt', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tool/documents?type=receipt';
  END IF;
  v_service_ids := array_append(v_service_ids, v_service_id);

  -- app_role_service：全ロールに対して許可する（employee を含む）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, s.id
  FROM public.app_role ar
  CROSS JOIN unnest(v_service_ids) AS s(id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
  );

  -- tenant_service：既存の全契約テナントに対して機能を有効化する
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, s.id
  FROM public.tenants t
  CROSS JOIN unnest(v_service_ids) AS s(id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = s.id
  );
END $$;
