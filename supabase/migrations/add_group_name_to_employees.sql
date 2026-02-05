-- Add group_name column to employees table
-- 従業員の所属グループ名を管理するカラムを追加

ALTER TABLE employees
ADD COLUMN group_name TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN employees.group_name IS '従業員が所属するグループ・チーム名（例: 開発チームA、営業第二グループ等）';
