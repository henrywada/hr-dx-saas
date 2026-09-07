-- タスク管理（/tasks）の公開状態を「下書き」に変更する
--
-- 最終レビュー Finding 4: 責任者割当・メンバー割当・タスク作成のフォームが
-- 従業員UUIDのテキスト入力のままで実運用に耐えないため、従業員選択UIが
-- 用意できるまで一般公開を止める。20260907033241_seed_task_management_service_master.sql
-- は既にコミット済みのマイグレーションであり、このプロジェクトの規約
-- （マイグレーションは追記のみ・既存ファイルは編集しない）に従い、
-- 別マイグレーションとしてUPDATEを追加する。
--
-- release_status の有効値は '公開' / '下書き' の2値
-- （SELECT DISTINCT release_status FROM public.service で確認済み）。

UPDATE public.service
SET release_status = '下書き'
WHERE route_path = '/tasks';
