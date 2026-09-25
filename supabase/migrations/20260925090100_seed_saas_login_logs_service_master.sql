-- =============================================================================
-- SaaS管理者向けログイン履歴（全テナント）のサイドメニュー登録
--   既存の「新規ご契約（会社：テナント）」（/saas_adm/tenants）と同じカテゴリに並べる。
--
-- ⚠ service / service_category は環境間で id が異なる同期マスタ。
--   UUID をハードコードせず、既存 saas_adm サービスの route_path からカテゴリを解決する。
--   解決できない環境では登録をスキップし、WARNING で運用者に知らせる。
--
-- tenant_service / app_role_service には登録しない。
--   AppSidebar の saas variant は target_audience='saas_adm' かつ release_status='公開'
--   のサービスを直接読み込み、tenant_service・app_role_service を参照しないため。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するサービスの id（環境間で揃える）
  v_service_id CONSTANT uuid := '772ad740-b7d5-415b-9fb7-b01a84321b8a';

  v_category_id uuid;
BEGIN
  SELECT s.service_category_id
    INTO v_category_id
  FROM public.service s
  WHERE s.target_audience = 'saas_adm'
    AND s.route_path = '/saas_adm/tenants'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE WARNING '[saas_login_logs] saas_adm のカテゴリを解決できませんでした。'
      '/saas_adm/login-logs のメニュー登録をスキップします（/system-master から手動登録してください）。';
    RETURN;
  END IF;

  INSERT INTO public.service (
    id, service_category_id, name, category, title, description,
    sort_order, route_path, app_role_group_id, app_role_group_uuid,
    target_audience, release_status
  ) VALUES (
    v_service_id,
    v_category_id,
    'ログイン履歴（全テナント）',
    NULL,
    '全テナントのログイン状況を確認',
    'テナントを横断して、ログイン日時・ユーザー名・メールアドレスを年月で絞り込んで確認できます。',
    30,
    '/saas_adm/login-logs',
    NULL,
    NULL,
    'saas_adm',
    '公開'
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
