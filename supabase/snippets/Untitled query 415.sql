-- 本当にデータが入っているか、IDが合っているか確認する
SELECT 
    e.name as employee_name, 
    e.role, 
    t.name as tenant_name,
    e.id as employee_id
FROM public.employees e
LEFT JOIN public.tenants t ON e.tenant_id = t.id;