-- SaaS管理者（developer）にも「イベント・表彰管理」「感謝・称賛 集計」の管理画面メニューを表示する
-- app_role.id はハードコードせず、app_role コード名からサブクエリで取得する

INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, svc.id
FROM public.app_role ar
CROSS JOIN public.service svc
WHERE ar.app_role = 'developer'
  AND svc.route_path IN ('/adm/events-awards', '/adm/kudos-stats')
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = svc.id
  );
