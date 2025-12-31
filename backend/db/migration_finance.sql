-- Migration: Finance Module (PostgreSQL)
-- Date: 2025-12-31
-- Description: Adds Expenses, Mobile Money Transactions, and Payment Schedules tables.

-- ============================================
-- 1. TABLE EXPENSES (Dépenses)
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
    lot_id INTEGER REFERENCES lots(id) ON DELETE SET NULL,
    owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'Electricité', 'Eau', 'Réparation', 'Entretien', 'Impôts', 'Autre'
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    date_expense DATE DEFAULT CURRENT_DATE,
    supplier_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'paye', -- 'paye', 'en_attente', 'annule'
    proof_url TEXT, -- Lien vers facture/reçu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_building ON expenses(building_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date_expense);

-- ============================================
-- 2. TABLE MOBILE_MONEY_TRANSACTIONS (Transactions Mobile Money)
-- ============================================
-- Table technique pour logger toutes les interactions avec les API Mobile Money
CREATE TABLE IF NOT EXISTS mobile_money_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE, -- ID fourni par l'opérateur (ex: pay_12345)
    external_reference VARCHAR(255), -- Référence externe (si applicable)
    operator VARCHAR(50) NOT NULL, -- 'MTN', 'MOOV', 'CELTIPAY', 'KKIAPAY', 'FEDAPAY'
    phone_number VARCHAR(20) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'XOF',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'cancelled'
    transaction_type VARCHAR(50) NOT NULL, -- 'collection' (encaissement) ou 'payout' (décaissement)
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL, -- Lien optionnel vers un paiement de loyer
    expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL, -- Lien optionnel vers une dépense
    metadata JSONB, -- Données brutes de l'opérateur
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_momo_status ON mobile_money_transactions(status);
CREATE INDEX IF NOT EXISTS idx_momo_trans_id ON mobile_money_transactions(transaction_id);

-- ============================================
-- 3. TABLE PAYMENT_SCHEDULES (Échéanciers de Paiement)
-- ============================================
-- Pour gérer les paiements échelonnés (V.4 du cahier des charges)
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
    total_amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    amount_paid NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue'
    description VARCHAR(255), -- 'Tranche 1', 'Semaine 2', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_lease ON payment_schedules(lease_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON payment_schedules(due_date);

-- ============================================
-- 4. DONNÉES DE DÉMONSTRATION (Mock)
-- ============================================

-- Dépenses démo
INSERT INTO expenses (building_id, category, description, amount, date_expense, supplier_name)
VALUES 
((SELECT id FROM buildings LIMIT 1), 'Electricité', 'Facture SBEE Janvier', 25000, '2025-01-15', 'SBEE'),
((SELECT id FROM buildings LIMIT 1), 'Eau', 'Facture SONEB Janvier', 5000, '2025-01-12', 'SONEB')
ON CONFLICT DO NOTHING;

-- Message de confirmation migration
DO $$
BEGIN
    RAISE NOTICE '✅ Migration Finance terminée avec succès!';
    RAISE NOTICE '📊 Tables créées: expenses, mobile_money_transactions, payment_schedules';
END $$;
