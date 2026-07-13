-- app.supabase_url / app.service_role_key は ALTER DATABASE 権限が必要で、
-- Supabase ホスティング環境の SQL Editor からは設定できず
-- （42501: permission denied to set parameter）、cron 実行が毎回失敗していた。
-- Supabase Vault（vault.decrypted_secrets）からの参照に切り替える。
--
-- 新方式の secret key（sb_secret_...）は JWT 形式ではないため Authorization: Bearer では
-- JWT検証エラーになる。apikey ヘッダーで送り、対象関数側は verify_jwt = false にしておくこと
-- （supabase/config.toml 参照）。
--
-- 事前に本番 SQL Editor で以下を一度だけ実行しておくこと（値は直接入力し、絶対にコミットしない）：
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<新しい secret key (sb_secret_...) の値>', 'service_role_key');

select cron.unschedule('hr-law-refresh');
select cron.schedule(
  'hr-law-refresh',
  '0 21 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/hr-law-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);

select cron.unschedule('hr-assistant-template-mining');
select cron.schedule(
  'hr-assistant-template-mining',
  '0 22 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/hr-assistant-template-mining',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);

-- 同じ理由で 2026-05-13 の導入以来失敗し続けていた資格期限アラートも修正
select cron.unschedule('qualification-expiry-alert');
select cron.schedule(
  'qualification-expiry-alert',
  '0 23 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/qualification-expiry-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
