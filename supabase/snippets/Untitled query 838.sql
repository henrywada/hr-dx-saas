-- 1. user_id カラムを追加 (アプリがこの名前で検索している可能性大)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2. 既存の id (Auth UID) を user_id にコピー
UPDATE employees SET user_id = id;

-- 3. 念のため created_at も追加 (タイムスタンプがないとエラーになる場合があるため)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();