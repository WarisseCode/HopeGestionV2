-- Migration: Add created_by column to users table
-- Date: 2026-01-12
-- Purpose: Track which user created each user account for data isolation

-- Add created_by column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- Add foreign key constraint (optional, for referential integrity)
ALTER TABLE users ADD CONSTRAINT fk_users_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- Confirmation
DO $$ BEGIN RAISE NOTICE '✅ created_by column added to users table'; END $$;
