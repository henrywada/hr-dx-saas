insert into employees (
  id, tenant_id, division_id, active_status, name, is_manager, app_role_id, employee_no, job_title, sex, start_date, is_contacted_person, contacted_date, user_id
) values
  ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', null,
   'active', 'A太郎', true,  '10000000-0000-0000-0000-000000000002', 'A-001', 'HR', 'M', '2024-01-01', true, '2024-01-02', '<USER_A_UUID>'),
  ('e2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', null,
   'active', 'B花子', false, '10000000-0000-0000-0000-000000000001', 'B-001', 'Sales', 'F', '2024-01-01', false, null, '<USER_B_UUID>');