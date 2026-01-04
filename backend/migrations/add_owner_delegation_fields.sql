-- Add management mode fields to owners table
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS management_mode TEXT DEFAULT 'direct', -- 'direct' or 'delegated'
ADD COLUMN IF NOT EXISTS delegation_start_date DATE,
ADD COLUMN IF NOT EXISTS delegation_end_date DATE;
