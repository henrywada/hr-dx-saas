-- skill_approvers テーブルを employee_approvers にリネーム（機能横断で共用するため）
ALTER TABLE public.skill_approvers RENAME TO employee_approvers;

-- FK制約名をテーブル名に合わせてリネーム
ALTER TABLE public.employee_approvers RENAME CONSTRAINT skill_approvers_tenant_id_fkey   TO employee_approvers_tenant_id_fkey;
ALTER TABLE public.employee_approvers RENAME CONSTRAINT skill_approvers_employee_id_fkey TO employee_approvers_employee_id_fkey;
ALTER TABLE public.employee_approvers RENAME CONSTRAINT skill_approvers_approver_id_fkey TO employee_approvers_approver_id_fkey;
