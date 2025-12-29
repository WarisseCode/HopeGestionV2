-- Migration : Création de la table documents (Coffre-fort numérique)
-- Date : 2025-12-28

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Propriétaire du document
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'pdf', 'image', 'word', 'excel', 'autre'
    url TEXT NOT NULL,
    taille VARCHAR(50), -- Ex: '2.5 MB'
    categorie VARCHAR(100) DEFAULT 'Autre', -- 'Contrat', 'Quittance', 'Facture', 'Identité', 'Autre'
    
    -- Liaison optionnelle avec d'autres entités
    entity_type VARCHAR(50), -- 'building', 'lot', 'tenant', 'payment'
    entity_id INTEGER,
    
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour recherche rapide
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_categorie ON documents(categorie);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);

-- Données de démo (Facultatif, pour tester si besoin)
-- INSERT INTO documents (user_id, nom, type, url, taille, categorie) 
-- VALUES (1, 'Exemple_Contrat.pdf', 'pdf', 'https://example.com/doc.pdf', '1.2 MB', 'Contrat');
