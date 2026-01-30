-- Drop foreign key from service table
ALTER TABLE service DROP COLUMN IF EXISTS app_role_group_id;

-- Drop app_role_group table
DROP TABLE IF EXISTS app_role_group;

-- Create app_role table
CREATE TABLE app_role (
    app_role text PRIMARY KEY,
    name text NOT NULL
);

-- Enable RLS for app_role
ALTER TABLE app_role ENABLE ROW LEVEL SECURITY;

-- Create policies for app_role
CREATE POLICY "Global read access for app_role"
    ON app_role FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Developers can manage app_role"
    ON app_role FOR ALL
    TO authenticated
    USING (is_developer())
    WITH CHECK (is_developer());

-- Create app_role_service table
CREATE TABLE app_role_service (
    app_role text REFERENCES app_role(app_role) ON DELETE CASCADE,
    service_id uuid REFERENCES service(id) ON DELETE CASCADE,
    PRIMARY KEY (app_role, service_id)
);

-- Enable RLS for app_role_service
ALTER TABLE app_role_service ENABLE ROW LEVEL SECURITY;

-- Create policies for app_role_service
CREATE POLICY "Global read access for app_role_service"
    ON app_role_service FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Developers can manage app_role_service"
    ON app_role_service FOR ALL
    TO authenticated
    USING (is_developer())
    WITH CHECK (is_developer());
