-- =============================================================================
-- 社内AI情報バンクのメニュー登録
--   従業員向け: /info_bank（検索）
--   管理者向け: /adm/info_bank_mnt（資料のアップロード・改訂・削除）
--
-- ⚠ service / service_category / service_class はクラウドDBと同期しているマスタで、
--   環境ごとに id が異なる。UUID をハードコードせず、名前と route_path で解決する。
--   冪等（再実行しても重複しない）。
--
-- 参照した既存パターン:
--   - 20260907033241_seed_task_management_service_master.sql（従業員向け 'all_users'）
--   - 20260913235357_notion_info_board_menu.sql（管理者向け 'adm'）
-- =============================================================================

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_user_service_id uuid;
  v_adm_service_id uuid;
BEGIN
  -- 一般ユーザー向け「便利ツール」（sort_order が小さい方）に紐付ける
  SELECT id INTO v_class_id
  FROM public.service_class
  WHERE name = '便利ツール'
  ORDER BY sort_order ASC
  LIMIT 1;

  SELECT id INTO v_category_id FROM public.service_category WHERE name = '情報バンク' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 830, '情報バンク')
    RETURNING id INTO v_category_id;
  END IF;

  IF v_class_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_category_id
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_category_id);
  ELSIF v_class_id IS NULL THEN
    RAISE WARNING '[info_bank] service_class「便利ツール」を解決できませんでした。'
      'カテゴリ「情報バンク」をメニューのクラスへ手動で紐付けてください。';
  END IF;

  -- ---- 従業員向け: 社内AI情報バンク ----
  SELECT id INTO v_user_service_id FROM public.service WHERE trim(route_path) = '/info_bank';
  IF v_user_service_id IS NULL THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path,
       target_audience, release_status)
    VALUES (
      v_category_id, '社内AI情報バンク', '', '社内AI情報バンク',
      '社内の資料（規程・マニュアル等）だけを対象に質問できます。資料に無いことは「情報がありません」と回答します。',
      10, '/info_bank', 'all_users', '公開'
    )
    RETURNING id INTO v_user_service_id;
  END IF;

  -- 全ロール（employee を含む）に許可
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_user_service_id
  FROM public.app_role ar
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = v_user_service_id
  );

  -- ---- テナント管理者向け: 情報バンク資料管理 ----
  -- app_role_service は登録しない（登録が無い＝役割による制限なし。notion_info と同じ）
  SELECT id INTO v_adm_service_id FROM public.service WHERE trim(route_path) = '/adm/info_bank_mnt';
  IF v_adm_service_id IS NULL THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path,
       target_audience, release_status)
    VALUES (
      v_category_id, '情報バンク資料管理', '', '情報バンク資料管理',
      '社内AI情報バンクに検索させる資料のアップロード、改訂版への入れ替え、タグ・キーワードの編集ができます。',
      20, '/adm/info_bank_mnt', 'adm', '公開'
    )
    RETURNING id INTO v_adm_service_id;
  END IF;

  -- 既存の全テナントで有効化する
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, s.id
  FROM public.tenants t
  CROSS JOIN (VALUES (v_user_service_id), (v_adm_service_id)) AS s(id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = s.id
  );
END $$;
