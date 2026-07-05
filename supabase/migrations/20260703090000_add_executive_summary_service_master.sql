-- 経営者向け統合エグゼクティブサマリー（施策4）のメニュー表示用マスタ登録
-- 既存の「サーベイ・分析 > AI・分析」カテゴリ（/adm/hr-kpi・/adm/turnover-risk・/adm/engagement が
-- 既に属する）を再利用する。当初のPRDでは turnover-risk / engagement が未登録と想定していたが、
-- 実データ確認の結果、既に同カテゴリに登録済みであったため、本migrationでは新規サービス1件のみ追加する。

DO $$
DECLARE
  v_category_id uuid;
  v_service_id uuid;
BEGIN
  SELECT service_category_id INTO v_category_id
  FROM public.service WHERE trim(route_path) = '/adm/hr-kpi' LIMIT 1;

  IF v_category_id IS NULL THEN
    -- クリーンな db reset では前提サービス未登録のためスキップ（20260706140000 が冪等補完）
    RETURN;
  END IF;

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

  -- 人事ロール向け（既存の /adm/hr-kpi・/adm/turnover-risk・/adm/engagement と同じロール構成）
  -- app_role テーブルに 'tenant_admin' という値は存在しないため対象外（hr/hr_manager が実質的な管理者ロール）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_service_id
  FROM public.app_role ar
  WHERE ar.app_role IN ('hr', 'hr_manager', 'developer', 'test')
    AND NOT EXISTS (
      SELECT 1 FROM public.app_role_service ars
      WHERE ars.app_role_id = ar.id AND ars.service_id = v_service_id
    );

  -- 前提となる3機能（hr-kpi・turnover-risk・engagement）をすべて契約済みのテナントにのみ提供する
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
