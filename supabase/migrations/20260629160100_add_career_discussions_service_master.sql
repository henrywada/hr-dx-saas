-- キャリア面談のメニュー表示用マスタ登録
-- service_class / service_category のIDは環境（ローカル/本番）間で一致しないことが判明した
-- （本番には「評価・成長」service_classは存在するが「キャリア面談」相当のservice_categoryは存在しない）。
-- そのため固定UUIDを直接指定せず、名前で解決し、無ければ作成する完全に環境非依存な実装にする。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
BEGIN
  -- service_class「評価・成長」を名前で解決（無ければ作成）
  SELECT id INTO v_class_id FROM public.service_class WHERE name = '評価・成長' LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, name, sort_order)
    VALUES (gen_random_uuid(), '評価・成長', 40)
    RETURNING id INTO v_class_id;
  END IF;

  -- service_category「キャリア面談」を名前で解決（無ければ作成）
  SELECT id INTO v_category_id FROM public.service_category WHERE name = 'キャリア面談' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 450, 'キャリア面談')
    RETURNING id INTO v_category_id;
  END IF;

  -- service_class_index への紐付け（無ければ作成）
  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_category_id
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_category_id);
  END IF;

  -- service行（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/career-discussions') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, 'キャリア面談', '', 'キャリア面談',
      '自分のキャリア面談履歴の確認、（上長の場合）部下とのキャリア面談の記録ができます。',
      1, '/career-discussions', 'all_users', '公開'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/career-discussions') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, 'キャリア面談管理', '', 'キャリア面談管理',
      '全社のキャリア面談記録の確認・登録ができます。',
      1, '/adm/career-discussions', 'adm', '公開'
    );
  END IF;
END $$;
