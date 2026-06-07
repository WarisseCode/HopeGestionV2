-- Add signature_url to leases table
ALTER TABLE leases ADD COLUMN IF NOT EXISTS signature_url VARCHAR(255);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_signature_electronique TIMESTAMP;
