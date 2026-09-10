-- tasks.assignee_employee_id（単一担当者、Phase 4で task_assignees に置き換え済み）を削除する。
-- 実行前提: task_assignees へのバックフィルが完了しており（Task 1）、
-- アプリケーションコードは Task 2 以降この列を一切参照していないことをユーザーが確認済み。
-- 背景: docs/implementation-plan-task-management.md セクション19.1（Phase 4・要求14）

ALTER TABLE public.tasks DROP COLUMN IF EXISTS assignee_employee_id;
