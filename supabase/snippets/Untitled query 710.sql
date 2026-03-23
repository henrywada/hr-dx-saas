-- UUID拡張機能の有効化（PostgreSQL想定）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE service_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, -- テナント分離用
    employee_id UUID NOT NULL,
    service_type TEXT NOT NULL, -- 'stress_check', 'engagement_survey' 等
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 同じテナント内で、同一従業員に同じサービスが重複割り当てされないようユニーク制約
    UNIQUE(tenant_id, employee_id, service_type)
);

-- 検索パフォーマンス向上のためのインデックス
CREATE INDEX idx_service_assignments_tenant_employee ON service_assignments (tenant_id, employee_id);
CREATE INDEX idx_service_assignments_service_type ON service_assignments (service_type);