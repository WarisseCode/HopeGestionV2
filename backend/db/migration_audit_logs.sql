-- Migration: Create audit_logs table
-- Date: 2025-12-29
-- Description: Stores logs of user activities for security and transparency.

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Nullable because some system actions might not be tied to a specific user initially (e.g., failed login attempt with unknown user)
    user_name VARCHAR(255), -- Denormalized for easier display if user is deleted
    action VARCHAR(50) NOT NULL, -- e.g., 'LOGIN', 'CREATE_TENANT', 'DELETE_CONTRACT'
    entity_type VARCHAR(50), -- e.g., 'TENANT', 'CONTRACT', 'PAYMENT'
    entity_id UUID, -- The ID of the affected entity
    details JSONB, -- Flexible field for extra data (diffs, error messages, etc.)
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT, -- Browser/Device info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
