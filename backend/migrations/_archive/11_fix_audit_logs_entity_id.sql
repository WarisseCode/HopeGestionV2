-- Fix audit_logs table: change entity_id from UUID to VARCHAR
ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(50);
