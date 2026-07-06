-- エグゼクティブサマリー関連マスタの冪等補完（既存本番DB向け）
-- 20260703090000 適用済み環境向けに、service_class / service_category /
-- 前提3機能 / app_role_service / tenant_service を「無ければ追加」のみ実行する。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_service_id uuid;
BEGIN
  -- 既存 service からカテゴリを解決（hr-kpi / turnover-risk / engagement / executive-summary のいずれか）
  SELECT service_category_id INTO v_category_id
  FROM public.service
  WHERE trim(route_path) IN (
    '/adm/hr-kpi',
    '/adm/turnover-risk',
    '/adm/engagement',
    '/adm/executive-summary'
  )
  ORDER BY CASE trim(route_path)
    WHEN '/adm/hr-kpi' THEN 0
    WHEN '/adm/turnover-risk' THEN 1
    WHEN '/adm/engagement' THEN 2
    ELSE 3
  END
  LIMIT 1;

  -- service_class「サーベイ・分析」を名前で解決（無ければ作成）
  SELECT id INTO v_class_id FROM public.service_class WHERE name = 'サーベイ・分析' LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, name, sort_order)
    VALUES (gen_random_uuid(), 'サーベイ・分析', 35)
    RETURNING id INTO v_class_id;
  END IF;

  -- service_category「AI・分析」を名前で解決（無ければ作成）
  IF v_category_id IS NULL THEN
    SELECT id INTO v_category_id FROM public.service_category WHERE name = 'AI・分析' LIMIT 1;
  END IF;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name, description, release_status)
    VALUES (gen_random_uuid(), 350, 'AI・分析', '', 'released')
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

  -- 前提3機能（未登録の場合のみ補完）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/hr-kpi') THEN
    INSERT INTO public.service (
      service_category_id, name, category, title, description, sort_order,
      route_path, target_audience, release_status
    ) VALUES (
      v_category_id,
      '横断KPIダッシュボード',
      '',
      '横断KPIダッシュボード',
      '採用・定着・生産性・エンゲージメント・育成の横断KPIを確認できます。',
      20,
      '/adm/hr-kpi',
      'adm',
      '公開'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/turnover-risk') THEN
    INSERT INTO public.service (
      service_category_id, name, category, title, description, sort_order,
      route_path, target_audience, release_status
    ) VALUES (
      v_category_id,
      '離職リスクダッシュボード',
      '',
      '離職リスクダッシュボード',
      '離職リスクスコアの可視化とアラート通知を行います。',
      30,
      '/adm/turnover-risk',
      'adm',
      '公開'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/engagement') THEN
    INSERT INTO public.service (
      service_category_id, name, category, title, description, sort_order,
      route_path, target_audience, release_status
    ) VALUES (
      v_category_id,
      '統合エンゲージメントダッシュボード',
      '',
      '統合エンゲージメントダッシュボード',
      '部署別エンゲージメントスコアとアラートを確認できます。',
      40,
      '/adm/engagement',
      'adm',
      '公開'
    );
  END IF;

  -- エグゼクティブサマリー本体（未登録の場合のみ追加）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/executive-summary') THEN
    INSERT INTO public.service (
      service_category_id, name, category, title, description, sort_order,
      route_path, target_audience, release_status
    ) VALUES (
      v_category_id,
      '経営者向け統合エグゼクティブサマリー',
      '',
      '経営者向け統合エグゼクティブサマリー',
      '離職リスク・エンゲージメントアラート・1on1未実施の3シグナルと横断KPIの要点を1画面で確認できます。',
      10,
      '/adm/executive-summary',
      'adm',
      '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/adm/executive-summary';
  END IF;

  -- 前提3機能 + executive-summary を人事ロール向けに付与（未付与分のみ）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, s.id
  FROM public.app_role ar
  CROSS JOIN public.service s
  WHERE ar.app_role IN ('hr', 'hr_manager', 'developer', 'test')
    AND trim(s.route_path) IN (
      '/adm/hr-kpi',
      '/adm/turnover-risk',
      '/adm/engagement',
      '/adm/executive-summary'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.app_role_service ars
      WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
    );

  -- 前提3機能を全テナントに付与（未付与分のみ）
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, s.id
  FROM public.tenants t
  CROSS JOIN public.service s
  WHERE trim(s.route_path) IN ('/adm/hr-kpi', '/adm/turnover-risk', '/adm/engagement')
    AND NOT EXISTS (
      SELECT 1 FROM public.tenant_service ts
      WHERE ts.tenant_id = t.id AND ts.service_id = s.id
    );

  -- executive-summary は前提3機能をすべて契約済みのテナントにのみ提供（未付与分のみ）
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT eligible.tenant_id, v_service_id
  FROM (
    SELECT ts.tenant_id
    FROM public.tenant_service ts
    JOIN public.service s ON s.id = ts.service_id
    WHERE trim(s.route_path) IN ('/adm/hr-kpi', '/adm/turnover-risk', '/adm/engagement')
    GROUP BY ts.tenant_id
    HAVING COUNT(DISTINCT trim(s.route_path)) = 3
  ) eligible
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service existing
    WHERE existing.tenant_id = eligible.tenant_id AND existing.service_id = v_service_id
  );
END $$;
