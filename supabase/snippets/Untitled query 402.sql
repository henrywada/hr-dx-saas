-- 1. pulse_configs テーブルへの追加
-- パルスサーベイの実施頻度を管理するカラム
-- 想定値: 'daily', 'weekly', 'monthly' など
ALTER TABLE pulse_configs
ADD COLUMN survey_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' COMMENT 'サーベイ実施頻度 (daily, weekly, monthly)';

-- 2. employees テーブルへの追加
-- マネージャーかどうかを判定するフラグ
-- 想定値: true (1), false (0)
ALTER TABLE employees
ADD COLUMN is_manager BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'マネージャーフラグ';