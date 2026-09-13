-- =============================================================================
-- 情報掲示板（notion info board）テナント管理者メニュー登録
--
-- Notion に収集した人事トレンド・助成金・AI最新情報を /adm/notion_info で閲覧する。
-- 新規業務テーブルは作らない（正本は Notion）。メニューだけ登録する。
--
-- テナント管理者側: 既存の「自動検索・配信ルール設定」（/adm/auto-distribution）と
--                   同じカテゴリ（便利ツール／ツールボックス）に並べる。
--                   tenant_service の割当が無いとメニューに出ないため、同サービスと
--                   同じテナントへ割り当てる。
-- SaaS 管理者向けサービスは作らない。
--
-- ⚠ service / service_category / tenant_service はクラウドDBと同期しているマスタで、
--   同じカテゴリでも環境ごとに id が異なる。そのため UUID をハードコードせず、
--   既存サービスの route_path を手がかりにカテゴリを解決する。
--   解決できない環境では登録をスキップし、WARNING で運用者に知らせる。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。AppSidebar の実装に準拠）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するサービスの id（環境間で揃える）
  v_adm_service_id CONSTANT uuid := 'f30f07bd-ed29-4ca3-ab52-9abc83c70c7b';

  v_adm_category_id uuid;
  v_sibling_service_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- テナント管理者向けのカテゴリと、割当元になる兄弟サービスを解決する ----
  SELECT s.service_category_id, s.id
    INTO v_adm_category_id, v_sibling_service_id
  FROM public.service s
  WHERE s.route_path = '/adm/auto-distribution'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  -- 兄弟サービスが見つからない環境では、カテゴリ名で解決を試みる
  IF v_adm_category_id IS NULL THEN
    SELECT c.id INTO v_adm_category_id
    FROM public.service_category c
    WHERE c.name = 'ツールボックス'
    ORDER BY c.sort_order DESC
    LIMIT 1;
  END IF;

  -- ---- テナント管理者向けサービスを登録 ----
  IF v_adm_category_id IS NULL THEN
    RAISE WARNING '[notion_info_board] テナント管理者向けカテゴリを解決できませんでした。'
      '/adm/notion_info のメニュー登録をスキップします（/saas_adm から手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_adm_service_id,
      v_adm_category_id,
      '情報掲示板',
      NULL,
      '情報掲示板',
      'Notion に収集した最新人事トレンド・助成金情報・AI最新情報を一覧し、本文を確認できます。',
      50,
      '/adm/notion_info',
      NULL,
      NULL,
      'adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;

    -- テナント割当: 兄弟サービスと同じテナントで利用可能にする
    IF v_sibling_service_id IS NULL THEN
      RAISE WARNING '[notion_info_board] 割当元サービス(/adm/auto-distribution)が無いため '
        'tenant_service への割当をスキップしました。契約テナントへ手動で割り当ててください。';
    ELSE
      INSERT INTO public.tenant_service (tenant_id, service_id, start_date, status)
      SELECT ts.tenant_id, v_adm_service_id, ts.start_date, ts.status
      FROM public.tenant_service ts
      WHERE ts.service_id = v_sibling_service_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tenant_service dup
          WHERE dup.tenant_id = ts.tenant_id
            AND dup.service_id = v_adm_service_id
        );
      GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
      RAISE NOTICE '[notion_info_board] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
    END IF;
  END IF;
END $$;
