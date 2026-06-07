-- Migration: Complete fix for lots table - Add ALL missing columns
-- This ensures production database has all columns expected by the code

-- Additional physical details
ALTER TABLE lots ADD COLUMN IF NOT EXISTS bloc VARCHAR(50);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS nbPieces INTEGER; -- fallback for nb_pieces

-- Financial details
ALTER TABLE lots ADD COLUMN IF NOT EXISTS periodicite VARCHAR(20) DEFAULT 'mensuel';
ALTER TABLE lots ADD COLUMN IF NOT EXISTS caution DECIMAL(15,2) DEFAULT 0;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS avance INTEGER DEFAULT 1;

-- Sale details
ALTER TABLE lots ADD COLUMN IF NOT EXISTS prix_vente DECIMAL(15,2);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS modalite_vente TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS duree_echelonnement INTEGER; -- in months

-- Availability
ALTER TABLE lots ADD COLUMN IF NOT EXISTS date_disponibilite DATE;

-- Ensure owner_id exists (added by migration_multi_owner.sql but good to be sure)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id);

-- Ensure previous columns exist
-- Some columns like surface, charges_mensuelles already exist in init.sql but let's be safe
-- Note: init.sql uses nb_pieces, but code sometimes uses nbPieces
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lots' AND column_name='nbpieces') THEN
        ALTER TABLE lots ADD COLUMN nbpieces INTEGER;
    END IF;
END $$;

-- Indexes for performance
DO $$ BEGIN CREATE INDEX idx_lots_building ON lots(building_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_lots_statut ON lots(statut); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_lots_owner ON lots(owner_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
