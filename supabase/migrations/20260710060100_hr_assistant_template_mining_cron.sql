-- 週次テンプレートマイニング（月曜 7:00 JST = 日曜 22:00 UTC）
SELECT cron.schedule(
  'hr-assistant-template-mining',
  '0 22 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/hr-assistant-template-mining',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
