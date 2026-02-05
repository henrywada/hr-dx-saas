-- 部下のユーザーIDを確認してから実行
UPDATE employees
SET 
    division_id = 'cccc27a5-4054-4fb7-beaa-600f456d88d3',
    group_name = '採用チーム'
WHERE id IN ('dc679328-ce0f-4725-ad7e-9d0093428459', 'a41accf4-320b-407d-8c53-2d34b071b0ab', '7ba9e5df-315b-45f4-8180-8260b910e95f');