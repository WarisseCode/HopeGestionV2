-- backend/db/migrations/create_intervention_tables.sql

-- 1. Create Providers Table
CREATE TABLE IF NOT EXISTS providers (
    id SERIAL PRIMARY KEY,
    owner_id INT DEFAULT NULL, -- Optional link to owner if provider is exclusive, null for global/shared (managed by admin/gestionnaire)
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100), -- Plomberie, Electricité, etc.
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Service Contracts Table
CREATE TABLE IF NOT EXISTS service_contracts (
    id SERIAL PRIMARY KEY,
    provider_id INT REFERENCES providers(id) ON DELETE SET NULL,
    owner_id INT, -- Owner who pays for the contract (or building_id linked)
    title VARCHAR(255) NOT NULL, -- e.g. "Contrat Maintenance Ascenseur"
    description TEXT,
    cost_monthly DECIMAL(10, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Upgrade Tickets Table
-- We use DO block to add columns if they don't exist to avoid errors on re-run
DO $$
BEGIN
    -- category
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='category') THEN
        ALTER TABLE tickets ADD COLUMN category VARCHAR(100);
    END IF;

    -- provider_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='provider_id') THEN
        ALTER TABLE tickets ADD COLUMN provider_id INT REFERENCES providers(id) ON DELETE SET NULL;
    END IF;

    -- costs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='cost_estimated') THEN
        ALTER TABLE tickets ADD COLUMN cost_estimated DECIMAL(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='cost_real') THEN
        ALTER TABLE tickets ADD COLUMN cost_real DECIMAL(10, 2) DEFAULT 0;
    END IF;

    -- photos (using JSONB array of strings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='photos_before') THEN
         ALTER TABLE tickets ADD COLUMN photos_before JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='photos_after') THEN
         ALTER TABLE tickets ADD COLUMN photos_after JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- urgency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='urgency') THEN
         ALTER TABLE tickets ADD COLUMN urgency VARCHAR(50) DEFAULT 'normal';
    END IF;

    -- requester info (if not linked to user_id directly, or for external requests)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='requester_name') THEN
         ALTER TABLE tickets ADD COLUMN requester_name VARCHAR(255);
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='requester_phone') THEN
         ALTER TABLE tickets ADD COLUMN requester_phone VARCHAR(50);
    END IF;

END $$;
