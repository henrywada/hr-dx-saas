-- Insert Tenant
INSERT INTO tenants (id, name, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Demo Corp', now())
ON CONFLICT DO NOTHING;

-- Insert Division
INSERT INTO divisions (id, tenant_id, name)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sales Dept')
ON CONFLICT DO NOTHING;

-- Insert Service
INSERT INTO services (id, name, category, description)
VALUES ('33333333-3333-3333-3333-333333333333', 'HR Guardian', 'Risk Management', 'HR Risk Management Service')
ON CONFLICT DO NOTHING;

-- Insert Tenant Service
INSERT INTO tenant_services (tenant_id, service_id, status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'active'
)
ON CONFLICT DO NOTHING;

-- Note: Employees are not seeded here because they require a valid auth.users ID.
-- Please see walkthrough.md for the SQL to link your user.
