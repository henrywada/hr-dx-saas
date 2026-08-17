-- サイドメニューの表示名の不整合を修正する。
--
-- 対象は service_category.name / service.name（いずれも画面にそのまま表示される値）。
-- UUID は環境ごとに異なるため（ローカルと本番でドリフトする）、行の特定には
-- name と route_path のみを使い、ID の直書きは行わない。
-- 削除操作（DROP / TRUNCATE / 範囲無指定の DELETE）は含まない。

-- ============================================================
-- 1. メニュー名・機能名の先頭に混入したタブ文字を除去する
--    該当項目だけサイドメニュー上で字下げして表示されていた。
--    大分類の区切り行（'　| ===▼管理▼==== |'）は装飾目的のため対象外とする。
-- ============================================================

UPDATE public.service_category
SET name = btrim(name, E' \t\r\n')
WHERE name IN (E'\t勤務：分析', E'\t基本設定');

UPDATE public.service
SET name = btrim(name, E' \t\r\n')
WHERE name IN (
  E'\t 受診率・組織分析',
  E'\tアンケート回答履歴',
  E'\tスキルマップ管理',
  E'\tパルス×ストレス分析',
  E'\tリモートワーク開始・終了',
  E' 36協定遵守状況リスク管理ダッシュボード'
);

-- ============================================================
-- 2. カテゴリ名の表記ゆれと誤字を修正する
--    - 同一機能が従業員側「パルス＆サーベイ」/ 管理側「パルス＆サーベ」で不一致だった
--    - 「社内ベント・表彰」は「社内イベント・表彰」の誤り（従業員側・管理側の 2 件）
-- ============================================================

UPDATE public.service_category
SET name = 'パルス＆サーベイ'
WHERE name = 'パルス＆サーベ';

UPDATE public.service_category
SET name = '社内イベント・表彰'
WHERE name = '社内ベント・表彰';

-- ============================================================
-- 3. 管理メニュー「スキル・能力向上」から目標管理（OKR / MBO）を分離する
--    スキルマップ・承認フロー・評価ワークフローと OKR が同一カテゴリに同居し、
--    7 機能が 1 項目に集中していたため、関心事の異なる OKR を独立させる。
--    sort_order = 4350 で「スキル・能力向上」（4300）の直後に表示される。
-- ============================================================

INSERT INTO public.service_category (name, sort_order)
SELECT '目標管理（OKR / MBO）', 4350
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_category WHERE name = '目標管理（OKR / MBO）'
);

-- 大分類「評価・成長」に紐付ける
INSERT INTO public.service_class_index (service_class_id, service_category_id)
SELECT cls.id, cat.id
FROM public.service_class cls
CROSS JOIN public.service_category cat
WHERE cls.name = '評価・成長'
  AND cat.name = '目標管理（OKR / MBO）'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_class_index x
    WHERE x.service_class_id = cls.id
      AND x.service_category_id = cat.id
  );

-- OKR の 2 機能を新カテゴリへ移す（route_path で特定する）
UPDATE public.service s
SET service_category_id = cat.id
FROM public.service_category cat
WHERE cat.name = '目標管理（OKR / MBO）'
  AND s.route_path IN ('/adm/okr', '/adm/okr/tree');
