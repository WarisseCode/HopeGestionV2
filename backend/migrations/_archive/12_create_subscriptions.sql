-- Migration: Create Subscription Tables for Mobile Money SaaS
-- Module VIII: Abonnements

-- 1. Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Free', 'Pro', 'Enterprise'
    display_name VARCHAR(100), -- 'Gratuit', 'Professionnel', 'Entreprise'
    price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    duration_months INTEGER DEFAULT 1,
    max_properties INTEGER DEFAULT 5, -- Limit for Free plan
    max_tenants INTEGER DEFAULT 10,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Subscriptions Table  
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'pending_payment', 'canceled'
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Subscription Payments Table
CREATE TABLE IF NOT EXISTS subscription_payments (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    operator VARCHAR(50), -- 'MTN', 'MOOV', 'CELTIPAY'
    phone_number VARCHAR(20),
    transaction_reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);

-- 5. Seed Default Plans
INSERT INTO plans (name, display_name, price, duration_months, max_properties, max_tenants, features) VALUES
('free', 'Gratuit', 0, 0, 3, 5, '["Gestion basique", "3 biens max", "5 locataires max"]'),
('pro', 'Professionnel', 15000, 1, 20, 50, '["Gestion illimitée", "20 biens", "50 locataires", "Rapports avancés", "Support prioritaire"]'),
('enterprise', 'Entreprise', 50000, 1, -1, -1, '["Biens illimités", "Locataires illimités", "API Access", "Multi-agences", "Support dédié"]')
ON CONFLICT (name) DO NOTHING;

-- 6. Add plan_id to users table if not exists (for quick access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_plan_id') THEN
        ALTER TABLE users ADD COLUMN current_plan_id INTEGER REFERENCES plans(id) DEFAULT 1;
    END IF;
END $$;

-- Set default plan (Free) for existing users
UPDATE users SET current_plan_id = 1 WHERE current_plan_id IS NULL;
