-- =============================================================================
-- 「調べる」（/adm/research）のサービスメニュー登録
--
-- モード（税法・労務法・法令）は画面内のラジオボタンなので service は1件のみ。
--
-- ⚠ service / service_category はクラウドDBと同期しているマスタで、
--   環境ごとに id が異なる。UUID は本機能の service.id のみ固定し、
--   カテゴリは既存サービス（/adm/hr-assistant）の route_path から解決する。
--   解決できない場合は WARNING を出してスキップし、マイグレーション自体は失敗させない。
-- =============================================================================

DO $$
DECLARE
  v_service_id CONSTANT uuid := '9f3c07a4-5b18-4d62-9a77-6c0e51b8d3a2';
  v_category_id uuid;
BEGIN
  SELECT s.service_category_id INTO v_category_id
  FROM public.service s
  WHERE s.route_path = '/adm/hr-assistant'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE WARNING '[research] サービスカテゴリを解決できませんでした。'
      '/adm/research のメニュー登録をスキップします（手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_service_id,
      v_category_id,
      '調べる',
      NULL,
      '税法・労務法・法令の条文と通達を原文で確認する',
      '税法・労務法・一般法令の条文、行政通達、裁決事例を横断して検索し、原文を出典URL付きで表示します。AIは取得した原文の要約のみを行います。',
      40,
      '/adm/research',
      NULL,
      NULL,
      'adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
