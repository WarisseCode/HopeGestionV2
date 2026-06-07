-- Migration: Create password_reset_tokens table
-- Date: 2026-01-24
-- Description: Table for secure password reset tokens

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_id ON password_reset_tokens(user_id);

-- Comment
COMMENT ON TABLE password_reset_tokens IS 'Stores hashed password reset tokens with expiration and audit trail';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (never store plaintext)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (15 minutes from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (prevents reuse)';
