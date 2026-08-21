-- /top 通知フィード化に伴う ui_dashboard_element の更新。
-- element_key は id 参照ではなく文字列で外部キー(tenant_ui_dashboard_element.ui_dashboard_element_id)
-- を貼っているわけではなく、実際には id (UUID) で参照されているため、
-- 既存行の element_key を UPDATE でリネームしてもテナント別オーバーライドは失われない。

-- 1) セクション見出し・個別通知のキーをフィード用の命名に統一する
UPDATE public.ui_dashboard_element
SET element_key = 'top.section.feed'
WHERE element_key = 'top.section.announcements';

UPDATE public.ui_dashboard_element
SET element_key = 'top.feed.consultation'
WHERE element_key = 'top.notice.consultation';

UPDATE public.ui_dashboard_element
SET element_key = 'top.feed.kudos'
WHERE element_key = 'top.notice.kudos';

UPDATE public.ui_dashboard_element
SET element_key = 'top.feed.questionnaire'
WHERE element_key = 'top.notice.questionnaire';

UPDATE public.ui_dashboard_element
SET element_key = 'top.feed.lifecycle'
WHERE element_key = 'top.notice.lifecycle';

-- 2) 人事お知らせ用の要素を新規追加（お知らせ自体は service 未登録のコア機能のため service_id なし）
INSERT INTO public.ui_dashboard_element (element_key, screen, element_type, label, description, sort_order)
SELECT 'top.feed.hr_announcement', 'top', 'notice', '人事からのお知らせ', 'お知らせ内の人事お知らせ一覧', 51
WHERE NOT EXISTS (
  SELECT 1 FROM public.ui_dashboard_element WHERE element_key = 'top.feed.hr_announcement'
);

-- 3) 既存の抜け穴修正: consultation/kudos/questionnaire は tenant_service 契約対象の service が
--    実在するにもかかわらず service_id が未設定だったため、契約制御が機能していなかった。
--    ここで route_path から service_id を紐付ける（人事お知らせ・ライフサイクルは従業員向け service
--    が存在しないためコア機能として service_id なしのまま据え置く）。
UPDATE public.ui_dashboard_element e
SET service_id = s.id
FROM (
  VALUES
    ('top.feed.consultation', '/consultation'),
    ('top.feed.kudos', '/kudos'),
    ('top.feed.questionnaire', '/answers')
) AS e_map(element_key, route_path)
JOIN public.service s ON trim(s.route_path) = e_map.route_path
WHERE e.element_key = e_map.element_key;
