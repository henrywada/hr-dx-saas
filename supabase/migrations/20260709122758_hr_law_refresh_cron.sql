-- 毎週月曜 6:00 JST（UTC 前週日曜 21:00）に法令ナレッジ自動更新を実行
SELECT cron.schedule(
  'hr-law-refresh',
  '0 21 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/hr-law-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
