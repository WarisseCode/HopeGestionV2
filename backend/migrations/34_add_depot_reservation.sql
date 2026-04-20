-- Ajouter le montant du dépôt de réservation (5% du loyer) dans leases
ALTER TABLE leases ADD COLUMN IF NOT EXISTS montant_depot NUMERIC(15,2) DEFAULT 0;
