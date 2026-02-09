-- Migration: Fix tenants schema (add missing columns from Module Locataires update)
-- Purpose: Add address, document details, photos, and financial preferences

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS adresse_actuelle TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS date_expiration_piece DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS photo_profil_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS photo_piece_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS caution DECIMAL(15,2) DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS avance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paiement_echelonne BOOLEAN DEFAULT false;

-- Confirmation
SELECT 'Migration 25_fix_tenants_schema.sql completed successfully' as status;
