-- employeesテーブルに初回セットアップ完了フラグを追加
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.is_setup_complete IS '初回パスワード設定が完了したかどうか';
