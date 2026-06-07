-- Migration: Ajout du champ user_type à la table users
-- Date: 2025-12-27
-- Description: Ajoute la colonne user_type pour distinguer les différents types d'utilisateurs

-- Ajouter la colonne user_type si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_type') THEN
        ALTER TABLE users ADD COLUMN user_type VARCHAR(50) NOT NULL DEFAULT 'gestionnaire';
        RAISE NOTICE '✅ Colonne user_type ajoutée à la table users';
    ELSE
        RAISE NOTICE '⚠️ Colonne user_type déjà existante dans la table users';
    END IF;
    
    -- Si la colonne telephone n'existe pas, l'ajouter aussi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telephone') THEN
        ALTER TABLE users ADD COLUMN telephone VARCHAR(50);
        RAISE NOTICE '✅ Colonne telephone ajoutée à la table users';
    END IF;
    
    -- Si la colonne statut n'existe pas, l'ajouter aussi
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='statut') THEN
        ALTER TABLE users ADD COLUMN statut VARCHAR(20) DEFAULT 'actif';
        RAISE NOTICE '✅ Colonne statut ajoutée à la table users';
    END IF;
END $$;

-- Mettre à jour les anciens utilisateurs pour leur attribuer un user_type par défaut
UPDATE users SET user_type = 'gestionnaire' WHERE user_type IS NULL OR user_type = '';

-- Rendre la colonne telephone unique si ce n'est pas déjà le cas
DO $$
BEGIN
    -- Supprimer les éventuelles contraintes existantes
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_name='users_telephone_key') THEN
        ALTER TABLE users DROP CONSTRAINT users_telephone_key;
    END IF;
    
    -- Ajouter la contrainte d'unicité
    ALTER TABLE users ADD CONSTRAINT users_telephone_key UNIQUE (telephone);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Impossible d''ajouter la contrainte d''unicité sur la colonne telephone: %', SQLERRM;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '🎯 Migration du champ user_type terminée avec succès!';
    RAISE NOTICE '📊 La colonne user_type a été ajoutée à la table users';
    RAISE NOTICE '🔐 Les utilisateurs existants ont été mis à jour avec user_type = ''gestionnaire''';
END $$;