-- Migration: Fix audit_logs ID types (UUID -> VARCHAR) to support Integer IDs
-- Date: 2025-12-29

ALTER TABLE audit_logs ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);
