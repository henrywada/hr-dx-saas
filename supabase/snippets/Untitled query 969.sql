-- 1. pulse_configs テーブルへの追加
-- まずカラムを追加
ALTER TABLE pulse_configs
ADD COLUMN survey_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly';

-- 次にコメントを追加（PostgreSQLの構文）
COMMENT ON COLUMN pulse_configs.survey_frequency IS 'サーベイ実施頻度 (daily, weekly, monthly)';


-- 2. employees テーブルへの追加
-- まずカラムを追加
ALTER TABLE employees
ADD COLUMN is_manager BOOLEAN NOT NULL DEFAULT FALSE;

-- 次にコメントを追加
COMMENT ON COLUMN employees.is_manager IS 'マネージャーフラグ';