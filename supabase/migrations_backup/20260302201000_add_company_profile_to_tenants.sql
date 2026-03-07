-- Migration: add_company_profile_to_tenants

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS company_name text,
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS mission_vision text,
ADD COLUMN IF NOT EXISTS culture_and_benefits text,
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
