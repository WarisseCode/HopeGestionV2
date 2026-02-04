-- Migration: Complete fix for leases table - Add ALL missing columns
-- This ensures production database has all columns expected by the code

-- Owner relationship (critical for multi-owner architecture)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id);

-- Contract type (location, vente, reservation)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS type_contrat VARCHAR(20) DEFAULT 'location';

-- Sale-specific fields
ALTER TABLE leases ADD COLUMN IF NOT EXISTS prix_vente DECIMAL(15,2);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS conditions_particulieres TEXT;

-- Charges type
ALTER TABLE leases ADD COLUMN IF NOT EXISTS type_charges VARCHAR(20) DEFAULT 'forfait';

-- Ensure all previous migration columns exist too
ALTER TABLE leases ADD COLUMN IF NOT EXISTS reference_bail VARCHAR(50);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS duree_contrat INTEGER;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS devise VARCHAR(10) DEFAULT 'XOF';
ALTER TABLE leases ADD COLUMN IF NOT EXISTS type_paiement VARCHAR(20) DEFAULT 'classique';
ALTER TABLE leases ADD COLUMN IF NOT EXISTS jour_echeance INTEGER DEFAULT 1;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS penalite_retard DECIMAL(5,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS tolerance_jours INTEGER DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS caution DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS avance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS charges_mensuelles DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS contrat_genere BOOLEAN DEFAULT FALSE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_signature DATE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS renouvelable BOOLEAN DEFAULT TRUE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS motif_resiliation TEXT;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_resiliation DATE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS gestionnaire_id INTEGER REFERENCES users(id);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS signature_url VARCHAR(255);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_signature_electronique TIMESTAMP;

-- Create payment_schedules table if not exists (MUST be before indexes)
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    numero_echeance INTEGER NOT NULL,
    date_echeance DATE NOT NULL,
    montant DECIMAL(12,2) NOT NULL,
    montant_paye DECIMAL(12,2) DEFAULT 0,
    statut VARCHAR(20) DEFAULT 'pending',
    date_paiement DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist in payment_schedules if it already existed
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS lease_id INTEGER;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS numero_echeance INTEGER;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS date_echeance DATE;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS montant DECIMAL(12,2);
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(12,2) DEFAULT 0;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'pending';
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS date_paiement DATE;

-- Add unique constraint if not exists (using DO block for safety)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payment_schedules_lease_id_numero_echeance_key'
    ) THEN
        ALTER TABLE payment_schedules ADD CONSTRAINT payment_schedules_lease_id_numero_echeance_key 
        UNIQUE(lease_id, numero_echeance);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Indexes for performance (with IF NOT EXISTS equivalent using DO blocks)
DO $$ BEGIN CREATE INDEX idx_leases_owner_id ON leases(owner_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_payment_schedules_lease ON payment_schedules(lease_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_payment_schedules_date ON payment_schedules(date_echeance); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_leases_statut ON leases(statut); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_leases_tenant ON leases(tenant_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_leases_lot ON leases(lot_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
