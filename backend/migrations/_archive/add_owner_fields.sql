-- Migration: Add mobile_money_coordinates and RCCM fields to owners table
-- Date: 2026-01-03
-- Purpose: Support Mon Compte Phase 1 enhancements

-- Add mobile_money_coordinates column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'mobile_money_coordinates'
    ) THEN
        ALTER TABLE owners ADD COLUMN mobile_money_coordinates VARCHAR(255);
        COMMENT ON COLUMN owners.mobile_money_coordinates IS 'Mobile Money account details (operator, number, account name)';
    END IF;
END $$;

-- Add rccm_number column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'owners' AND column_name = 'rccm_number'
    ) THEN
        ALTER TABLE owners ADD COLUMN rccm_number VARCHAR(100);
        COMMENT ON COLUMN owners.rccm_number IS 'RCCM registration number for legal entities (personne morale)';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'owners' 
  AND column_name IN ('mobile_money_coordinates', 'mobile_money_number', 'rccm_number')
ORDER BY column_name;

-- Example data format for reference
-- mobile_money_coordinates: '+229 XX XX XX XX (MTN)' or '+229 XX XX XX XX (Moov Money) - Nom Compte'
-- rccm_number: 'BJ-COT-01-2024-B12-00123' (Benin format) or similar for other countries
