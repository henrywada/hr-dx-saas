-- 1. Create app_role_group table
CREATE TABLE IF NOT EXISTS app_role_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid, -- Constraint added later to handle circular dependency
  name text,
  app_role text
);

COMMENT ON TABLE app_role_group IS 'アプリケーションロールグループ';
COMMENT ON COLUMN app_role_group.service_id IS 'サービスID';
COMMENT ON COLUMN app_role_group.name IS 'グループ名';
COMMENT ON COLUMN app_role_group.app_role IS 'ロール';

-- 2. Update service_category
ALTER TABLE service_category 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

COMMENT ON COLUMN service_category.sort_order IS 'ソート順';

-- 3. Update service
ALTER TABLE service 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS route_path TEXT,
ADD COLUMN IF NOT EXISTS release_status TEXT CHECK (release_status IN ('released', 'unreleased')),
ADD COLUMN IF NOT EXISTS target_audience TEXT CHECK (target_audience IN ('all_users', 'admins_only')),
ADD COLUMN IF NOT EXISTS app_role_group_id UUID REFERENCES app_role_group(id);

COMMENT ON COLUMN service.sort_order IS 'ソート順';
COMMENT ON COLUMN service.route_path IS '遷移先パス';
COMMENT ON COLUMN service.release_status IS 'リリース状況 (released/unreleased)';
COMMENT ON COLUMN service.target_audience IS '利用対象 (all_users/admins_only)';
COMMENT ON COLUMN service.app_role_group_id IS '管理者ロールグループID';

-- 4. Add FK to app_role_group (Circular dependency resolution)
ALTER TABLE app_role_group
ADD CONSTRAINT fk_app_role_group_service
FOREIGN KEY (service_id) REFERENCES service(id);

-- 5. RLS Policies for app_role_group
ALTER TABLE app_role_group ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Global read access for app_role_group"
  ON app_role_group FOR SELECT
  TO authenticated
  USING (true);

-- Developers can manage app_role_group (using existing is_developer function)
CREATE POLICY "Developers can manage app_role_group"
  ON app_role_group
  FOR ALL
  TO authenticated
  USING (is_developer())
  WITH CHECK (is_developer());
