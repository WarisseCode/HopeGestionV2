-- Migration: Assignments Enhancement (Support Vente & Réservation)
-- Ajout des champs nécessaires pour gérer les différents types d'affectation

ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS type_contrat VARCHAR(50) DEFAULT 'location', -- 'location', 'vente', 'reservation'
ADD COLUMN IF NOT EXISTS conditions_particulieres TEXT,
ADD COLUMN IF NOT EXISTS prix_vente NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS apport_initial NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS modalite_paiement VARCHAR(50), -- 'comptant', 'echelonne'
ADD COLUMN IF NOT EXISTS date_expiration DATE; -- Pour les réservations

-- Index pour recherche par type
CREATE INDEX IF NOT EXISTS idx_leases_type ON leases(type_contrat);
