-- Migration: Complete fix for payments table - Add ALL missing columns
-- This ensures production database has all columns expected by the code

-- Linking to payment schedules (for installments)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE SET NULL;

-- Description/Notes
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;

-- Owner relationship (critical for multi-owner architecture)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id);

-- Ensure reference_transaction alias
-- Note: init.sql uses reference_transaction, but code expects it
-- No change needed if already exists

-- Indexes for performance
DO $$ BEGIN CREATE INDEX idx_payments_schedule ON payments(schedule_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_payments_owner ON payments(owner_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX idx_payments_lease ON payments(lease_id); EXCEPTION WHEN duplicate_table THEN NULL; END $$;
