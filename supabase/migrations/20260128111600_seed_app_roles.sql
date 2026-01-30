
-- Insert initial app roles
INSERT INTO app_role (app_role, name) VALUES
    ('employee', '従業員'),
    ('hr_manager', '人事マネージャー'),
    ('hr', '人事'),
    ('boss', '上司'),
    ('company_doctor', '産業医'),
    ('company_nurse', '保健師'),
    ('hsc', '安全衛生委員'),
    ('developer', '開発者'),
    ('test', 'system tester')
ON CONFLICT (app_role) DO UPDATE SET name = EXCLUDED.name;
