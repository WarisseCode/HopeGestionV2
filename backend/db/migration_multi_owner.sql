-- Migration: Multi-propriétaire Architecture (PostgreSQL)
-- Date: 2025-12-24
-- Description: Ajoute la gestion multi-propriétaires avec isolation des données

-- ============================================
-- 1. TABLE OWNERS (Propriétaires)
-- ============================================
CREATE TABLE IF NOT EXISTS owners (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    phone VARCHAR(20) NOT NULL UNIQUE,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Bénin',
    id_number VARCHAR(100), -- Numéro de pièce d'identité ou RCCM
    photo VARCHAR(255),
    mobile_money_number VARCHAR(20),
    management_mode VARCHAR(20) DEFAULT 'direct' CHECK (management_mode IN ('direct', 'delegated')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);
CREATE INDEX IF NOT EXISTS idx_owners_is_active ON owners(is_active);

-- ============================================
-- 2. TABLE OWNER_USER (Liaison Propriétaire-Utilisateur)
-- ============================================
CREATE TABLE IF NOT EXISTS owner_user (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'manager', 'accountant', 'agent', 'viewer')),
    can_view_finances BOOLEAN DEFAULT FALSE,
    can_edit_properties BOOLEAN DEFAULT FALSE,
    can_manage_tenants BOOLEAN DEFAULT FALSE,
    can_manage_contracts BOOLEAN DEFAULT FALSE,
    can_validate_payments BOOLEAN DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (owner_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_owner_user_owner_id ON owner_user(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_user_user_id ON owner_user(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_user_is_active ON owner_user(is_active);

-- ============================================
-- 3. MODIFICATION TABLE USERS
-- ============================================
-- Ajouter colonnes pour multi-agence et rôles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='agency_id') THEN
        ALTER TABLE users ADD COLUMN agency_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_super_admin') THEN
        ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);

-- ============================================
-- 4. MODIFICATION TABLES EXISTANTES (Ajouter owner_id)
-- ============================================

-- Table buildings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='buildings' AND column_name='owner_id') THEN
        ALTER TABLE buildings ADD COLUMN owner_id INTEGER;
        ALTER TABLE buildings ADD CONSTRAINT fk_buildings_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_buildings_owner ON buildings(owner_id);
    END IF;
END $$;

-- Table lots
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lots' AND column_name='owner_id') THEN
        ALTER TABLE lots ADD COLUMN owner_id INTEGER;
        ALTER TABLE lots ADD CONSTRAINT fk_lots_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_lots_owner ON lots(owner_id);
    END IF;
END $$;

-- Table tenants
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tenants' AND column_name='owner_id') THEN
        ALTER TABLE tenants ADD COLUMN owner_id INTEGER;
        ALTER TABLE tenants ADD CONSTRAINT fk_tenants_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
    END IF;
END $$;

-- Table leases
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leases' AND column_name='owner_id') THEN
        ALTER TABLE leases ADD COLUMN owner_id INTEGER;
        ALTER TABLE leases ADD CONSTRAINT fk_leases_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_leases_owner ON leases(owner_id);
    END IF;
END $$;

-- Table payments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='owner_id') THEN
        ALTER TABLE payments ADD COLUMN owner_id INTEGER;
        ALTER TABLE payments ADD CONSTRAINT fk_payments_owner FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_id);
    END IF;
END $$;

-- ============================================
-- 5. DONNÉES DE DÉMONSTRATION
-- ============================================

-- Propriétaire par défaut (pour migration des données existantes)
INSERT INTO owners (name, first_name, phone, email, type, management_mode, is_active)
VALUES 
('OTCHADE', 'Warisse', '+22997000000', 'warissecodeman@gmail.com', 'individual', 'direct', TRUE),
('KOFFI', 'Jean', '+22997111111', 'jean.koffi@example.com', 'individual', 'direct', TRUE),
('IMMOBILIER PLUS', NULL, '+22997222222', 'contact@immobilierplus.bj', 'company', 'delegated', TRUE)
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- 6. VUES UTILES
-- ============================================

-- Vue: Propriétaires avec nombre de biens
CREATE OR REPLACE VIEW v_owners_summary AS
SELECT 
    o.id,
    o.name,
    o.first_name,
    o.phone,
    o.email,
    o.type,
    o.management_mode,
    o.is_active,
    COUNT(DISTINCT b.id) as total_properties,
    COUNT(DISTINCT l.id) as total_lots,
    COUNT(DISTINCT t.id) as total_tenants
FROM owners o
LEFT JOIN buildings b ON o.id = b.owner_id
LEFT JOIN lots l ON o.id = l.owner_id
LEFT JOIN tenants t ON o.id = t.owner_id
GROUP BY o.id, o.name, o.first_name, o.phone, o.email, o.type, o.management_mode, o.is_active;

-- Vue: Utilisateurs avec leurs propriétaires
CREATE OR REPLACE VIEW v_user_owners AS
SELECT 
    u.id as user_id,
    u.nom as user_name,
    u.email as user_email,
    u.role as user_role,
    o.id as owner_id,
    o.name as owner_name,
    o.type as owner_type,
    ou.role as assignment_role,
    ou.can_view_finances,
    ou.can_edit_properties,
    ou.can_manage_tenants,
    ou.is_active as assignment_active
FROM users u
INNER JOIN owner_user ou ON u.id = ou.user_id
INNER JOIN owners o ON ou.owner_id = o.id
WHERE ou.is_active = TRUE;

-- ============================================
-- 7. FONCTION POUR AFFECTER UN UTILISATEUR
-- ============================================

CREATE OR REPLACE FUNCTION sp_assign_user_to_owner(
    p_owner_id INTEGER,
    p_user_id INTEGER,
    p_role VARCHAR(50),
    p_start_date DATE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
    VALUES (p_owner_id, p_user_id, p_role, p_start_date, TRUE)
    ON CONFLICT (owner_id, user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        start_date = EXCLUDED.start_date,
        is_active = TRUE,
        end_date = NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MESSAGE DE CONFIRMATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration Multi-propriétaire terminée avec succès!';
    RAISE NOTICE '📊 Tables créées: owners, owner_user';
    RAISE NOTICE '🔧 Colonnes ajoutées: owner_id dans buildings, lots, tenants, leases, payments';
    RAISE NOTICE '📈 Vues créées: v_owners_summary, v_user_owners';
    RAISE NOTICE '🎯 Données de démo: 3 propriétaires insérés';
END $$;
