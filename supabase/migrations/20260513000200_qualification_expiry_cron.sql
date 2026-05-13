-- 毎朝8:00 JST（UTC 23:00）に資格期限アラートを実行
SELECT cron.schedule(
  'qualification-expiry-alert',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/qualification-expiry-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
