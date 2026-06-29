-- 感謝・称賛（Kudos）のメニュー表示用マスタ登録
-- 既存の「ウェルビーイング」カテゴリ（悩み・相談窓口マイグレーションで作成済み）を再利用する。
-- target_audience / release_status は AppSidebar.tsx の実際のフィルタ条件（'all_users'|'adm', '公開'）に合わせる。

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0008-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '感謝・称賛',
  'wellbeing',
  '感謝・称賛',
  '同僚への感謝・称賛メッセージの投稿、全社フィードの確認ができます。',
  16,
  '/kudos',
  'all_users',
  '公開'
) ON CONFLICT (id) DO NOTHING;
