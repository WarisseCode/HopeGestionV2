// backend/routes/compteRoutes.ts
import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import db from '../db/database';
import { AuditService } from '../services/AuditService';
import { validate } from '../middleware/validate';
import { USER_MANAGER_ROLES, ALL_ASSIGNABLE_ROLES, assignableRolesFor } from '../utils/roleHierarchy';

const router = Router();

// ── [SÉCURITÉ] Faille C3 de l'audit : portée des actions sur les comptes utilisateurs ──
// Avant ce correctif, suspend / delete / reactivate / mise à jour ne vérifiaient que le
// rôle de l'appelant : tout gestionnaire ou propriétaire pouvait agir sur n'importe quel
// compte, admin inclus. Désormais :
//  - un non-admin n'agit que sur les comptes de sa portée, même filtre que
//    GET /utilisateurs (`id = appelant OR created_by = appelant`) → 404 sinon ;
//  - un non-admin n'agit jamais sur un compte admin → 403.

type ManagedUser = { id: number; role: string | null; user_type: string | null };

const isAdminAccount = (u: ManagedUser): boolean =>
    [u.role, u.user_type].some(r => typeof r === 'string' && r.trim().toLowerCase() === 'admin');

/**
 * Charge le compte ciblé en appliquant la portée de l'appelant. Envoie la réponse
 * d'erreur (404 hors portée / inexistant, 403 cible admin pour un non-admin) et renvoie
 * null si l'action doit être refusée.
 */
const loadManageableUser = async (
    req: AuthenticatedRequest, res: Response, targetId: string | number | undefined
): Promise<ManagedUser | null> => {
    const isAdmin = req.userRole === 'admin';
    const result = isAdmin
        ? await db.query('SELECT id, role, user_type FROM users WHERE id = $1', [targetId])
        : await db.query(
            'SELECT id, role, user_type FROM users WHERE id = $1 AND (id = $2 OR created_by = $2)',
            [targetId, req.userId]
        );
    const target: ManagedUser | undefined = result.rows[0];
    // 404 (pas 403) pour ne pas confirmer l'existence d'un compte hors portée.
    if (!target) {
        res.status(404).json({ message: 'Utilisateur introuvable.' });
        return null;
    }
    if (!isAdmin && isAdminAccount(target)) {
        res.status(403).json({ message: "Vous n'êtes pas autorisé à agir sur ce compte." });
        return null;
    }
    return target;
};

/**
 * Prédicat de portée répété dans l'écriture elle-même (UPDATE / DELETE / SELECT FOR UPDATE)
 * pour fermer la fenêtre de course entre loadManageableUser et l'écriture (compte devenu
 * admin ou changé de créateur entre-temps). Vide pour un admin.
 */
const userWriteScope = (req: AuthenticatedRequest, paramIndex: number): { clause: string; params: unknown[] } =>
    req.userRole === 'admin'
        ? { clause: '', params: [] }
        : {
            clause: ` AND (id = $${paramIndex} OR created_by = $${paramIndex})`
                + ` AND LOWER(TRIM(COALESCE(role, ''))) <> 'admin'`
                + ` AND LOWER(TRIM(COALESCE(user_type, ''))) <> 'admin'`,
            params: [req.userId],
        };

/**
 * Lien réel appelant ↔ propriétaire (même contrôle que GET /proprietaires/:id/biens).
 * Admin : aucune restriction. Sinon 404 si aucun lien owner_user actif.
 */
const hasOwnerAccess = async (req: AuthenticatedRequest, ownerId: string | undefined): Promise<boolean> => {
    if (req.userRole === 'admin') return true;
    const access = await db.query(
        'SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE',
        [ownerId, req.userId]
    );
    return access.rows.length > 0;
};

const compteIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide');
// name géré à la main (name || company_name) — on formalise téléphone + format email.
const ownerCreateRules = [
    body('phone').notEmpty().withMessage('Le téléphone est obligatoire').bail().isString().isLength({ max: 40 }).withMessage('Téléphone invalide'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 30 }).withMessage('Type invalide'),
];
const ownerUpdateRules = [
    compteIdParam,
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('phone').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('Téléphone invalide'),
];
const userSaveRules = [
    body('id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('id invalide'),
    body('nom').notEmpty().withMessage('Le nom est obligatoire').bail().isString().isLength({ max: 150 }).withMessage('Nom invalide'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('role').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Rôle invalide'),
    body('mot_de_passe').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6 }).withMessage('Mot de passe trop court (min 6)'),
];
// modules/niveauAcces sont déréférencés (modules.finances…) → doivent être des objets.
const autorisationRules = [
    body('utilisateur').notEmpty().withMessage('utilisateur est obligatoire').bail().isInt({ min: 1 }).withMessage('utilisateur invalide'),
    body('proprietaire').notEmpty().withMessage('proprietaire est obligatoire').bail().isInt({ min: 1 }).withMessage('proprietaire invalide'),
    body('modules').isObject().withMessage('modules doit être un objet'),
    body('niveauAcces').isObject().withMessage('niveauAcces doit être un objet'),
    body('role').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Rôle invalide'),
];

// GET /api/compte/proprietaires : Récupérer la liste des propriétaires
router.get('/proprietaires', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Admins, gestionnaires, managers ET propriétaires peuvent accéder (avec filtre)
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire', 'owner'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        let query = `
            SELECT id, type, name as nom, first_name as prenom, phone as telephone, 
                   phone_secondary as "telephoneSecondaire", phone_secondary as "phone_secondary",
                   email, address as adresse, address as address,
                   city as ville, country as pays, id_number as "numeroPiece", 
                   id_number as "id_number",
                   photo, photo_url, phone_secondary,
                   management_mode as "modeGestion",
                   mobile_money_number as "mobileMoney", 
                   id_number as "rccmNumber"
            FROM owners
            WHERE is_active = TRUE
        `;
        const params: any[] = [];

        if (req.userRole === 'proprietaire' || req.userRole === 'owner') {
            // Propriétaire : ne voit que ses propres données
            const linkResult = await db.query(
                `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`,
                [req.userId]
            );
            if (linkResult.rows.length > 0) {
                const ownerIds = linkResult.rows.map(row => row.owner_id);
                query += ` AND id = ANY($1)`;
                params.push(ownerIds);
            } else {
                return res.json({ proprietaires: [] });
            }
        } else if (req.userRole === 'gestionnaire' || req.userRole === 'manager') {
            // Gestionnaire : ne voit que les propriétaires qu'il gère (via owner_user)
            const linkResult = await db.query(
                `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`,
                [req.userId]
            );
            if (linkResult.rows.length > 0) {
                const ownerIds = linkResult.rows.map(row => row.owner_id);
                query += ` AND id = ANY($1)`;
                params.push(ownerIds);
            } else {
                return res.json({ proprietaires: [] });
            }
        }
        // admin : voit tous les propriétaires (pas de filtre supplémentaire)

        query += ` ORDER BY name ASC`;
        
        const result = await db.query(query, params);
        res.status(200).json({ proprietaires: result.rows });
    } catch (error) {
        console.error('Erreur récupération propriétaires:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des propriétaires.' });
    }
});

// GET /api/compte/utilisateurs : Récupérer la liste des utilisateurs
router.get('/utilisateurs', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Admins, gestionnaires et propriétaires peuvent accéder à la liste des utilisateurs
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        let query: string;
        let queryParams: any[] = [];

        if (req.userRole === 'admin') {
            // Admin sees all users
            query = `
                SELECT id, nom, '' as prenom, telephone, email, role, photo_url as photo, statut, created_at
                FROM users
                ORDER BY nom ASC
            `;
        } else {
            // Gestionnaire/Proprietaire see themselves AND users they created/invited
            query = `
                SELECT id, nom, '' as prenom, telephone, email, role, photo_url as photo, statut, created_at
                FROM users
                WHERE id = $1 OR created_by = $1
                ORDER BY nom ASC
            `;
            queryParams = [req.userId];
        }
        
        const result = await db.query(query, queryParams);
        res.status(200).json({ utilisateurs: result.rows });
    } catch (error) {
        console.error('Erreur récupération utilisateurs:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
    }
});

// GET /api/compte/autorisations : Récupérer les autorisations
router.get('/autorisations', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const query = `
            SELECT ou.*, u.nom as user_name, o.name as owner_name
            FROM owner_user ou
            JOIN users u ON ou.user_id = u.id
            JOIN owners o ON ou.owner_id = o.id
            WHERE ou.is_active = TRUE
        `;
        const result = await db.query(query);
        res.status(200).json({ autorisations: result.rows });
    } catch (error) {
        console.error('Erreur récupération autorisations:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des autorisations.' });
    }
});

// POST /api/compte/proprietaires : Créer ou mettre à jour un propriétaire
router.post('/proprietaires', validate(ownerCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    // Autoriser Admin, Gestionnaire ET Propriétaire à créer
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const cleanPhone = req.body.phone ? req.body.phone.replace(/[^\d+]/g, '') : null;
        const cleanMobileMoney = req.body.mobile_money_number ? req.body.mobile_money_number.replace(/[^\d+]/g, '') : null;
        
        // Validation des champs obligatoires (name et phone sont NOT NULL en DB)
        const finalName = req.body.name || req.body.company_name;
        if (!finalName || finalName.trim() === '') {
            return res.status(400).json({ message: "Le nom ou la raison sociale est obligatoire." });
        }
        if (!cleanPhone || cleanPhone.trim() === '') {
            return res.status(400).json({ message: "Le numéro de téléphone est obligatoire." });
        }

        // Générer un code manager sécurisé (AG- + 6 alphanum aléatoires)
        const managerCode = `AG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        console.log(`[compteRoutes] Creating owner with managerCode: ${managerCode}`);

        // [SÉCURITÉ] Création du propriétaire + lien owner_user dans UNE transaction :
        // un propriétaire sans lien laisserait le créateur sans accès (et, avant le
        // correctif C4, en mode « zéro lien » où l'owner_id client était accepté tel quel).
        const txClient = await db.connect();
        let newOwner;
        try {
            await txClient.query('BEGIN');

            // Insérer le propriétaire (schema matches ownerRoutes.ts)
            newOwner = await txClient.query(
            `INSERT INTO owners (
                type, name, first_name, phone, phone_secondary, email,
                address, city, country, id_number, photo, mobile_money_number, management_mode,
                manager_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            RETURNING *`,
            [
                req.body.type || 'individual',
                finalName, // Nom ou Raison sociale validé
                req.body.first_name || req.body.prenom || '', // Support both field names
                cleanPhone,
                req.body.phone_secondary || req.body.secondary_phone || null, // Support both field names
                req.body.email || '',
                req.body.address || '',
                req.body.city || '',
                req.body.country || 'Bénin',
                req.body.id_number || null,
                req.body.photo || req.body.photo_url || null, // Support both field names
                cleanMobileMoney || (req.body.mobile_money ? req.body.mobile_money.replace(/[^\d+]/g, '') : null), // Support both
                req.body.management_mode || 'direct',
                managerCode
            ]
            );

            const ownerId = newOwner.rows[0].id;

            // Lier le créateur à l'owner via owner_user
            // - Gestionnaire/manager : role='gestionnaire' (il gère ce propriétaire)
            // - Propriétaire : role='owner' (c'est son propre compte)
            // Un échec ici annule aussi la création du propriétaire (ROLLBACK ci-dessous).
            const linkRole = (req.userRole === 'gestionnaire' || req.userRole === 'manager') ? 'gestionnaire' : 'owner';
            await txClient.query(
                `INSERT INTO owner_user (user_id, owner_id, role, is_active, start_date) VALUES ($1, $2, $3, true, CURRENT_DATE)
                 ON CONFLICT (user_id, owner_id) DO NOTHING`,
                [req.userId!, ownerId, linkRole]
            );

            await txClient.query('COMMIT');
        } catch (txError) {
            try { await txClient.query('ROLLBACK'); } catch (rbError) {
                console.error('Erreur ROLLBACK création propriétaire:', rbError);
            }
            throw txError;
        } finally {
            txClient.release();
        }

        // Log action
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'CREATE_OWNER',
            module: 'COMPTE',
            details: { name: req.body.name || req.body.company_name }
        });

        res.status(201).json(newOwner.rows[0]);
    } catch (error: any) {
        console.error('Erreur création propriétaire:', error);
        if (error.constraint === 'owners_phone_key') {
             return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre propriétaire.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du propriétaire' });
    }
});

// PUT /api/compte/proprietaires/:id : Modifier un propriétaire
router.put('/proprietaires/:id', validate(ownerUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    // Autoriser Admin, Gestionnaire ET Propriétaire à modifier (si c'est le sien)
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const ownerId = req.params.id;

        // [SÉCURITÉ C3] Lien owner_user actif exigé pour tout non-admin (proprietaire,
        // gestionnaire, manager) — avant, seul le rôle proprietaire était contrôlé.
        if (!(await hasOwnerAccess(req, ownerId))) {
            return res.status(404).json({ message: 'Propriétaire introuvable.' });
        }
        // Support multiple field names for backward compatibility
        const { 
            name, type, phone, email, address, city, country,
            company_name, rccm_number, id_number, mobile_money, mobile_money_number,
            telephoneSecondaire, secondary_phone, phone_secondary,
            first_name, prenom,
            management_mode,
            photo, photo_url
        } = req.body;
        
        // Nettoyage des numéros avec support de multiples noms de champs
        const rawPhone = phone?.toString();
        const cleanPhone = rawPhone ? rawPhone.replace(/[\s()\-.]/g, '') : null;
        
        const rawPhoneSec = (phone_secondary || secondary_phone || telephoneSecondaire)?.toString();
        const cleanPhoneSec = rawPhoneSec ? rawPhoneSec.replace(/[\s()\-.]/g, '') : null;
        
        const rawMobileMoney = (mobile_money_number || mobile_money)?.toString();
        const cleanMobileMoney = rawMobileMoney ? rawMobileMoney.replace(/[\s()\-.]/g, '') : null;

        let updatedOwner;
        try {
            // Note: On met à jour id_number ET rccm_number pour être cohérent avec le type de propriétaire
            updatedOwner = await db.query(
                `UPDATE owners 
                 SET name = COALESCE($1, name), 
                     type = COALESCE($2, type), 
                     phone = COALESCE($3, phone), 
                     email = COALESCE($4, email), 
                     address = COALESCE($5, address),
                     city = COALESCE($6, city),
                     country = COALESCE($7, country),
                     first_name = COALESCE($8, first_name),
                     id_number = COALESCE($9, id_number), 
                     rccm_number = COALESCE($14, rccm_number),
                     mobile_money_number = COALESCE($10, mobile_money_number),
                     phone_secondary = COALESCE($11, phone_secondary),
                     management_mode = COALESCE($12, management_mode),
                     photo_url = COALESCE($15, photo_url),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $13 RETURNING *`,
                [
                    name || company_name || null, 
                    type || null, 
                    cleanPhone || null, 
                    email || null, 
                    address || null,
                    city || null,
                    country || null,
                    first_name || prenom || null,
                    id_number || null, 
                    cleanMobileMoney || null, 
                    cleanPhoneSec || null,
                    management_mode || null, 
                    ownerId,
                    rccm_number || null,
                    photo || photo_url || null
                ]
            );
        } catch (error: any) {
            console.error('Erreur SQL modification propriétaire:', error);
            if (error.code === '23505') {
                if (error.constraint === 'owners_phone_key') {
                    return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre propriétaire.' });
                }
                if (error.constraint === 'owners_email_key') {
                    return res.status(400).json({ message: 'Cette adresse email est déjà utilisée par un autre propriétaire.' });
                }
                return res.status(400).json({ message: 'Une donnée unique est déjà utilisée par un autre compte.' });
            }
            throw error; 
        }

        if (updatedOwner.rows.length === 0) {
            return res.status(404).json({ message: 'Propriétaire non trouvé' });
        }

        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'UPDATE_OWNER',
            module: 'COMPTE',
            details: { ownerId, message: `Propriétaire ID: ${ownerId}` }
        });

        res.json(updatedOwner.rows[0]);
    } catch (error: any) {
        console.error('Erreur modification propriétaire:', error);
        res.status(500).json({ 
            message: 'Erreur serveur lors de la modification.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});

// [SÉCURITÉ] Colonnes renvoyées au client après création / mise à jour d'un utilisateur.
// Liste explicite (jamais RETURNING *) : password_hash, access_key, OTP, etc. ne doivent
// jamais sortir de la base. Le client web (frontend/src/api/accountApi.ts → saveUtilisateur)
// n'exploite pas cette réponse au-delà du succès HTTP.
const SAVED_USER_COLUMNS =
    'id, nom, telephone, email, role, user_type, photo_url, statut, created_by, created_at, updated_at';

// POST /api/compte/utilisateurs : Créer ou mettre à jour un utilisateur
router.post('/utilisateurs', validate(userSaveRules), async (req: AuthenticatedRequest, res: Response) => {
    if (!USER_MANAGER_ROLES.includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id, nom, prenoms, telephone, email, role, photo, statut, mot_de_passe } = req.body;

        // [SÉCURITÉ C3] Mise à jour : le compte ciblé doit être dans la portée de
        // l'appelant (même filtre que GET /utilisateurs) et jamais admin pour un non-admin.
        let target: ManagedUser | null = null;
        if (id) {
            target = await loadManageableUser(req, res, id);
            if (!target) return;
        }

        // [SÉCURITÉ C3] Liste blanche du rôle, même hiérarchie que POST /api/auth/invite-user
        // (utils/roleHierarchy.ts) : un non-admin n'attribue que des rôles subalternes,
        // jamais admin. Exception : en mise à jour, conserver le rôle actuel du compte
        // (absent ou identique) n'est pas une attribution et reste permis.
        if (role !== undefined && role !== null && role !== '' && typeof role !== 'string') {
            return res.status(400).json({ message: 'Rôle invalide' });
        }
        const requestedRole: string | null = (typeof role === 'string' && role !== '') ? role : null;
        const keepsCurrentRole = target !== null && (requestedRole === null || requestedRole === target.role);
        if (!keepsCurrentRole) {
            if (requestedRole === null) {
                return res.status(400).json({ message: 'Le rôle est obligatoire.' });
            }
            if (!ALL_ASSIGNABLE_ROLES.includes(requestedRole)) {
                return res.status(400).json({ message: 'Rôle invalide' });
            }
            if (!assignableRolesFor(req.userRole).includes(requestedRole)) {
                return res.status(403).json({ message: "Vous n'êtes pas autorisé à attribuer ce rôle." });
            }
        }
        const effectiveRole = requestedRole ?? target?.role ?? null;

        let result;
        if (id) {
            // Portée répétée dans l'UPDATE (course avec un changement de rôle / created_by).
            const scope = userWriteScope(req, 9);
            const query = `
                UPDATE users SET
                    nom = $1, prenom = $2, telephone = $3, email = $4, role = $5,
                    photo = $6, statut = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8${scope.clause} RETURNING ${SAVED_USER_COLUMNS}
            `;
            result = await db.query(query, [nom, prenoms, telephone, email, effectiveRole, photo, statut, id, ...scope.params]);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: 'Utilisateur introuvable.' });
            }
        } else {
            // Pour la création d'utilisateur — created_by renseigné pour que le compte créé
            // entre dans la portée de son créateur (GET /utilisateurs, suspend, etc.).
            const query = `
                INSERT INTO users (nom, telephone, email, role, photo_url, statut, password_hash, user_type, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${SAVED_USER_COLUMNS}
            `;
            // Note: We should hash the password properly - using a placeholder for now
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(mot_de_passe || 'TempPassword123!', 10);
            result = await db.query(query, [nom, telephone, email, effectiveRole, photo, statut || 'actif', hashedPassword, effectiveRole, req.userId]);
        }

        await AuditService.log({
            userId: req.userId!.toString(),
            action: id ? 'UPDATE_USER' : 'CREATE_USER',
            module: 'COMPTE',
            details: { nom, message: `Utilisateur: ${nom}` }
        });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'utilisateur.' });
    }
});

// POST /api/compte/autorisations : Créer ou mettre à jour une autorisation
router.post('/autorisations', validate(autorisationRules), async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { utilisateur, proprietaire, role, modules, niveauAcces, dateDebut, dateFin } = req.body;
        
        // Modules et niveauAcces sont des objets JSON, on peut les stocker ou utiliser les colonnes booléennes existantes
        const query = `
            INSERT INTO owner_user (
                owner_id, user_id, role, start_date, end_date, is_active,
                can_view_finances, can_edit_properties, can_manage_tenants, 
                can_manage_contracts, can_validate_payments, can_manage_users,
                can_delete_data, can_access_audit_logs
            ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (owner_id, user_id) DO UPDATE SET
                role = $3, start_date = $4, end_date = $5, is_active = TRUE,
                can_view_finances = $6, can_edit_properties = $7, can_manage_tenants = $8,
                can_manage_contracts = $9, can_validate_payments = $10,
                can_manage_users = $11, can_delete_data = $12, can_access_audit_logs = $13
            RETURNING *
        `;
        
        const result = await db.query(query, [
            proprietaire, utilisateur, role || 'viewer', dateDebut, dateFin || null,
            modules.finances || false, modules.biens || false, modules.locataires || false,
            modules.contrats || false, niveauAcces.validation || false,
            niveauAcces.ecriture || false, // Mapping ecriture to manage_users for now or adding more
            niveauAcces.suppression || false,
            modules.paiements || false // Using paiements module for audit logs access check maybe? or just adding 0/1
        ]);

        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'SET_PERMISSIONS',
            module: 'COMPTE',
            details: { utilisateur, proprietaire, message: `Utilisateur ID: ${utilisateur}, Proprietaire ID: ${proprietaire}` }
        });

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur sauvegarde autorisation:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'autorisation.' });
    }
});

// DELETE /api/compte/proprietaires/:id : Soft delete (désactiver) un propriétaire
router.delete('/proprietaires/:id', validate([compteIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;

        // [SÉCURITÉ C3] Lien owner_user actif exigé pour gestionnaire / manager.
        if (!(await hasOwnerAccess(req, id))) {
            return res.status(404).json({ message: 'Propriétaire introuvable.' });
        }

        await db.query('UPDATE owners SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'DEACTIVATE_OWNER',
            module: 'COMPTE',
            details: { ownerId: id, message: `Propriétaire ID: ${id}` }
        });

        res.status(200).json({ message: 'Propriétaire désactivé avec succès' });
    } catch (error) {
        console.error('Erreur désactivation propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la désactivation.' });
    }
});

// PATCH /api/compte/utilisateurs/:id/suspend : Soft delete (suspendre) un utilisateur
router.patch('/utilisateurs/:id/suspend', validate([compteIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;

        // [SÉCURITÉ C3] Portée + jamais un compte admin pour un non-admin.
        if (!(await loadManageableUser(req, res, id))) return;

        // NB : la casse 'Suspendu' est historique ; le login (AuthService) compare le
        // statut sans tenir compte de la casse.
        const scope = userWriteScope(req, 3);
        const updated = await db.query(
            `UPDATE users SET statut = $1 WHERE id = $2${scope.clause} RETURNING id`,
            ['Suspendu', id, ...scope.params]
        );
        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'SUSPEND_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id}` }
        });

        res.status(200).json({ message: 'Utilisateur suspendu avec succès' });
    } catch (error) {
        console.error('Erreur suspension utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suspension.' });
    }
});

// DELETE /api/compte/utilisateurs/:id : HARD DELETE (supprimer définitivement)
router.delete('/utilisateurs/:id', validate([compteIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        // Only admin can hard delete, or maybe gestionnaire too? Let's restrict to admin/gestionnaire for now
        // Assuming user wants validation for hard delete
         if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }
    }

    // [SÉCURITÉ C3] Portée + jamais un compte admin pour un non-admin (avant toute transaction).
    try {
        if (!(await loadManageableUser(req, res, req.params.id))) return;
    } catch (error) {
        console.error('Erreur suppression utilisateur:', error);
        return res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // 0. [SÉCURITÉ C3] Revérifie la portée en verrouillant la ligne pour la durée de la
        //    transaction (pas de course avec un changement de rôle / created_by).
        const scope = userWriteScope(req, 2);
        const locked = await client.query(
            `SELECT id FROM users WHERE id = $1${scope.clause} FOR UPDATE`,
            [id, ...scope.params]
        );
        if (locked.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        // 1. Remove assignments first (foreign key constraints)
        await client.query('DELETE FROM user_owner_assignments WHERE user_id = $1', [id]);
        
        // 2. Remove from owner_user if existing
        await client.query('DELETE FROM owner_user WHERE user_id = $1', [id]);

        // 3. Remove user
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'DELETE_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id} (Supprimé définitivement)` }
        });

        await client.query('COMMIT');
        res.status(200).json({ message: 'Utilisateur supprimé définitivement' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Erreur suppression utilisateur:', error);
        
        // Handle Foreign Key Constraint (RESTRICT)
        if (error.code === '23001' || error.constraint === 'leases_lot_id_fkey') {
           return res.status(400).json({ 
               message: 'Impossible de supprimer cet utilisateur : Il possède des biens liés à des contrats de location actifs. Veuillez d\'abord résilier les baux concernés.' 
           });
        }

        res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
    } finally {
        client.release();
    }
});

// PATCH /api/compte/utilisateurs/:id/reactivate : Réactiver un utilisateur
router.patch('/utilisateurs/:id/reactivate', validate([compteIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;

        // [SÉCURITÉ C3] Portée + jamais un compte admin pour un non-admin.
        if (!(await loadManageableUser(req, res, id))) return;

        const scope = userWriteScope(req, 3);
        const updated = await db.query(
            `UPDATE users SET statut = $1 WHERE id = $2${scope.clause} RETURNING id`,
            ['Actif', id, ...scope.params]
        );
        if (updated.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'REACTIVATE_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id}` }
        });

        res.status(200).json({ message: 'Utilisateur réactivé avec succès' });
    } catch (error) {
        console.error('Erreur réactivation utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la réactivation.' });
    }
});

// GET /api/compte/proprietaires/:id/biens : Récupérer les biens d'un propriétaire
router.get('/proprietaires/:id/biens', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        const isAdmin = req.userRole === 'admin';

        // IDOR : le rôle seul autorisait l'appel, pas le lien réel à cet owner précis.
        // 404 (pas 403) pour ne pas confirmer l'existence d'un propriétaire tiers.
        if (!isAdmin) {
            const access = await db.query(
                'SELECT 1 FROM owner_user WHERE owner_id = $1 AND user_id = $2 AND is_active = TRUE',
                [id, req.userId]
            );
            if (access.rows.length === 0) {
                return res.status(404).json({ message: 'Propriétaire introuvable.' });
            }
        }

        // Get buildings
        const buildingsQuery = `
            SELECT id, nom as name, adresse as address, ville as city, 
                   nombre_etages as floors, nombre_lots as total_lots
            FROM buildings 
            WHERE owner_id = $1 AND is_active = TRUE
            ORDER BY nom ASC
        `;
        const buildings = await db.query(buildingsQuery, [id]);

        // Get lots
        const lotsQuery = `
            SELECT l.id, l.ref_lot, l.type, l.superficie, l.loyer, l.statut,
                   b.nom as building_name
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            WHERE l.owner_id = $1
            ORDER BY b.nom, l.ref_lot ASC
        `;
        const lots = await db.query(lotsQuery, [id]);

        res.status(200).json({ 
            buildings: buildings.rows,
            lots: lots.rows,
            summary: {
                totalBuildings: buildings.rows.length,
                totalLots: lots.rows.length
            }
        });
    } catch (error) {
        console.error('Erreur récupération biens propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des biens.' });
    }
});

export default router;