-- pg_cron 拡張機能の有効化（データベース全体の自動ジョブ管理機能）
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- （安全策）すでに同名のジョブが存在する場合は一度削除して再作成する
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_old_access_logs'
  ) THEN
    PERFORM cron.unschedule('cleanup_old_access_logs');
  END IF;
END $$;

-- 古いアクセスログを自動削除する定時バッチジョブの登録
-- ジョブ名: cleanup_old_access_logs
-- 実行時間: 毎日 日本時間の午前3時（UTC基準だと 前日18:00 なので '0 18 * * *' に設定）
-- 削除対象: 作成日時 (created_at) が現在時刻から「90日（3ヶ月）」より前のアクセスログ
SELECT cron.schedule(
  'cleanup_old_access_logs',
  '0 18 * * *',
  $$ DELETE FROM public.access_logs WHERE created_at < NOW() - INTERVAL '90 days' $$
);
