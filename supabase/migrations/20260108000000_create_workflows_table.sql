-- Create workflows table with RLS and tenant isolation
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT get_my_tenant_id() REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. View own tenant's workflows
CREATE POLICY "Users can view workflows in their own tenant"
ON workflows FOR SELECT
USING (tenant_id = get_my_tenant_id());

-- 2. Create workflows for own tenant
-- Note: The DEFAULT get_my_tenant_id() handles the column value, 
-- but we also ensure the user isn't trying to spoof it if they pass it explicitly (though our action won't).
CREATE POLICY "Users can create workflows in their own tenant"
ON workflows FOR INSERT
WITH CHECK (tenant_id = get_my_tenant_id());

-- 3. Update own workflows
CREATE POLICY "Users can update workflows in their own tenant"
ON workflows FOR UPDATE
USING (tenant_id = get_my_tenant_id());

-- 4. Delete own workflows
CREATE POLICY "Users can delete workflows in their own tenant"
ON workflows FOR DELETE
USING (tenant_id = get_my_tenant_id());
