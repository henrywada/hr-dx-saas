-- キャリア面談のメニュー表示用マスタ登録
-- 既存の「キャリア面談」カテゴリ（従業員向け 67764b7f-..., 管理者向け 93718fd6-...）を再利用する。
-- これらは評価・成長ブロック（service_class ac9cc57d-...）に既に紐付け済みのため、
-- service_category / service_class_index の新規作成は不要。

INSERT INTO public.service
  (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
SELECT '67764b7f-2946-4d81-b465-bac19a181aaf', 'キャリア面談', '', 'キャリア面談',
       '自分のキャリア面談履歴の確認、（上長の場合）部下とのキャリア面談の記録ができます。',
       1, '/career-discussions', 'all_users', '公開'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service s WHERE trim(s.route_path) = '/career-discussions'
);

INSERT INTO public.service
  (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
SELECT '93718fd6-0991-422f-9c19-43d8765745cd', 'キャリア面談管理', '', 'キャリア面談管理',
       '全社のキャリア面談記録の確認・登録ができます。',
       1, '/adm/career-discussions', 'adm', '公開'
WHERE NOT EXISTS (
  SELECT 1 FROM public.service s WHERE trim(s.route_path) = '/adm/career-discussions'
);
