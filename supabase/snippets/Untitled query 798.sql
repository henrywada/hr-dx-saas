-- pulse_sessions テーブルに「解決済みフラグ」を追加
-- default false なので、最初は全員「未解決」として扱われます
alter table pulse_sessions 
add column is_resolved boolean default false;