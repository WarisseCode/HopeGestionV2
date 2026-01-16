-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
    schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL, -- especes, virement, cheque, mobile_money
    reference VARCHAR(100),
    type VARCHAR(50) NOT NULL DEFAULT 'loyer', -- loyer, caution, charge, autre
    statut VARCHAR(20) DEFAULT 'valide', -- valide, en_attente, rejete, annule
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_payments_lease_id ON payments(lease_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_statut ON payments(statut);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
