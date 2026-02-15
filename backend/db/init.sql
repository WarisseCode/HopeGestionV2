-- Initialisation de la base de données Hope Gestion V2
-- Basé sur le Cahier de Charge Waris2

-- 1. Table des Utilisateurs (Gestionnaires, Propriétaires, etc.)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL DEFAULT 'gestionnaire', -- 'gestionnaire', 'proprietaire', 'locataire', 'admin', 'agent_recouvreur', 'comptable', 'partenaire_service'
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'gestionnaire', 'proprietaire', 'agent'
    telephone VARCHAR(50) UNIQUE NOT NULL, -- Numéro de téléphone comme identifiant principal
    avatar_url TEXT,
    statut VARCHAR(20) DEFAULT 'actif', -- 'actif', 'inactif', 'suspendu'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table des Immeubles (Buildings)
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Le gestionnaire créateur
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Maison', 'Immeuble', 'Résidence', 'Commerce'
    adresse TEXT NOT NULL,
    ville VARCHAR(100) NOT NULL,
    pays VARCHAR(100) DEFAULT 'Bénin',
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table des Lots (Units)
CREATE TABLE IF NOT EXISTS lots (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    ref_lot VARCHAR(50) NOT NULL, -- Ex: 'A01', 'B02'
    type VARCHAR(50) NOT NULL, -- 'Appartement', 'Studio', 'Boutique', 'Bureau'
    etage VARCHAR(50),
    surface NUMERIC(10, 2), -- en m2
    nb_pieces INTEGER,
    loyer_mensuel NUMERIC(15, 2) NOT NULL,
    charges_mensuelles NUMERIC(15, 2) DEFAULT 0,
    statut VARCHAR(50) DEFAULT 'disponible', -- 'disponible', 'occupe', 'travaux', 'reserve'
    description TEXT,
    photos TEXT[], -- Array d'URLs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table des Locataires (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenoms VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telephone_principal VARCHAR(50) NOT NULL, -- WhatsApp prioritaire
    telephone_secondaire VARCHAR(50),
    nationalite VARCHAR(100),
    type_piece VARCHAR(50), -- 'CNI', 'Passeport', 'CIP'
    numero_piece VARCHAR(100),
    photo_piece_url TEXT,
    photo_profil_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table des Baux / Contrats (Leases)
CREATE TABLE IF NOT EXISTS leases (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE RESTRICT,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE RESTRICT,
    date_debut DATE NOT NULL,
    date_fin DATE,
    loyer_actuel NUMERIC(15, 2) NOT NULL,
    caution_versee NUMERIC(15, 2) DEFAULT 0,
    avance_versee NUMERIC(15, 2) DEFAULT 0,
    jour_echeance INTEGER DEFAULT 5, -- Le loyer est dû le 5 du mois
    statut VARCHAR(50) DEFAULT 'actif', -- 'actif', 'resilie', 'expire'
    contrat_url TEXT, -- Lien vers le PDF du contrat
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table des Paiements (Payments)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES leases(id) ON DELETE CASCADE,
    montant NUMERIC(15, 2) NOT NULL,
    date_paiement DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL, -- 'Loyer', 'Caution', 'Charges', 'Avance'
    mode_paiement VARCHAR(50) NOT NULL, -- 'Mobile Money', 'Especes', 'Virement', 'Cheque'
    reference_transaction VARCHAR(255), -- ID Transaction MoMo
    statut VARCHAR(50) DEFAULT 'valide', -- 'valide', 'en_attente', 'annule'
    quittance_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Table des Interventions / Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    priorite VARCHAR(50) DEFAULT 'moyenne', -- 'basse', 'moyenne', 'haute', 'urgence'
    statut VARCHAR(50) DEFAULT 'ouvert', -- 'ouvert', 'en_cours', 'resolu'
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_resolution TIMESTAMP
);




-- Données de test (Seed) - DESACTIVÉ pour éviter la réinsertion en prod
-- Le compte admin est préservé via la migration si nécessaire, mais ici on évite les conflits

-- Utilisateur démo (optionnel, décommenter si besoin d'un admin par défaut)
INSERT INTO users (nom, email, password_hash, role, telephone) 
VALUES ('Waris Gestion', 'admin@hope.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456', 'gestionnaire', '+22997000000')
ON CONFLICT (email) DO NOTHING;

-- Les données de démonstration (Immeubles, Lots, Locataires...) ont été retirées
-- pour ne pas polluer la base de production lors des déploiements.

