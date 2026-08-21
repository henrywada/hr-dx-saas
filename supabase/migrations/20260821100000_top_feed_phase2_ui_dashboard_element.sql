-- /top 通知フィード Phase 2: eラーニング・1on1・キャリア面談・健診・残業36協定の
-- 新規通知プロバイダに対応する ui_dashboard_element を追加し、対応する service へ
-- service_id を紐付ける（tenant_service 未契約テナントでは表示されないようにする）。
-- ストレスチェックは既存の top.card.stress_check カードのまま feed には追加しない。

INSERT INTO public.ui_dashboard_element (element_key, screen, element_type, label, description, sort_order)
SELECT * FROM (
  VALUES
    ('top.feed.e_learning', 'top', 'notice', 'eラーニング受講可能通知', 'お知らせ内のeラーニング受講可能/期限', 56),
    ('top.feed.one_on_one', 'top', 'notice', '1on1面談接近通知', 'お知らせ内の1on1面談日接近', 57),
    ('top.feed.career_discussion', 'top', 'notice', 'キャリア面談接近通知', 'お知らせ内のキャリア面談日接近', 58),
    ('top.feed.health_check', 'top', 'notice', '健診面談推奨通知', 'お知らせ内の健診結果に基づく面談推奨', 59),
    ('top.feed.overtime_compliance', 'top', 'notice', '36協定超過通知', 'お知らせ内の残業時間36協定超過アラート', 60)
) AS new_rows(element_key, screen, element_type, label, description, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ui_dashboard_element e WHERE e.element_key = new_rows.element_key
);

UPDATE public.ui_dashboard_element e
SET service_id = s.id
FROM (
  VALUES
    ('top.feed.e_learning', '/el-courses'),
    ('top.feed.one_on_one', '/my-one-on-one'),
    ('top.feed.career_discussion', '/career-discussions'),
    ('top.feed.health_check', '/health-check'),
    ('top.feed.overtime_compliance', '/application')
) AS e_map(element_key, route_path)
JOIN public.service s ON trim(s.route_path) = e_map.route_path
WHERE e.element_key = e_map.element_key;
