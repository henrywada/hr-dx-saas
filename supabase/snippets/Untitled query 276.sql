-- pulse_alertsテーブルを作成
CREATE TABLE IF NOT EXISTS pulse_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    session_id UUID NOT NULL,
    intent_id UUID NOT NULL,
    calculated_score DECIMAL(3, 2) NOT NULL,
    threshold DECIMAL(3, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'acknowledged', 'resolved'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_session
        FOREIGN KEY (session_id)
        REFERENCES pulse_sessions(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_intent
        FOREIGN KEY (intent_id)
        REFERENCES pulse_intents(id)
        ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_tenant ON pulse_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_employee ON pulse_alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_status ON pulse_alerts(status);
CREATE INDEX IF NOT EXISTS idx_pulse_alerts_created ON pulse_alerts(created_at DESC);

-- RLSを有効化
ALTER TABLE pulse_alerts ENABLE ROW LEVEL SECURITY;

-- SELECTポリシー
DROP POLICY IF EXISTS "従業員は自社のアラートを参照できる" ON pulse_alerts;
CREATE POLICY "従業員は自社のアラートを参照できる"
ON pulse_alerts FOR SELECT TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM employees WHERE id = auth.uid()));

-- INSERTポリシー
DROP POLICY IF EXISTS "従業員は自社のアラートを作成できる" ON pulse_alerts;
CREATE POLICY "従業員は自社のアラートを作成できる"
ON pulse_alerts FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (SELECT tenant_id FROM employees WHERE id = auth.uid()));

-- UPDATEポリシー
DROP POLICY IF EXISTS "従業員は自社のアラートを更新できる" ON pulse_alerts;
CREATE POLICY "従業員は自社のアラートを更新できる"
ON pulse_alerts FOR UPDATE TO authenticated
USING (tenant_id IN (SELECT tenant_id FROM employees WHERE id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM employees WHERE id = auth.uid()));