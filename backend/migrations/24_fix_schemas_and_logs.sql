-- Migration: Fix owner_user and audit_logs schemas
-- Purpose: Add missing columns that are causing 500 errors during owner creation

-- 1. Add missing columns to owner_user
ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner';
ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- 2. Add missing columns to audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(50);

-- Confirmation
SELECT 'Migration 24_fix_schemas_and_logs.sql completed successfully' as status;
