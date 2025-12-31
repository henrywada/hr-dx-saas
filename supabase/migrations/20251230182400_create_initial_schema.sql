-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contract_date DATE,
    paid_amount INTEGER DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    expired_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create divisions table
CREATE TABLE divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL
);

-- Create employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    division_id UUID REFERENCES divisions(id),
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'hr', 'hr_manager', 'doctor', 'company_nurse', 'boss', 'developer')),
    is_contracted_person BOOLEAN DEFAULT false,
    contracted_date DATE
);

-- Create services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    description TEXT
);

-- Create tenant_services table
CREATE TABLE tenant_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    service_id UUID NOT NULL REFERENCES services(id),
    start_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active'
);

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_services ENABLE ROW LEVEL SECURITY;
