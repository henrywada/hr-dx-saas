-- Drop the existing check constraint for target_audience
ALTER TABLE service DROP CONSTRAINT IF EXISTS service_target_audience_check;

-- Re-add the check constraint with 'saas_adm' included
ALTER TABLE service 
ADD CONSTRAINT service_target_audience_check 
CHECK (target_audience IN ('all_users', 'admins_only', 'saas_adm'));

COMMENT ON COLUMN service.target_audience IS '利用対象 (all_users/admins_only/saas_adm)';
