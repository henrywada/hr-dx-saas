INSERT INTO app_role (app_role, name) VALUES
    ('hr', '人事')
ON CONFLICT (app_role) DO UPDATE SET name = EXCLUDED.name;