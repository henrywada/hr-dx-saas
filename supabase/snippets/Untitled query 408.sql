-- あなた（マネージャー）とsample2の所属情報を比較
SELECT 
    'ログインユーザー' as type,
    id,
    name,
    is_manager,
    division_id,
    group_name
FROM employees
WHERE id = 'b9704aff-e993-4e5f-831c-58f31c736490'

UNION ALL

SELECT 
    'sample2' as type,
    id,
    name,
    is_manager,
    division_id,
    group_name
FROM employees
WHERE name = 'sample2';