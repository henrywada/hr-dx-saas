-- チームコネクト（組織図・社内ディレクトリ閲覧）のメニュー表示用マスタ登録
-- service_category「コミュニケーション」は既存に該当カテゴリが無いため新規作成する
-- （ウェルビーイングカテゴリ a1b2c3d4-0001-... とは別レイヤーのため相乗りしない）

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES ('a1b2c3d4-0010-4000-8000-000000000001', 500, 'コミュニケーション', '', '公開')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0011-4000-8000-000000000001',
  'a1b2c3d4-0010-4000-8000-000000000001',
  'チームコネクト',
  'communication',
  'チームコネクト',
  '組織図・社内ディレクトリを確認できます。',
  10,
  '/team-connect',
  'all_users',
  '公開'
) ON CONFLICT (id) DO NOTHING;

-- tenant_service / app_role_service への投入は直近のウェルビーイング4機能の前例に合わせて省略する
-- （SaaS管理者がテナント管理画面で機能を個別有効化する運用。app_role_serviceはvariant='admin'の
--   サービスにのみ適用されるフィルタのため、target_audience='all_users'の本サービスには影響しない）
