-- Migration: Add missing columns to leases table for Module V (Locations)
-- Purpose: Add payment frequency and sale-specific fields

-- Payment frequency (mensuel, trimestriel, annuel, etc.)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS frequence_paiement VARCHAR(20) DEFAULT 'mensuel';

-- Sale/Reservation specific fields
ALTER TABLE leases ADD COLUMN IF NOT EXISTS apport_initial DECIMAL(15,2);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS modalite_paiement VARCHAR(50);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_expiration DATE;

-- Confirmation
SELECT 'Migration 26_fix_leases_module_v.sql completed successfully' as status;
