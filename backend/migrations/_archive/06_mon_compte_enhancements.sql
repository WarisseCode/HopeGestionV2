-- Migration: Mon Compte Enhancements (Phase 11)
-- Purpose: Support richer owner profiles and secure user invitations.

-- 1. Add missing fields to 'owners' table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'secondary_phone') THEN
        ALTER TABLE owners ADD COLUMN secondary_phone VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'photo_url') THEN
        ALTER TABLE owners ADD COLUMN photo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'country') THEN
        ALTER TABLE owners ADD COLUMN country VARCHAR(100) DEFAULT 'Bénin';
    END IF;
    
    -- Ensure mobile_money_coordinates exists (from previous checks, might be missing if migration wasn't run)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'owners' AND column_name = 'mobile_money_coordinates') THEN
         ALTER TABLE owners ADD COLUMN mobile_money_coordinates VARCHAR(255);
    END IF;
END $$;

-- 2. Create 'user_invitations' table
CREATE TABLE IF NOT EXISTS user_invitations (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    issuer_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Who sent the invite
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE, -- Optional: Link to specific owner for delegation
    permissions JSONB DEFAULT '{}', -- Store initial permissions for delegation
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
