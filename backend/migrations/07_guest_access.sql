-- Add Guest Access fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS access_key VARCHAR(50) UNIQUE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS access_key_expires_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Index for faster lookup by access key
CREATE INDEX IF NOT EXISTS idx_users_access_key ON users(access_key);
