-- Migration: Support du Calendrier (Dates d'intervention)
-- Date: 2025-12-29

-- 1. Ajout de la date planifiée pour les tickets
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='scheduled_date') THEN
        ALTER TABLE tickets ADD COLUMN scheduled_date TIMESTAMP;
    END IF;
END $$;

-- 2. Index pour recherche rapide par date
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON tickets(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_leases_dates ON leases(date_debut, date_fin);
