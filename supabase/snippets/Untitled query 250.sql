-- あなたが管理できる従業員（同じdivisionまたはgroup）
SELECT 
    e.id,
    e.name,
    e.division_id,
    e.group_name,
    CASE 
        WHEN e.division_id = 'cccc27a5-4054-4fb7-beae-609f456d88d3' THEN '✓ 同じdivision'
        WHEN e.group_name = '採用チーム' THEN '✓ 同じgroup'
        ELSE '✗ 管轄外'
    END as relationship
FROM employees e
WHERE e.tenant_id IN (SELECT tenant_id FROM employees WHERE id = 'b9704aff-e993-4e5f-831c-58f31c736490')
  AND e.id != 'b9704aff-e993-4e5f-831c-58f31c736490'
ORDER BY relationship DESC, e.name;