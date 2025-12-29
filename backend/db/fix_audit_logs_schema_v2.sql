-- Migration: Fix audit_logs table schema (ensure all columns exist)
-- Date: 2025-12-29

-- Ensure entity_type exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);

-- Ensure entity_id exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Ensure details exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB;

-- Ensure ip_address exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Ensure user_agent exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Ensure user_name exists (just in case)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- Ensure user_id exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;

-- Ensure action exists
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);
