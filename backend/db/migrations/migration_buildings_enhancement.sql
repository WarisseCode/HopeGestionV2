-- Migration: Amélioration de la table buildings pour le sous-module Immeubles
-- Ajout des champs GPS, médias, gestionnaire et quartier

-- Coordonnées GPS
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Localisation africaine (quartier)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS quartier VARCHAR(100);

-- Gestionnaire responsable
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS gestionnaire_id INTEGER REFERENCES users(id);

-- Statut actif/inactif
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS statut VARCHAR(20) DEFAULT 'actif';

-- Médias: photos stockées en JSONB (array d'URLs)
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Vidéo optionnelle
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Plan de masse optionnel
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS plan_masse_url TEXT;

-- Nombre d'étages
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS nombre_etages INTEGER DEFAULT 1;

-- Index pour recherche géographique
CREATE INDEX IF NOT EXISTS idx_buildings_geo ON buildings(latitude, longitude);

-- Index pour recherche par gestionnaire
CREATE INDEX IF NOT EXISTS idx_buildings_gestionnaire ON buildings(gestionnaire_id);

-- Index pour recherche par quartier
CREATE INDEX IF NOT EXISTS idx_buildings_quartier ON buildings(quartier);

-- Commentaires
COMMENT ON COLUMN buildings.latitude IS 'Latitude GPS de l''immeuble';
COMMENT ON COLUMN buildings.longitude IS 'Longitude GPS de l''immeuble';
COMMENT ON COLUMN buildings.quartier IS 'Quartier/arrondissement (contexte africain)';
COMMENT ON COLUMN buildings.gestionnaire_id IS 'Utilisateur responsable de la gestion';
COMMENT ON COLUMN buildings.photos IS 'Array JSON des URLs des photos (max 10)';
COMMENT ON COLUMN buildings.video_url IS 'URL de la vidéo de présentation';
COMMENT ON COLUMN buildings.plan_masse_url IS 'URL du plan de masse';
