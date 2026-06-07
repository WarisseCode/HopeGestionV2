-- Migration: Add missing roles to owner_user role check constraint
-- Date: 2026-01-07
-- Purpose: Allow French role names in owner_user table

-- 1. Drop the existing constraint
ALTER TABLE owner_user DROP CONSTRAINT IF EXISTS owner_user_role_check;

-- 2. Add new constraint with all allowed roles (English + French)
ALTER TABLE owner_user ADD CONSTRAINT owner_user_role_check 
    CHECK (role IN (
        'owner', 'manager', 'accountant', 'agent', 'viewer',  -- Original English
        'gestionnaire', 'comptable', 'agent_recouvreur', 'prestataire', 'admin'  -- French additions
    ));

-- Confirmation
DO $$ BEGIN RAISE NOTICE '✅ owner_user_role_check constraint updated with new roles'; END $$;
