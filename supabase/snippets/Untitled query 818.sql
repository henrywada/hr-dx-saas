-- 1. emailカラムを追加
ALTER TABLE employees ADD COLUMN email text;

-- 2. 既存の管理者ユーザーにemailをセット
UPDATE employees 
SET email = 'wada007@gmail.com' 
WHERE id = 'ab9a1201-d34b-452b-a6cc-9985275f1b18';

-- 3. テストのため、RLSは一度無効のままでOKです（解決後に戻します）