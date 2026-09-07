-- タスク管理機能（/tasks）を公開状態に切り替える。
--
-- 20260907090411_set_task_management_release_status_draft.sql で、
-- 担当者・マネージャー・メンバー指定が生UUID入力のままだったため
-- release_status を '下書き' にして非公開にしていた。
-- 従業員選択コンボボックス（EmployeePicker）の実装により解消されたため、
-- '公開' に戻す。

UPDATE public.service
SET release_status = '公開'
WHERE route_path = '/tasks';
