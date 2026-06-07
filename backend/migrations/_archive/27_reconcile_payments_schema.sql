-- Migration: Reconcile Payments Schema (English -> French)
-- Date: 2026-02-10
-- Description: Standardizes payments table to use French column names as expected by backend code.

DO $$
BEGIN
    -- 1. amount -> montant
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount') THEN
        ALTER TABLE payments RENAME COLUMN amount TO montant;
    END IF;

    -- 2. payment_date -> date_paiement
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_date') THEN
        ALTER TABLE payments RENAME COLUMN payment_date TO date_paiement;
    END IF;

    -- 3. payment_method -> mode_paiement
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method') THEN
        ALTER TABLE payments RENAME COLUMN payment_method TO mode_paiement;
    END IF;

    -- 4. reference -> reference_transaction
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reference') THEN
        ALTER TABLE payments RENAME COLUMN reference TO reference_transaction;
    END IF;

    -- 5. Add quittance_url if missing (for future use)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'quittance_url') THEN
        ALTER TABLE payments ADD COLUMN quittance_url TEXT;
    END IF;

END $$;
