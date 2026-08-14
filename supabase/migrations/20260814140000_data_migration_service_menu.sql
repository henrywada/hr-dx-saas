-- =============================================================================
-- 他システムデータ移行（SaaS管理者専用メニュー）
--
-- /saas_adm/data-migration をサイドメニューに出す。
-- 既存の「人事法令アップデート管理」（/saas_adm/hr-law-knowledge）と同じカテゴリに並べる。
-- AppSidebar は target_audience と release_status のみで絞るため
-- tenant_service / app_role_service への割当は不要。
--
-- ⚠ service / service_category はクラウドDBと同期しているマスタで、
--   環境ごとに id が異なる。UUID は本機能の service.id のみ固定し、
--   カテゴリは既存サービスの route_path から解決する。
-- =============================================================================

DO $$
DECLARE
  v_saas_service_id CONSTANT uuid := 'c4a8e17d-9b52-4f3a-8e61-1d70c9a4b2f8';
  v_saas_category_id uuid;
BEGIN
  SELECT s.service_category_id INTO v_saas_category_id
  FROM public.service s
  WHERE s.route_path = '/saas_adm/hr-law-knowledge'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  IF v_saas_category_id IS NULL THEN
    SELECT c.id INTO v_saas_category_id
    FROM public.service_category c
    WHERE c.name = 'SaaS：その他'
    LIMIT 1;
  END IF;

  IF v_saas_category_id IS NULL THEN
    RAISE WARNING '[data_migration] SaaS管理者向けカテゴリを解決できませんでした。'
      '/saas_adm/data-migration のメニュー登録をスキップします（手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_saas_service_id,
      v_saas_category_id,
      'データ移行',
      NULL,
      '他システムからの組織・健診・ストレスチェック一括取込',
      '移行先テナントを指定し、従業員CSV・協会けんぽ3ファイル・57問ストレスチェックCSVをプレビューして一括取り込みます。ログインアカウントは作成しません。',
      30,
      '/saas_adm/data-migration',
      NULL,
      NULL,
      'saas_adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
