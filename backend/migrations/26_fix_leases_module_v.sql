-- Migration: Add missing columns to leases table for Module V (Locations)
-- Purpose: Add payment frequency, sale-specific fields, and payment tracking

-- Payment frequency (mensuel, trimestriel, annuel, etc.)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS frequence_paiement VARCHAR(20) DEFAULT 'mensuel';

-- Sale/Reservation specific fields
ALTER TABLE leases ADD COLUMN IF NOT EXISTS apport_initial DECIMAL(15,2);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS modalite_paiement VARCHAR(50);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_expiration DATE;

-- Payment tracking
ALTER TABLE leases ADD COLUMN IF NOT EXISTS next_payment_date DATE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS total_paid DECIMAL(15,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS balance_due DECIMAL(15,2) DEFAULT 0;

-- Confirmation
SELECT 'Migration 26_fix_leases_module_v.sql completed successfully' as status;
