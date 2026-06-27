-- 悩み・相談窓口のメニュー表示用マスタ登録
-- service_category は既存の「ウェルビーイング」相当カテゴリが無い場合、ここで新規作成する。
-- 既存カテゴリのIDが判明している場合はこのINSERTを省略し、service.service_category_id にそのIDを使う。

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 600, 'ウェルビーイング', '', 'released')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '悩み・相談窓口',
  'wellbeing',
  '悩み・相談窓口',
  '匿名または記名で人事・産業医に相談できる窓口です。',
  10,
  '/consultation',
  'employee',
  'released'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0003-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '相談窓口キュー管理',
  'wellbeing',
  '相談窓口キュー管理',
  '人事・産業医向けの相談受付一覧です。',
  11,
  '/adm/consultation-queue',
  'admin',
  'released'
) ON CONFLICT (id) DO NOTHING;
