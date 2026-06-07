-- Add updated_at column to leases table
ALTER TABLE leases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
