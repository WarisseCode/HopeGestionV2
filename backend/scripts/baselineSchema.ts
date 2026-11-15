// backend/scripts/baselineSchema.ts
//
// RATTRAPAGE DU SCHÉMA (2026-11-15)
// ─────────────────────────────────────────────────────────────────────────────
// Pourquoi : une base créée depuis le dépôt (init.sql + runMigrations.ts) ne
// contenait pas 5 tables et 85 colonnes utilisées par le code (documents,
// tenant_access, buildings.owner_id, leases.reference_bail, lots.bloc, …). Elles
// avaient été créées en production par les anciens scripts SQL de
// backend/migrations/_archive/, passés à la main puis supprimés du dépôt.
// Conséquence : impossible de remonter une base neuve (nouveau serveur, base de
// test, restauration partielle) — 4 migrations échouaient et plusieurs pages
// répondaient 500.
//
// Comment ce SQL a été obtenu : les 64 scripts _archive (récupérés dans
// l'historique git) ont été rejoués sur une base vierge, puis comparés à une base
// construite depuis le dépôt ; la différence est transcrite ici avec les types et
// valeurs par défaut exacts de ces scripts.
//
// Sans effet sur la production : uniquement CREATE TABLE IF NOT EXISTS et
// ADD COLUMN IF NOT EXISTS. Aucune donnée modifiée, aucune règle RLS, aucune clé
// étrangère, aucun NOT NULL ajouté sur une table existante.
//
// S'y ajoutent, en fin de fichier, 7 colonnes utilisées par le code mais absentes
// de tout script (ajouts manuels en production).
//
// Exécuté deux fois par runMigrations.ts : en tête de liste (pour que les
// migrations suivantes trouvent leurs colonnes) et en fin de liste (tables créées
// entre-temps, d'où les blocs to_regclass(...) IS NOT NULL).
// ─────────────────────────────────────────────────────────────────────────────

export const BASELINE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_invitations (
    id SERIAL,
    email character varying(255) NOT NULL,
    invite_code character varying(64) NOT NULL,
    invited_by integer,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (email),
    UNIQUE (invite_code)
);

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL,
    reference character varying(50) NOT NULL,
    tenant_id integer,
    lot_id integer,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    loyer_mensuel numeric(12,2) NOT NULL,
    status character varying(20) DEFAULT 'actif'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    owner_id integer,
    PRIMARY KEY (id),
    UNIQUE (reference)
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL,
    user_id integer,
    nom character varying(255) NOT NULL,
    type character varying(50),
    url text NOT NULL,
    taille character varying(50),
    categorie character varying(100) DEFAULT 'Autre'::character varying,
    entity_type character varying(50),
    entity_id integer,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    owner_id integer,
    deleted_at timestamp without time zone,
    deleted_by integer,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tenant_access (
    id SERIAL,
    tenant_id integer,
    is_active boolean DEFAULT false,
    access_modules jsonb DEFAULT '{"contrat": true, "plaintes": true, "services": false, "paiements": true}'::jsonb,
    allow_online_payment boolean DEFAULT false,
    notification_channel character varying(20) DEFAULT 'whatsapp'::character varying,
    access_code character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    owner_id integer,
    PRIMARY KEY (id),
    UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS user_owner_assignments (
    id SERIAL,
    user_id integer NOT NULL,
    owner_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by integer,
    is_active boolean DEFAULT true,
    notes text,
    PRIMARY KEY (id),
    UNIQUE (user_id, owner_id)
);

DO $$ BEGIN
    IF to_regclass('public.buildings') IS NOT NULL THEN
        ALTER TABLE buildings
                ADD COLUMN IF NOT EXISTS latitude numeric(10,8),
                ADD COLUMN IF NOT EXISTS longitude numeric(11,8),
                ADD COLUMN IF NOT EXISTS quartier character varying(100),
                ADD COLUMN IF NOT EXISTS gestionnaire_id integer,
                ADD COLUMN IF NOT EXISTS statut character varying(20) DEFAULT 'actif'::character varying,
                ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS video_url text,
                ADD COLUMN IF NOT EXISTS plan_masse_url text,
                ADD COLUMN IF NOT EXISTS nombre_etages integer DEFAULT 1,
                ADD COLUMN IF NOT EXISTS owner_id integer,
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.edl_inspections') IS NOT NULL THEN
        ALTER TABLE edl_inspections
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.leases') IS NOT NULL THEN
        ALTER TABLE leases
                ADD COLUMN IF NOT EXISTS duree_contrat integer,
                ADD COLUMN IF NOT EXISTS devise character varying(10) DEFAULT 'XOF'::character varying,
                ADD COLUMN IF NOT EXISTS type_paiement character varying(20) DEFAULT 'classique'::character varying,
                ADD COLUMN IF NOT EXISTS penalite_retard numeric(5,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS tolerance_jours integer DEFAULT 0,
                ADD COLUMN IF NOT EXISTS caution numeric(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS avance numeric(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS charges_mensuelles numeric(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS contrat_genere boolean DEFAULT false,
                ADD COLUMN IF NOT EXISTS date_signature date,
                ADD COLUMN IF NOT EXISTS renouvelable boolean DEFAULT true,
                ADD COLUMN IF NOT EXISTS motif_resiliation text,
                ADD COLUMN IF NOT EXISTS date_resiliation date,
                ADD COLUMN IF NOT EXISTS reference_bail character varying(50),
                ADD COLUMN IF NOT EXISTS gestionnaire_id integer,
                ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS signature_url character varying(255),
                ADD COLUMN IF NOT EXISTS date_signature_electronique timestamp without time zone,
                ADD COLUMN IF NOT EXISTS type_contrat character varying(20) DEFAULT 'location'::character varying,
                ADD COLUMN IF NOT EXISTS prix_vente numeric(15,2),
                ADD COLUMN IF NOT EXISTS conditions_particulieres text,
                ADD COLUMN IF NOT EXISTS type_charges character varying(20) DEFAULT 'forfait'::character varying,
                ADD COLUMN IF NOT EXISTS frequence_paiement character varying(20) DEFAULT 'mensuel'::character varying,
                ADD COLUMN IF NOT EXISTS apport_initial numeric(15,2),
                ADD COLUMN IF NOT EXISTS modalite_paiement character varying(50),
                ADD COLUMN IF NOT EXISTS date_expiration date,
                ADD COLUMN IF NOT EXISTS next_payment_date date,
                ADD COLUMN IF NOT EXISTS last_payment_date date,
                ADD COLUMN IF NOT EXISTS total_paid numeric(15,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS balance_due numeric(15,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS montant_depot numeric(15,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS owner_id integer,
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.lots') IS NOT NULL THEN
        ALTER TABLE lots
                ADD COLUMN IF NOT EXISTS bloc character varying(50),
                ADD COLUMN IF NOT EXISTS periodicite character varying(20) DEFAULT 'mensuel'::character varying,
                ADD COLUMN IF NOT EXISTS caution numeric(15,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS avance integer DEFAULT 1,
                ADD COLUMN IF NOT EXISTS prix_vente numeric(15,2),
                ADD COLUMN IF NOT EXISTS modalite_vente text,
                ADD COLUMN IF NOT EXISTS duree_echelonnement integer,
                ADD COLUMN IF NOT EXISTS date_disponibilite date,
                ADD COLUMN IF NOT EXISTS echeancier jsonb DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS owner_id integer,
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.messages') IS NOT NULL THEN
        ALTER TABLE messages
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.mobile_money_transactions') IS NOT NULL THEN
        ALTER TABLE mobile_money_transactions
                ADD COLUMN IF NOT EXISTS owner_id integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.payment_schedules') IS NOT NULL THEN
        ALTER TABLE payment_schedules
                ADD COLUMN IF NOT EXISTS date_echeance date,
                ADD COLUMN IF NOT EXISTS montant numeric(12,2),
                ADD COLUMN IF NOT EXISTS montant_paye numeric(12,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS date_paiement date,
                ADD COLUMN IF NOT EXISTS owner_id integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.payments') IS NOT NULL THEN
        ALTER TABLE payments
                ADD COLUMN IF NOT EXISTS schedule_id integer,
                ADD COLUMN IF NOT EXISTS description text,
                ADD COLUMN IF NOT EXISTS owner_id integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.tasks') IS NOT NULL THEN
        ALTER TABLE tasks
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.tenants') IS NOT NULL THEN
        ALTER TABLE tenants
                ADD COLUMN IF NOT EXISTS adresse_actuelle text,
                ADD COLUMN IF NOT EXISTS date_expiration_piece date,
                ADD COLUMN IF NOT EXISTS paiement_echelonne boolean DEFAULT false,
                ADD COLUMN IF NOT EXISTS owner_id integer,
                ADD COLUMN IF NOT EXISTS type character varying(50) DEFAULT 'Locataire'::character varying,
                ADD COLUMN IF NOT EXISTS mode_paiement_preferentiel character varying(50),
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.tickets') IS NOT NULL THEN
        ALTER TABLE tickets
                ADD COLUMN IF NOT EXISTS scheduled_date timestamp without time zone,
                ADD COLUMN IF NOT EXISTS owner_id integer,
                ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone,
                ADD COLUMN IF NOT EXISTS deleted_by integer;
    END IF;
END $$;

-- Colonnes lues/écrites par le code mais créées par AUCUN script (ni init.sql, ni
-- migrations, ni _archive) : ajoutées à la main en production. Sans elles, sur une
-- base neuve : enregistrement d'un paiement, mise à jour d'un ticket, d'un immeuble,
-- d'un lot ou d'un contact, retrait d'un utilisateur et config Mobile Money échouent.
DO $$ BEGIN
    IF to_regclass('public.payments') IS NOT NULL THEN
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by integer;
    END IF;
    IF to_regclass('public.tickets') IS NOT NULL THEN
        ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF to_regclass('public.buildings') IS NOT NULL THEN
        ALTER TABLE buildings ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF to_regclass('public.lots') IS NOT NULL THEN
        ALTER TABLE lots ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF to_regclass('public.notebook_contacts') IS NOT NULL THEN
        ALTER TABLE notebook_contacts ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF to_regclass('public.owner_user') IS NOT NULL THEN
        ALTER TABLE owner_user ADD COLUMN IF NOT EXISTS end_date date;
    END IF;
    IF to_regclass('public.mobile_money_configs') IS NOT NULL THEN
        ALTER TABLE mobile_money_configs ADD COLUMN IF NOT EXISTS owner_id integer;
    END IF;
END $$;
`;
