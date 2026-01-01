-- Migration: Create Contracts Table
-- Table pour stocker les baux/contrats de location

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    tenant_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    loyer_mensuel DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'actif' CHECK (status IN ('actif', 'termine', 'expire', 'resilie')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches rapides
CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_lot ON contracts(lot_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(date_fin);
