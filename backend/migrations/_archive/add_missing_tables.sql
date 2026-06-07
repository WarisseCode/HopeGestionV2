-- Migration pour ajouter les tables et colonnes manquantes en production
-- Exécuter avec: psql "votre_url_render" -f migrations/add_missing_tables.sql

-- Colonnes manquantes dans users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Table permission_matrix
CREATE TABLE IF NOT EXISTS permission_matrix (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    can_read BOOLEAN DEFAULT false,
    can_write BOOLEAN DEFAULT false,
    can_validate BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(role, module)
);

-- Table owner_user (délégation)
CREATE TABLE IF NOT EXISTS owner_user (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    can_view_finances BOOLEAN DEFAULT false,
    can_edit_properties BOOLEAN DEFAULT false,
    can_manage_tenants BOOLEAN DEFAULT false,
    can_manage_contracts BOOLEAN DEFAULT false,
    can_validate_payments BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_delete_data BOOLEAN DEFAULT false
);

-- Insertion des permissions par défaut pour les rôles principaux
INSERT INTO permission_matrix (role, module, can_read, can_write, can_validate, can_delete)
VALUES 
    ('admin', 'biens', true, true, true, true),
    ('admin', 'locataires', true, true, true, true),
    ('admin', 'finance', true, true, true, true),
    ('admin', 'contrats', true, true, true, true),
    ('admin', 'documents', true, true, true, true),
    ('admin', 'users', true, true, true, true),
    ('admin', 'owners', true, true, true, true),
    ('gestionnaire', 'biens', true, true, false, false),
    ('gestionnaire', 'locataires', true, true, false, false),
    ('gestionnaire', 'finance', true, true, true, false),
    ('gestionnaire', 'contrats', true, true, false, false),
    ('gestionnaire', 'documents', true, true, false, false),
    ('gestionnaire', 'users', true, false, false, false),
    ('proprietaire', 'biens', true, true, false, false),
    ('proprietaire', 'locataires', true, true, false, false),
    ('proprietaire', 'finance', true, true, true, false),
    ('proprietaire', 'contrats', true, true, false, false),
    ('proprietaire', 'documents', true, true, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- Confirmation
SELECT 'Migration completed successfully!' as status;
