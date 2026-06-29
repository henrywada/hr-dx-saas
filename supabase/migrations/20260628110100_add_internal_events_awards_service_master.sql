-- 社内イベント・表彰のメニュー表示用マスタ登録
-- 既存の「ウェルビーイング」カテゴリ（悩み・相談窓口マイグレーションで作成済み）を再利用する。

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0006-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  '社内イベント・表彰',
  'wellbeing',
  '社内イベント・表彰',
  '社内イベントの告知・参加表明、表彰の発表を確認できます。',
  14,
  '/events',
  'all_users',
  '公開'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.service (
  id, service_category_id, name, category, title, description, sort_order,
  route_path, target_audience, release_status
) VALUES (
  'a1b2c3d4-0007-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'イベント・表彰管理',
  'wellbeing',
  'イベント・表彰管理',
  '社内イベントの作成・参加者管理、表彰の登録を行います。',
  15,
  '/adm/events-awards',
  'adm',
  '公開'
) ON CONFLICT (id) DO NOTHING;

-- 管理者向け機能はhr/hr_managerのみ許可（産業医・保健師は健康領域外のため対象外）
-- app_role.id はハードコードせず、app_role コード名からサブクエリで取得する
-- （環境間でid不一致が起きたため、固定UUID直接指定は避ける）
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, 'a1b2c3d4-0007-4000-8000-000000000001'
FROM public.app_role ar
WHERE ar.app_role IN ('hr', 'hr_manager');
