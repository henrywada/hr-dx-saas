-- タスク／タスクグループ単位の「目標（達成基準）」フィールド
-- 背景: docs/implementation-plan-task-management.md セクション19.3（Phase 4・要求16）

ALTER TABLE public.task_groups ADD COLUMN IF NOT EXISTS goal_summary TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS goal_summary TEXT;

COMMENT ON COLUMN public.task_groups.goal_summary IS 'このタスクグループの達成基準（短い一文。例:「改善案の3案を立案」）。descriptionとは別に、運用概念図の「タスクごとの目標」に対応する';
COMMENT ON COLUMN public.tasks.goal_summary IS 'このタスクの達成基準（短い一文）。task_groups.goal_summaryと同じ意図';
