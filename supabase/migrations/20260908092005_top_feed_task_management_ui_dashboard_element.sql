-- /top 通知フィードへのタスク管理連携（要求12）。
-- タスク管理機能の service（route_path='/tasks'）へ service_id を紐付けることで、
-- tenant_service 未契約テナントには本プロバイダの fetch 自体が呼ばれないようにする。

INSERT INTO public.ui_dashboard_element (element_key, screen, element_type, label, description, sort_order)
SELECT * FROM (
  VALUES
    ('top.feed.task_management', 'top', 'notice', 'タスク管理通知', 'お知らせ内のタスク割当・期限接近・コメント通知', 61)
) AS new_rows(element_key, screen, element_type, label, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ui_dashboard_element e WHERE e.element_key = new_rows.element_key
);

UPDATE public.ui_dashboard_element e
SET service_id = s.id
FROM (
  VALUES
    ('top.feed.task_management', '/tasks')
) AS e_map(element_key, route_path)
JOIN public.service s ON trim(s.route_path) = e_map.route_path
WHERE e.element_key = e_map.element_key;
