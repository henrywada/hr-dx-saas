-- 感謝・称賛（Kudos）集計（管理者向け）のメニュー表示用マスタ登録
-- 既存の「ウェルビーイング」カテゴリ（悩み・相談窓口マイグレーションで作成済み）を再利用する。

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0009-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '感謝・称賛 集計',
  'wellbeing',
  '感謝・称賛 集計',
  '感謝・称賛（Kudos）の部署別・個人別の送信・受信件数を集計します。',
  17,
  '/adm/kudos-stats',
  'adm',
  '公開'
) ON CONFLICT (id) DO NOTHING;

-- 管理者向け機能はhr/hr_managerのみ許可
-- app_role.id はハードコードせず、app_role コード名からサブクエリで取得する
-- （環境間でid不一致が起きたため、固定UUID直接指定は避ける）
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, 'a1b2c3d4-0009-4000-8000-000000000001'
FROM public.app_role ar
WHERE ar.app_role IN ('hr', 'hr_manager');
