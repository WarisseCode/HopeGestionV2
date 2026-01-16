-- Migration: Enhance leases table for full lease management
-- Adds missing columns for complete bail/location functionality

-- Duration and contract details
ALTER TABLE leases ADD COLUMN IF NOT EXISTS duree_contrat INTEGER; -- In months
ALTER TABLE leases ADD COLUMN IF NOT EXISTS devise VARCHAR(10) DEFAULT 'XOF';
ALTER TABLE leases ADD COLUMN IF NOT EXISTS type_paiement VARCHAR(20) DEFAULT 'classique'; -- classique, echelonne

-- Payment schedule
ALTER TABLE leases ADD COLUMN IF NOT EXISTS jour_echeance INTEGER DEFAULT 1; -- Day of month (1-31)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS penalite_retard DECIMAL(5,2) DEFAULT 0; -- Percentage
ALTER TABLE leases ADD COLUMN IF NOT EXISTS tolerance_jours INTEGER DEFAULT 0; -- Grace period days

-- Financial details
ALTER TABLE leases ADD COLUMN IF NOT EXISTS caution DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS avance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS charges_mensuelles DECIMAL(12,2) DEFAULT 0;

-- Contract generation
ALTER TABLE leases ADD COLUMN IF NOT EXISTS contrat_genere BOOLEAN DEFAULT FALSE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_signature DATE;

-- Renewal and termination
ALTER TABLE leases ADD COLUMN IF NOT EXISTS renouvelable BOOLEAN DEFAULT TRUE;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS motif_resiliation TEXT;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS date_resiliation DATE;

-- Reference management
ALTER TABLE leases ADD COLUMN IF NOT EXISTS reference_bail VARCHAR(50);
ALTER TABLE leases ADD COLUMN IF NOT EXISTS gestionnaire_id INTEGER REFERENCES users(id);

-- Create payment_schedules table for echelonnement
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    numero_echeance INTEGER NOT NULL,
    date_echeance DATE NOT NULL,
    montant DECIMAL(12,2) NOT NULL,
    montant_paye DECIMAL(12,2) DEFAULT 0,
    statut VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, overdue
    date_paiement DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lease_id, numero_echeance)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_lease ON payment_schedules(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_date ON payment_schedules(date_echeance);
CREATE INDEX IF NOT EXISTS idx_leases_statut ON leases(statut);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_lot ON leases(lot_id);
