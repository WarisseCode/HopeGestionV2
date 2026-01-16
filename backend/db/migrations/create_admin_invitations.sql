-- Migration: Create admin_invitations table
-- Date: 2026-01-16

CREATE TABLE IF NOT EXISTS admin_invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    invite_code VARCHAR(64) NOT NULL UNIQUE,
    invited_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_code ON admin_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);

COMMENT ON TABLE admin_invitations IS 'Stores secure invitation codes for creating new admin accounts';
