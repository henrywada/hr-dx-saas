-- 1. Insert into app_role table
INSERT INTO app_role (app_role, name)
VALUES ('saas_adm', 'SaaS管理者')
ON CONFLICT (app_role) DO UPDATE SET name = 'SaaS管理者';

-- 2. Update employees table check constraint to include 'saas_adm'
ALTER TABLE employees DROP CONSTRAINT IF EXISTS check_app_role;

ALTER TABLE employees
ADD CONSTRAINT check_app_role
CHECK (app_role IN (
    'employee', 'hr_manager', 'hr', 'boss', 'company_doctor',
    'company_nurse', 'hsc', 'developer', 'test', 'saas_adm'
));
