-- Migration: Create user_owner_assignments table
-- Allows linking users (gestionnaires, agents) to specific owners they can manage

CREATE TABLE IF NOT EXISTS user_owner_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    UNIQUE(user_id, owner_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_owner_user ON user_owner_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_owner_owner ON user_owner_assignments(owner_id);

-- Add 'scope' column to users table to define access scope
-- 'all' = can see all owners (admin, manager)
-- 'assigned' = can only see assigned owners (gestionnaire, agent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_scope VARCHAR(20) DEFAULT 'assigned';

-- Update existing admins to have 'all' scope
UPDATE users SET access_scope = 'all' WHERE role IN ('admin', 'manager');
