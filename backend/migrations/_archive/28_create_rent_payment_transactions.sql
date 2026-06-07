-- Migration: Rent Payment Transactions Table
-- Purpose: Track online rent payments via FedaPay (Mobile Money)

CREATE TABLE IF NOT EXISTS rent_payment_transactions (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES payment_schedules(id) ON DELETE CASCADE,
    lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    
    -- FedaPay Integration
    fedapay_transaction_id VARCHAR(255) UNIQUE,
    fedapay_reference VARCHAR(255),
    payment_url TEXT,
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, failed, cancelled, expired
    payment_method VARCHAR(50), -- mtn, moov, or NULL if not yet selected
    
    -- Metadata
    custom_metadata JSONB, -- Store additional FedaPay metadata
    error_message TEXT, -- Store error details if failed
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP -- When payment was confirmed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_schedule ON rent_payment_transactions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_lease ON rent_payment_transactions(lease_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_tenant ON rent_payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_status ON rent_payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_rent_payment_transactions_fedapay_id ON rent_payment_transactions(fedapay_transaction_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rent_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rent_payment_transactions_updated_at ON rent_payment_transactions;
CREATE TRIGGER trigger_update_rent_payment_transactions_updated_at
    BEFORE UPDATE ON rent_payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_rent_payment_transactions_updated_at();

-- Comments
COMMENT ON TABLE rent_payment_transactions IS 'Tracks online rent payment transactions via FedaPay';
COMMENT ON COLUMN rent_payment_transactions.status IS 'pending: awaiting payment, approved: paid successfully, failed: payment failed, cancelled: user cancelled, expired: link expired';
