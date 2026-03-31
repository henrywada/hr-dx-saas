-- ⚠️ このファイルを本番環境で実行する前に、必ずステージング環境で検証してください。
-- 既存データは削除しません。ADD COLUMN IF NOT EXISTS のみ使用しています。

ALTER TABLE public.monthly_overtime_closures
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS locked_by uuid,
  ADD COLUMN IF NOT EXISTS lock_reason text,
  ADD COLUMN IF NOT EXISTS aggregated_at timestamptz,
  ADD COLUMN IF NOT EXISTS aggregate_version integer DEFAULT 1;

-- ✅ マイグレーション完了後、Supabase Studio または psql で
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'monthly_overtime_closures';
-- を実行してカラム追加を確認してください。
