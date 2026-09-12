-- =============================================================================
-- 工数×残業クロス分析ダッシュボード（テナント管理者向け、/adm/workload-burnout-analysis）
-- のメニュー登録
--
-- 既存カテゴリ「勤務：分析」（36協定分析と同じカテゴリ、service_category.name で解決）
-- にサービスを追加する。新規カテゴリは作らない（PRD セクション7）。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。task_health_dashboard_menu マイグレーションの
-- 実装知見に合わせる）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するレコードのid（環境間で揃える。python3 -c "import uuid; print(uuid.uuid4())" で生成した値）
  v_service_id CONSTANT uuid := '6cd54bce-3d45-4ff6-99c5-0eb7d5866858';

  v_category_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- 既存カテゴリ「勤務：分析」を解決する ----
  SELECT id INTO v_category_id
  FROM public.service_category
  WHERE name = '勤務：分析'
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION '[workload_overtime_cross_analysis] 既存カテゴリ「勤務：分析」を解決できませんでした。マイグレーションを中断します。';
  END IF;

  -- ---- サービス本体を登録する ----
  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    '工数×残業クロス分析',
    NULL,
    '工数×残業クロス分析',
    '残業時間と申告工数を従業員×月単位で突き合わせ、継続的残業・申告乖離・タスク時間集中を検知して要注意メンバーを一覧表示します。',
    55,
    '/adm/workload-burnout-analysis',
    NULL,
    NULL,
    'adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- 既存全テナントに機能を有効化する ----
  -- start_date/status は task_health_dashboard_menu マイグレーションでの実データ調査結果と
  -- 同じ理由でNULLのまま入れる（tenant_serviceに行が存在すること自体が「有効」を意味する）。
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_service_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_service_id
  );
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  RAISE NOTICE '[workload_overtime_cross_analysis] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
END $$;
