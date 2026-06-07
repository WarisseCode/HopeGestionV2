-- Migration: Finalisation Module I (Audit Log & Rôles manquants)
-- Date: 2025-12-25

-- 1. Ajout des nouveaux rôles dans owner_user
-- Comme PostgreSQL ne permet pas de modifier une contrainte CHECK facilement sans la supprimer, 
-- on va la mettre à jour pour inclure les nouveaux types d'utilisateurs.

ALTER TABLE owner_user DROP CONSTRAINT IF EXISTS owner_user_role_check;
ALTER TABLE owner_user ADD CONSTRAINT owner_user_role_check 
CHECK (role IN ('owner', 'manager', 'accountant', 'agent', 'viewer', 'recovery_agent', 'external_manager', 'service_partner'));

-- 2. Création de la table audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    action VARCHAR(255) NOT NULL,
    module VARCHAR(100),
    target_id INTEGER, -- ID de l'objet affecté (bien, locataire, etc.)
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 3. Ajout de colonnes de permissions supplémentaires si nécessaire
-- La table owner_user a déjà quelques colonnes, on peut en rajouter pour plus de granularité
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='owner_user' AND column_name='can_manage_users') THEN
        ALTER TABLE owner_user ADD COLUMN can_manage_users BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='owner_user' AND column_name='can_delete_data') THEN
        ALTER TABLE owner_user ADD COLUMN can_delete_data BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='owner_user' AND column_name='can_access_audit_logs') THEN
        ALTER TABLE owner_user ADD COLUMN can_access_audit_logs BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
