-- =============================================================================
-- ログイン履歴（サイドメニューへの表示）
--   既存の「組織の登録」（/adm/divisions、システム設定／基本設定カテゴリ）と
--   同じカテゴリに並べる。
--
-- ⚠ service / service_category / tenant_service はクラウドDBと同期しているマスタで、
--   同じカテゴリでも環境ごとに id が異なる。そのため UUID をハードコードせず、
--   既存サービスの route_path を手がかりにカテゴリを解決する。
--   解決できない環境では登録をスキップし、WARNING で運用者に知らせる
--   （関数作成は別マイグレーションで既に成功しており、メニュー登録だけ手動対応に委ねる）。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。AppSidebar の実装に準拠）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するサービスの id（環境間で揃える）
  v_service_id CONSTANT uuid := 'a3c9f1d2-6b47-4e8a-9c2d-1f6e8b0a5d7c';

  v_category_id uuid;
  v_sibling_service_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- カテゴリと、割当元になる兄弟サービスを解決する ----
  SELECT s.service_category_id, s.id
    INTO v_category_id, v_sibling_service_id
  FROM public.service s
  WHERE s.route_path = '/adm/divisions'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  -- 兄弟サービスが見つからない環境では、カテゴリ名で解決を試みる
  IF v_category_id IS NULL THEN
    SELECT c.id INTO v_category_id
    FROM public.service_category c
    WHERE c.name = '基本設定'
    ORDER BY c.sort_order DESC
    LIMIT 1;
  END IF;

  IF v_category_id IS NULL THEN
    RAISE WARNING '[login_logs] 「基本設定」カテゴリを解決できませんでした。'
      '/adm/login-logs のメニュー登録をスキップします（/saas_adm から手動登録してください）。';
    RETURN;
  END IF;

  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    'ログイン履歴',
    NULL,
    '誰がいつログインしたかを確認',
    'ログイン日時・ユーザー名・メールアドレスの一覧を年月で絞り込んで確認できます。',
    90,
    '/adm/login-logs',
    NULL,
    NULL,
    'adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;

  -- テナント割当: 兄弟サービスと同じテナントで利用可能にする
  IF v_sibling_service_id IS NULL THEN
    RAISE WARNING '[login_logs] 割当元サービス(/adm/divisions)が無いため '
      'tenant_service への割当をスキップしました。契約テナントへ手動で割り当ててください。';
  ELSE
    INSERT INTO public.tenant_service (tenant_id, service_id, start_date, status)
    SELECT ts.tenant_id, v_service_id, ts.start_date, ts.status
    FROM public.tenant_service ts
    WHERE ts.service_id = v_sibling_service_id
      AND NOT EXISTS (
        SELECT 1 FROM public.tenant_service dup
        WHERE dup.tenant_id = ts.tenant_id
          AND dup.service_id = v_service_id
      );
    GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
    RAISE NOTICE '[login_logs] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
  END IF;
END $$;
