-- Add missing columns to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS description TEXT;

-- Create index for schedule_id
CREATE INDEX IF NOT EXISTS idx_payments_schedule_id ON payments(schedule_id);
