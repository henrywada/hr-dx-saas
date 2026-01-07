-- ヘルパー関数: 現在のユーザーのテナントIDを取得（パフォーマンス最適化とセキュリティ用）
CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id UUID;
BEGIN
  SELECT t.id INTO tenant_id
  FROM tenants t
  INNER JOIN employees e ON e.tenant_id = t.id
  WHERE e.id = auth.uid();
  
  RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLSの有効化（念の為再実行）
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_services ENABLE ROW LEVEL SECURITY;

-- ★重要: テナント分離ポリシー（他社のデータは絶対に見せない）

-- 1. Employees (社員情報)
CREATE POLICY "Users can view employees in their own tenant"
ON employees FOR SELECT
USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Users can update employees in their own tenant"
ON employees FOR UPDATE
USING (tenant_id = get_my_tenant_id());

-- 2. Divisions (部署)
CREATE POLICY "Users can view divisions in their own tenant"
ON divisions FOR SELECT
USING (tenant_id = get_my_tenant_id());

-- 3. Tenants (自社情報のみ参照可)
CREATE POLICY "Users can view own tenant info"
ON tenants FOR SELECT
USING (id = get_my_tenant_id());

-- 4. Tenant Services
CREATE POLICY "Users can view own tenant services"
ON tenant_services FOR SELECT
USING (tenant_id = get_my_tenant_id());