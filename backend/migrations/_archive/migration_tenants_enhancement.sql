-- Migration: Amélioration table Locataires (Support Acheteurs & Statuts)
-- Date: 2025-12-28

-- 1. Ajout du type (Locataire, Acheteur)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='type') THEN
        ALTER TABLE tenants ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'Locataire';
    END IF;
END $$;

-- 2. Ajout du statut (Actif, Inactif, Archivé)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='statut') THEN
        ALTER TABLE tenants ADD COLUMN statut VARCHAR(50) DEFAULT 'Actif';
    END IF;
END $$;

-- 3. Ajout préférence paiement
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='mode_paiement_preferentiel') THEN
        ALTER TABLE tenants ADD COLUMN mode_paiement_preferentiel VARCHAR(50);
    END IF;
END $$;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(type);
CREATE INDEX IF NOT EXISTS idx_tenants_statut ON tenants(statut);
