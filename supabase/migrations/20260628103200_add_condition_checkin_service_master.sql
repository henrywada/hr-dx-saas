-- コンディション記録のメニュー表示用マスタ登録
-- 既存の「ウェルビーイング」カテゴリ（悩み・相談窓口マイグレーションで作成済み）を再利用する。

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES ('a1b2c3d4-0001-4000-8000-000000000001', 600, 'ウェルビーイング', '', 'released')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0004-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'コンディション記録',
  'wellbeing',
  'コンディション記録',
  '今日の気分・体調を1タップで記録します。',
  12,
  '/condition',
  'employee',
  'released'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0005-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '部署別コンディション傾向',
  'wellbeing',
  '部署別コンディション傾向',
  '上長・人事向けの匿名集計コンディション傾向です。',
  13,
  '/adm/condition-trend',
  'admin',
  'released'
) ON CONFLICT (id) DO NOTHING;
