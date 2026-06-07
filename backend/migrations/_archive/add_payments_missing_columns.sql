-- Migration: Add missing columns to payments table
-- Date: 2026-02-13
-- Description: Adds schedule_id and description columns to payments table
-- These columns are required by the schedule payment (encaisser) feature

-- Add schedule_id column (links payment to a payment_schedule)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'schedule_id') THEN
        ALTER TABLE payments ADD COLUMN schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add description column
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'description') THEN
        ALTER TABLE payments ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add owner_id if missing (should exist from migration_multi_owner, but just in case)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'owner_id') THEN
        ALTER TABLE payments ADD COLUMN owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for faster lookups by schedule
CREATE INDEX IF NOT EXISTS idx_payments_schedule ON payments(schedule_id);
