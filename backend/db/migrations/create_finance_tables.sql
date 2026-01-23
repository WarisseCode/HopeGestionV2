-- Migration: Module Finance (Prêts & Fiscalité)
-- Date: 2026-01-23

-- Table: loans (Prêts bancaires / Financements)
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Nom de la banque ou du prêt
    amount NUMERIC(15, 2) NOT NULL, -- Capital emprunté
    interest_rate NUMERIC(5, 2), -- Taux d'intérêt annuel (%)
    duration_months INTEGER NOT NULL, -- Durée en mois
    start_date DATE NOT NULL,
    end_date DATE,
    
    monthly_payment NUMERIC(15, 2), -- Mensualité estimée
    payment_day INTEGER DEFAULT 5, -- Jour du prélèvement
    
    owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL, -- Qui rembourse
    building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL, -- Bien financé (optionnel)
    
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
    description TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: loan_schedule (Tableau d'amortissement / Échéances)
CREATE TABLE IF NOT EXISTS loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    
    due_date DATE NOT NULL,
    payment_date DATE, -- Date réelle de paiement
    
    amount_total NUMERIC(15, 2) NOT NULL, -- Total échéance
    amount_principal NUMERIC(15, 2), -- Part capital
    amount_interest NUMERIC(15, 2), -- Part intérêts
    amount_insurance NUMERIC(15, 2) DEFAULT 0, -- Assurance
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed')),
    
    transaction_ref VARCHAR(100), -- Lien transaction bancaire
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: tax_settings (Configuration fiscale par propriétaire)
CREATE TABLE IF NOT EXISTS tax_settings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
    
    country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
    fiscal_regime VARCHAR(100), -- ex: Foncier Réel, Micro-Foncier, LMNP...
    
    tax_rate NUMERIC(5, 2), -- Taux global d'imposition estimé
    vat_subject BOOLEAN DEFAULT FALSE, -- Assujetti TVA
    
    rental_tax_rate NUMERIC(5, 2) DEFAULT 0, -- Impôt revenus locatifs spécifique
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: expense_categories (Catégories de dépenses configurables)
-- Note: 'expenses' table exists but we might want standard categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- ex: Entretien, Taxe Foncière, Assurance...
    is_deductible BOOLEAN DEFAULT TRUE, -- Déductible fiscalement ?
    description TEXT
);

-- Insertion des catégories par défaut
INSERT INTO expense_categories (name, is_deductible) VALUES
('Travaux / Entretien', true),
('Assurance Immeuble', true),
('Assurance PNO', true),
('Taxe Foncière', true),
('Frais de Gestion', true),
('Frais Juridiques', true),
('Frais Bancaires', true),
('Eau / Electricité (Partie Commune)', true),
('Gardiennage', true),
('Autre', false)
ON CONFLICT (name) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_owner ON loans(owner_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON loan_payments(due_date);
