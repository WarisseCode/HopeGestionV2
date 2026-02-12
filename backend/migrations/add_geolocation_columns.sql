-- Ajouter les colonnes de géolocalisation pour le Catalogue Public
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

ALTER TABLE lots ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
