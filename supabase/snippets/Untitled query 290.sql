-- ユーザー「wada007」になりすましてテスト実行
-- もしデータが表示されれば、アプリでも必ずログインできます
set request.jwt.claim.sub = 'ab9a1201-d34b-452b-a6cc-9985275f1b18'; -- あなたのUUID
set role authenticated;

-- データ取得テスト
select * from employees;