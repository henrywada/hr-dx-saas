-- =============================================================================
-- タスク健康度ダッシュボード（テナント管理者向け、/adm/task-health）のメニュー登録
--
-- 新規カテゴリとして「タスク健康度」を新設する（既存の /adm/okr は
-- src/features/okr/ という完全に別モジュールであり無関係、PRD セクション21.0）。
-- サイドメニュー大分類は既存の「評価・成長」（sort_order 1400）に相乗りする。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。grant_notifier マイグレーションの
-- 実装知見に合わせる）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するレコードのid（環境間で揃える。python3 -c "import uuid; print(uuid.uuid4())" で生成した値）
  v_category_id CONSTANT uuid := '92f87b57-71dc-4bd0-abda-6669e7ba272c';
  v_service_id  CONSTANT uuid := 'ec8827bb-68c9-417d-b537-dc96be118a0f';

  v_class_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- サイドメニュー大分類「評価・成長」を解決する ----
  SELECT id INTO v_class_id
  FROM public.service_class
  WHERE name = '評価・成長'
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE WARNING '[task_health] サイドメニュー大分類「評価・成長」を解決できませんでした。'
      'service_class_index への登録をスキップします（手動登録してください）。';
  END IF;

  -- ---- カテゴリを新設する ----
  INSERT INTO public.service_category (id, sort_order, name, description, release_status)
  VALUES (
    v_category_id,
    (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM public.service_category),
    'タスク健康度',
    '組織横断でタスクの進捗・滞留・負荷偏在を可視化する',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- サイドメニュー大分類に紐付ける ----
  IF v_class_id IS NOT NULL THEN
    INSERT INTO public.service_class_index (service_class_id, service_category_id)
    SELECT v_class_id, v_category_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.service_class_index
      WHERE service_class_id = v_class_id AND service_category_id = v_category_id
    );
  END IF;

  -- ---- サービス本体を登録する ----
  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    'タスク健康度ダッシュボード',
    NULL,
    'タスク健康度ダッシュボード',
    '全社のタスク進捗概要・滞留タスク・担当者別負荷偏在・目標別達成状況を、部門で絞り込んで確認できます。',
    10,
    '/adm/task-health',
    NULL,
    NULL,
    'adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ---- 既存全テナントに機能を有効化する ----
  -- start_date/status は実データを調査した結果、既存269行すべてNULLで
  -- コード側でも参照されていない未使用カラムだった（tenant_serviceに行が
  -- 存在すること自体が「有効」を意味する）。実データパターンに合わせてNULLのまま入れる。
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_service_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_service_id
  );
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
  RAISE NOTICE '[task_health] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
END $$;
