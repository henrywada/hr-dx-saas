-- タスク管理フィード連携（要求12）のコメント通知クエリが `created_at` の範囲検索＋降順ソート
-- （`WHERE created_at >= 3日前 ORDER BY created_at DESC LIMIT 20`）を新設したため、
-- 対応するインデックスを追加する。既存データへの影響がない純粋な追加のみ。
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at
  ON public.task_comments (created_at DESC);
