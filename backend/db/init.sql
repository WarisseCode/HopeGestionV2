-- 1. Table UTILISATEURS (Pour l'Authentification - Jour 2)
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe_hache VARCHAR(255) NOT NULL, -- Stockera le mot de passe hashé
    role VARCHAR(50) NOT NULL CHECK (role IN ('gestionnaire', 'locataire', 'bailleur')), -- Rôles essentiels
    prenom VARCHAR(100),
    nom VARCHAR(100),
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table BIENS (Biens Immobiliers - Jour 4) - VERSION CORRIGÉE
CREATE TABLE IF NOT EXISTS biens (
    id SERIAL PRIMARY KEY,
    id_gestionnaire INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, -- Important: Supprimer le bien si le gestionnaire est supprimé
    
    -- Colonnes ajoutées/modifiées pour correspondre au code TypeScript
    type_bien VARCHAR(100),            -- Ex: 'Appartement', 'Maison'
    adresse TEXT NOT NULL,
    ville VARCHAR(255),                -- <--- Colonne manquante
    code_postal VARCHAR(20),           -- <--- Colonne manquante
    nombre_pieces INTEGER DEFAULT 1,   -- <--- Colonne manquante
    surface_m2 NUMERIC(10, 2),         -- <--- Colonne manquante
    loyer_mensuel_initial NUMERIC(10, 2) NOT NULL, -- <--- Correspond à loyer_mensuel_initial
    
    statut_occupation VARCHAR(50) DEFAULT 'Disponible', -- Ex: 'Disponible', 'Occupé', 'En maintenance'
    date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- 3. Table LOCATAIRES (Locataires - Jour 3)
CREATE TABLE IF NOT EXISTS locataires (
    id SERIAL PRIMARY KEY,
    id_utilisateur INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE, -- Lien vers le compte utilisateur (pour login)
    numero_telephone VARCHAR(50),
    numero_piece_identite VARCHAR(100) UNIQUE, 
    -- Les champs nom/prénom sont dans la table 'utilisateurs' liée
    cree_a TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table BAUX (Contrats de location - Lien Locataire-Bien)
CREATE TABLE IF NOT EXISTS baux (
    id SERIAL PRIMARY KEY,
    id_bien INTEGER REFERENCES biens(id) ON DELETE CASCADE,
    id_locataire INTEGER REFERENCES locataires(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    statut VARCHAR(50) -- Ex: 'actif', 'termine'
);