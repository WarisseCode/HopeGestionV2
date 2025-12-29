-- Migration: Fix audit_logs table (Add user_name)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
