-- Migration: Amélioration de la table lots pour le sous-module Lots
-- Ajout des données locatives, de vente, photos et nouveaux statuts

-- ===============================
-- DONNÉES LOCATIVES
-- ===============================

-- Périodicité de paiement (mensuel, trimestriel, annuel)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS periodicite VARCHAR(20) DEFAULT 'mensuel';

-- Caution (montant)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS caution DECIMAL(12,2) DEFAULT 0;

-- Avance (nombre de mois)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS avance INTEGER DEFAULT 1;

-- ===============================
-- DONNÉES DE VENTE
-- ===============================

-- Prix de vente
ALTER TABLE lots ADD COLUMN IF NOT EXISTS prix_vente DECIMAL(15,2);

-- Modalité de paiement (comptant, echelonne)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS modalite_vente VARCHAR(20);

-- Durée d'échelonnement (en mois)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS duree_echelonnement INTEGER;

-- Échéancier (JSONB pour stocker les détails)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS echeancier JSONB DEFAULT '[]'::jsonb;

-- ===============================
-- MÉDIAS
-- ===============================

-- Photos du lot (JSONB array d'URLs)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- ===============================
-- INFORMATIONS SUPPLÉMENTAIRES
-- ===============================

-- Bloc (pour les grands immeubles: A, B, C...)
ALTER TABLE lots ADD COLUMN IF NOT EXISTS bloc VARCHAR(50);

-- Mise à jour du statut avec nouvelles valeurs possibles
-- Les valeurs acceptées: libre, reserve, loue, vendu, hors_service
COMMENT ON COLUMN lots.statut IS 'Statut du lot: libre, reserve, loue, vendu, hors_service';

-- Date de mise en location/vente
ALTER TABLE lots ADD COLUMN IF NOT EXISTS date_disponibilite DATE;

-- ===============================
-- INDEX
-- ===============================

CREATE INDEX IF NOT EXISTS idx_lots_statut ON lots(statut);
CREATE INDEX IF NOT EXISTS idx_lots_type ON lots(type);
CREATE INDEX IF NOT EXISTS idx_lots_periodicite ON lots(periodicite);
