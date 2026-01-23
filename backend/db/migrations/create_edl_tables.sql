-- Migration: Création des tables pour le Module États des Lieux (EDL)
-- Date: 2026-01-23

-- Table principale: edl_inspections
-- Stocke les inspections (états des lieux d'entrée, sortie, intermédiaire)
CREATE TABLE IF NOT EXISTS edl_inspections (
    id SERIAL PRIMARY KEY,
    ref_edl VARCHAR(50) UNIQUE NOT NULL, -- ex: EDL-2025-001
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES baux(id) ON DELETE SET NULL, -- Optionnel, lié au bail
    type_edl VARCHAR(20) NOT NULL CHECK (type_edl IN ('entree', 'sortie', 'intermediaire')),
    date_realisation TIMESTAMP NOT NULL DEFAULT NOW(),
    agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    agent_name VARCHAR(255), -- Snapshot du nom au moment de la création
    locataire_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    locataire_name VARCHAR(255), -- Snapshot
    locataire_present BOOLEAN DEFAULT true,
    statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'signe', 'cloture', 'archive')),
    commentaires TEXT,
    
    -- Signatures électroniques (JSON avec métadonnées)
    -- Format: { "agent": { "date": "...", "ip": "...", "signature_url": "..." }, "locataire": {...} }
    signatures_json JSONB DEFAULT '{}'::jsonb,
    
    -- Lien vers EDL d'entrée (si c'est une sortie, pour comparaison)
    parent_edl_id INTEGER REFERENCES edl_inspections(id) ON DELETE SET NULL,
    
    -- Dates de validation
    validated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table des items inspectés dans un EDL
CREATE TABLE IF NOT EXISTS edl_items (
    id SERIAL PRIMARY KEY,
    edl_id INTEGER REFERENCES edl_inspections(id) ON DELETE CASCADE,
    
    -- Lien sémantique avec l'inventaire (optionnel, peut être null si élément ajouté manuellement)
    inventory_item_id INTEGER, -- Lien sémantique (FK retirée car table manquante potentiellement)
    
    -- Snapshots des données au moment de l'inspection
    piece VARCHAR(100) NOT NULL, -- ex: 'Salon', 'Cuisine', 'Chambre 1'
    categorie VARCHAR(100), -- ex: 'Menuiserie', 'Electricité'
    nom VARCHAR(255) NOT NULL, -- ex: 'Porte d'entrée', 'Prise électrique'
    description TEXT, -- Marque, détails
    
    -- État constaté lors de l'inspection
    etat VARCHAR(20) NOT NULL CHECK (etat IN ('neuf', 'bon', 'usager', 'mauvais', 'hs')),
    quantite INTEGER DEFAULT 1,
    observation TEXT, -- Défauts, dégâts constatés
    
    -- Preuves visuelles (URLs ou base64)
    photos JSONB DEFAULT '[]'::jsonb, -- Array d'URLs
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_edl_lot ON edl_inspections(lot_id);
CREATE INDEX IF NOT EXISTS idx_edl_location ON edl_inspections(location_id);
CREATE INDEX IF NOT EXISTS idx_edl_type ON edl_inspections(type_edl);
CREATE INDEX IF NOT EXISTS idx_edl_statut ON edl_inspections(statut);
CREATE INDEX IF NOT EXISTS idx_edl_parent ON edl_inspections(parent_edl_id);
CREATE INDEX IF NOT EXISTS idx_edl_items_edl ON edl_items(edl_id);
CREATE INDEX IF NOT EXISTS idx_edl_items_piece ON edl_items(piece);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_edl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_edl_inspections_updated_at
    BEFORE UPDATE ON edl_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_edl_updated_at();

CREATE TRIGGER trigger_edl_items_updated_at
    BEFORE UPDATE ON edl_items
    FOR EACH ROW
    EXECUTE FUNCTION update_edl_updated_at();

-- Séquence pour la génération de référence EDL
CREATE SEQUENCE IF NOT EXISTS edl_ref_seq START 1;

COMMENT ON TABLE edl_inspections IS 'Module VIII - États des lieux (Entrée/Sortie/Intermédiaire)';
COMMENT ON TABLE edl_items IS 'Items inspectés lors d''un état des lieux';
