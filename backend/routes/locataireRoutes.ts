import express, { Response } from 'express';
import { body, param } from 'express-validator';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { protect } from '../middleware/authMiddleware';
import { checkTenantLimit } from '../middleware/subscriptionLimits';
import { AuditService } from '../services/AuditService';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';

const router = express.Router();

// Création : nom/prénoms/téléphone obligatoires (clé d'identité + dédup) ;
// email validé en format si fourni (checkFalsy => '' traité comme absent).
const tenantCreateRules = [
    body('nom').notEmpty().withMessage('Le nom est obligatoire').bail().isString().isLength({ max: 150 }).withMessage('Nom trop long'),
    body('prenoms').notEmpty().withMessage('Les prénoms sont obligatoires').bail().isString().isLength({ max: 150 }).withMessage('Prénoms trop longs'),
    body('telephone_principal').notEmpty().withMessage('Le téléphone principal est obligatoire').bail().isString().isLength({ max: 40 }).withMessage('Téléphone invalide'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('telephone_secondaire').optional({ nullable: true, checkFalsy: true }).isString().isLength({ max: 40 }).withMessage('Téléphone secondaire invalide'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('numero_piece').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Numéro de pièce invalide'),
    body('paiement_echelonne').optional({ nullable: true }).isBoolean().withMessage('paiement_echelonne doit être un booléen'),
];
// Mise à jour : tout optionnel mais typé + format email + :id entier.
const tenantUpdateRules = [
    param('id').isInt({ min: 1 }).withMessage('Identifiant invalide'),
    body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
    body('nom').optional({ nullable: true }).isString().isLength({ max: 150 }).withMessage('Nom trop long'),
    body('prenoms').optional({ nullable: true }).isString().isLength({ max: 150 }).withMessage('Prénoms trop longs'),
    body('telephone_principal').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('Téléphone invalide'),
    body('paiement_echelonne').optional({ nullable: true }).isBoolean().withMessage('paiement_echelonne doit être un booléen'),
];
const tenantIdParam = [param('id').isInt({ min: 1 }).withMessage('Identifiant invalide')];

// [RLS] Filtrage automatique par tenant via PostgreSQL Row-Level Security
// Anciens helpers getManagedOwnerIds et getManagedOwnerId supprimés car redondants.

// GET /api/locataires - Liste des locataires
router.get('/', protect, permissions.canRead('locataires'), tenantGuard, async (req: any, res) => {
    const dbClient = (req as any).dbClient;

    try {
        const { type, search } = req.query;
        const validOwnerIds: number[] = (req as any).validOwnerIds || [];
        const isAdmin = (req as any).userRole === 'admin';

        let query = `
            SELECT t.*,
                   COALESCE(agg.active_leases, 0) as active_leases,
                   -- Agrégats multi-logements : total des loyers actifs + nb de baux à jour
                   COALESCE(agg.loyer_total, 0) as loyer_total,
                   COALESCE(agg.leases_paid, 0) as leases_paid,
                   -- Champs « bail le plus récent » conservés pour l'affichage à 1 logement
                   al.ref_lot as lot_nom,
                   al.loyer_mensuel as loyer_actuel,
                   al.lease_id as active_lease_id,
                   al.lease_statut as bail_statut,
                   CASE
                     WHEN al.lease_id IS NULL THEN 'unknown'
                     WHEN lp.last_payment_date IS NULL THEN 'pending'
                     WHEN lp.last_payment_date < CURRENT_DATE - INTERVAL '35 days' THEN 'late'
                     WHEN EXTRACT(MONTH FROM lp.last_payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) THEN 'paid'
                     ELSE 'pending'
                   END as payment_status
            FROM tenants t
            LEFT JOIN LATERAL (
                SELECT lot.ref_lot, l.loyer_actuel as loyer_mensuel, l.id as lease_id, l.statut as lease_statut
                FROM leases l
                JOIN lots lot ON l.lot_id = lot.id
                WHERE l.tenant_id = t.id AND l.statut IN ('actif', 'signe')
                ORDER BY l.date_debut DESC
                LIMIT 1
            ) al ON true
            LEFT JOIN LATERAL (
                SELECT MAX(date_paiement) as last_payment_date
                FROM payments p
                WHERE p.lease_id = al.lease_id
            ) lp ON true
            -- Agrégation sur TOUS les baux actifs du locataire (pas seulement le plus récent).
            -- « à jour » = dernier paiement enregistré dans le mois courant (même règle que payment_status='paid').
            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) AS active_leases,
                    COALESCE(SUM(l.loyer_actuel), 0) AS loyer_total,
                    COUNT(*) FILTER (
                        WHERE lpa.last_payment_date IS NOT NULL
                          AND lpa.last_payment_date >= CURRENT_DATE - INTERVAL '35 days'
                          AND EXTRACT(MONTH FROM lpa.last_payment_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                    ) AS leases_paid
                FROM leases l
                LEFT JOIN LATERAL (
                    SELECT MAX(date_paiement) AS last_payment_date
                    FROM payments p WHERE p.lease_id = l.id
                ) lpa ON true
                WHERE l.tenant_id = t.id AND l.statut IN ('actif', 'signe')
            ) agg ON true
            WHERE t.statut != 'Archivé' AND t.deleted_at IS NULL
        `;

        // Filtrage explicite par owner — indispensable quand BYPASSRLS est actif
        const params: any[] = [];
        let paramIndex = 1;

        if (!isAdmin && validOwnerIds.length > 0) {
            query += ` AND t.owner_id = ANY($${paramIndex}::int[])`;
            params.push(validOwnerIds);
            paramIndex++;
        } else if (!isAdmin) {
            query += ` AND FALSE`;
        }

        if (type) {
            query += ` AND t.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (search) {
            query += ` AND (t.nom ILIKE $${paramIndex} OR t.prenoms ILIKE $${paramIndex} OR t.email ILIKE $${paramIndex} OR t.telephone_principal ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        query += ` ORDER BY t.statut DESC, t.nom, t.prenoms`;

        const result = await dbClient.query(query, params);
        res.json({ locataires: result.rows });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locataires/:id - Détail complet
router.get('/:id', protect, tenantGuard, async (req: any, res) => {
    const dbClient = (req as any).dbClient;

    try {
        const tenantId = parseInt(req.params.id, 10);

        // 1. Infos Locataire
        const tenantResult = await dbClient.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
        if (tenantResult.rows.length === 0) {
            return res.status(404).json({ message: "Locataire non trouvé ou accès refusé." });
        }

        // 2. Baux / Contrats
        const leasesResult = await dbClient.query(`
            SELECT l.*, b.nom as building_name, lot.ref_lot, lot.type as lot_type,
                   -- Statut de paiement par bail (même règle que la liste) pour la pastille du modal
                   CASE
                     WHEN lp.last_payment_date IS NULL THEN 'pending'
                     WHEN lp.last_payment_date < CURRENT_DATE - INTERVAL '35 days' THEN 'late'
                     WHEN EXTRACT(MONTH FROM lp.last_payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) THEN 'paid'
                     ELSE 'pending'
                   END as payment_status,
                   lp.last_payment_date
            FROM leases l
            JOIN lots lot ON l.lot_id = lot.id
            JOIN buildings b ON lot.building_id = b.id
            LEFT JOIN LATERAL (
                SELECT MAX(date_paiement) as last_payment_date
                FROM payments p WHERE p.lease_id = l.id
            ) lp ON true
            WHERE l.tenant_id = $1
            ORDER BY l.date_debut DESC
        `, [tenantId]);

        // 3. Paiements récents
        const paymentsResult = await dbClient.query(`
            SELECT p.*, l.lot_id 
            FROM payments p
            JOIN leases l ON p.lease_id = l.id
            WHERE l.tenant_id = $1
            ORDER BY p.date_paiement DESC
            LIMIT 10
        `, [tenantId]);

        res.json({
            locataire: tenantResult.rows[0],
            baux: leasesResult.rows,
            paiements: paymentsResult.rows
        });

    } catch (error) {
        console.error('Error fetching tenant details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locataires - Création
router.post('/', protect, permissions.canWrite('locataires'), checkTenantLimit, tenantGuard, validate(tenantCreateRules), async (req: any, res: Response) => {
    const dbClient = (req as any).dbClient;
    const strictOwnerId = (req as any).resolvedOwnerId;

    try {
        const {
            nom, prenoms, email, telephone_principal, telephone_secondaire,
            nationalite, type_piece, numero_piece, type, mode_paiement_preferentiel,
            adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
            paiement_echelonne
        } = req.body;

        const cleanEmail = email && email.trim() !== '' ? email : null;
        const cleanStartPhone2 = telephone_secondaire && telephone_secondaire.trim() !== '' ? telephone_secondaire : null;
        const cleanAddress = adresse_actuelle && adresse_actuelle.trim() !== '' ? adresse_actuelle : null;
        const cleanExpDate = date_expiration_piece && date_expiration_piece.trim() !== '' ? date_expiration_piece : null;
        const cleanPhotoProfil = photo_profil_url && photo_profil_url.trim() !== '' ? photo_profil_url : null;
        const cleanPhotoPiece = photo_piece_url && photo_piece_url.trim() !== '' ? photo_piece_url : null;

        const duplicateCheck = await dbClient.query(
            `SELECT id FROM tenants 
             WHERE owner_id = $1 
             AND (telephone_principal = $2 OR (email IS NOT NULL AND email != '' AND email = $3))
             AND statut != 'Archivé'`,
            [strictOwnerId, telephone_principal, cleanEmail || '']
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ message: "Un locataire avec ce téléphone ou cet email existe déjà." });
        }

        const invitationCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const result = await dbClient.query(
            `INSERT INTO tenants (
                owner_id, nom, prenoms, email, telephone_principal, telephone_secondaire,
                nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
                adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
                paiement_echelonne, invitation_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Actif', $11, $12, $13, $14, $15, $16, $17)
            RETURNING id, invitation_code`,
            [
                strictOwnerId, nom, prenoms, cleanEmail, telephone_principal, cleanStartPhone2,
                nationalite, type_piece, numero_piece, type || 'Locataire', mode_paiement_preferentiel,
                cleanAddress, cleanExpDate, cleanPhotoProfil, cleanPhotoPiece,
                paiement_echelonne || false,
                invitationCode
            ]
        );

        try {
            await AuditService.log({
                userId: req.user.id,
                action: 'CREATE_TENANT',
                entityType: 'TENANT',
                entityId: result.rows[0].id,
                details: { nom, prenoms, email },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });
        } catch (auditError) {
            console.error('Audit log failed for tenant creation (non-critical):', auditError);
        }

        res.status(201).json({ 
            message: "Locataire créé", 
            id: result.rows[0].id,
            invitation_code: result.rows[0].invitation_code 
        });

    } catch (error) {
        console.error('Error creating tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/locataires/:id - Modification
router.put('/:id', protect, tenantGuard, validate(tenantUpdateRules), async (req: any, res: Response) => {
    const dbClient = (req as any).dbClient;
    const tenantId = parseInt(req.params.id, 10);

    try {
        const {
            nom, prenoms, email, telephone_principal, telephone_secondaire,
            nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
            adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
            paiement_echelonne
        } = req.body;

        const cleanEmail = email && typeof email === 'string' && email.trim() !== '' ? email : null;
        const cleanPhone2 = telephone_secondaire && typeof telephone_secondaire === 'string' && telephone_secondaire.trim() !== '' ? telephone_secondaire : null;
        const cleanAddress = adresse_actuelle && typeof adresse_actuelle === 'string' && adresse_actuelle.trim() !== '' ? adresse_actuelle : null;
        const cleanExpDate = date_expiration_piece && typeof date_expiration_piece === 'string' && date_expiration_piece.trim() !== '' ? date_expiration_piece : null;
        const cleanPhotoProfil = photo_profil_url && typeof photo_profil_url === 'string' && photo_profil_url.trim() !== '' ? photo_profil_url : null;
        const cleanPhotoPiece = photo_piece_url && typeof photo_piece_url === 'string' && photo_piece_url.trim() !== '' ? photo_piece_url : null;

        const queryParams = [
            nom, prenoms, cleanEmail, telephone_principal, cleanPhone2,
            nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
            cleanAddress, cleanExpDate, cleanPhotoProfil, cleanPhotoPiece,
            paiement_echelonne || false,
            tenantId
        ];

        const result = await dbClient.query(
            `UPDATE tenants SET
                nom = $1, prenoms = $2, email = $3, telephone_principal = $4,
                telephone_secondaire = $5, nationalite = $6, type_piece = $7,
                numero_piece = $8, type = $9, statut = $10, mode_paiement_preferentiel = $11,
                adresse_actuelle = $12, date_expiration_piece = $13, photo_profil_url = $14, photo_piece_url = $15,
                paiement_echelonne = $16
             WHERE id = $17 RETURNING id`,
            queryParams
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ressource introuvable ou accès refusé.' });
        }

        const { AuditService } = require('../services/AuditService');
        AuditService.log({
            userId: req.user.id,
            action: 'UPDATE_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
            details: { changes: req.body },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.json({ message: "Locataire mis à jour" });

    } catch (error: any) {
        console.error('Error updating tenant:', error);
        res.status(500).json({ message: error.message || 'Erreur serveur' });
    }
});

// DELETE /api/locataires/:id - Archivage
router.delete('/:id', protect, tenantGuard, validate(tenantIdParam), async (req: any, res: Response) => {
    const dbClient = (req as any).dbClient;
    const tenantId = parseInt(req.params.id, 10);

    try {
        // Soft-delete vers la corbeille (deleted_at) — récupérable, contrairement à un
        // simple statut='Archivé' qui ne se restaure pas via le module Corbeille.
        const result = await dbClient.query(
            "UPDATE tenants SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id, nom, prenoms",
            [tenantId, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ressource introuvable ou accès refusé.' });
        }

        const { AuditService } = require('../services/AuditService');
        AuditService.log({
            userId: req.user.id,
            action: 'ARCHIVE_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        // Élément critique → alerte les administrateurs (CdC §XVII).
        const tName = `${result.rows[0].prenoms || ''} ${result.rows[0].nom || ''}`.trim() || `#${tenantId}`;
        const { NotificationService } = require('../services/notificationService');
        NotificationService.notifyAdmins('Suppression d\'un locataire', `Le locataire « ${tName} » a été déplacé vers la corbeille.`);

        res.json({ message: "Locataire déplacé vers la corbeille" });

    } catch (error) {
        console.error('Error archiving tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locataires/:id/approve - Valider une demande
router.post('/:id/approve', protect, tenantGuard, validate(tenantIdParam), async (req: any, res: Response) => {
    const dbClient = (req as any).dbClient;
    const tenantId = parseInt(req.params.id, 10);

    try {
        const result = await dbClient.query("UPDATE tenants SET statut = 'Actif' WHERE id = $1 RETURNING user_id", [tenantId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ressource introuvable ou accès refusé.' });
        }

        const tenantUserId = result.rows[0].user_id;

        if (tenantUserId) {
            await dbClient.query(
                `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
                 VALUES ($1, 'success', $2, $3, '/dashboard', false, NOW())`,
                [
                    tenantUserId,
                    'Demande acceptée ✅',
                    'Votre demande de liaison a été acceptée par le gestionnaire. Vous êtes maintenant actif.'
                ]
            );
        }

        res.json({ message: "Locataire approuvé avec succès" });

    } catch (error) {
        console.error('Error approving tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locataires/:id/reject - Refuser une demande
router.post('/:id/reject', protect, tenantGuard, validate(tenantIdParam), async (req: any, res: Response) => {
    const dbClient = (req as any).dbClient;
    const tenantId = parseInt(req.params.id, 10);

    try {
        const result = await dbClient.query("UPDATE tenants SET statut = 'Rejeté' WHERE id = $1 RETURNING user_id", [tenantId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Ressource introuvable ou accès refusé.' });
        }

        const tenantUserId = result.rows[0].user_id;

        if (tenantUserId) {
            await dbClient.query(
                `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
                 VALUES ($1, 'error', $2, $3, '/dashboard', false, NOW())`,
                [
                    tenantUserId,
                    'Demande refusée ❌',
                    'Votre demande de liaison a été refusée par le gestionnaire. Vous pouvez contacter votre gestionnaire pour plus d\'informations.'
                ]
            );
        }

        res.json({ message: "Demande refusée" });

    } catch (error) {
        console.error('Error rejecting tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — locataireRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par le commentaire d'avertissement.
 * ✅ tenantGuard ajouté sur toutes les routes (7 routes).
 * ✅ pool.query() remplacé par req.dbClient.query() sur 10 occurrences.
 * ✅ resolvedOwnerId utilisé pour la vérification de doublons et l'insertion dans POST /.
 * ✅ Anciens accessCheck (getManagedOwnerIds, getManagedOwnerId) supprimés : 2 helpers complexes jetés. Multiples requêtes économisées.
 * ✅ Réponse 404 ajoutée si rowCount === 0 sur les 4 UPDATE (PUT /, DELETE /, POST /approve, POST /reject).
 * ⚠️ Points d'attention particuliers : L'insertion des notifications a été simplifiée (user_id récupéré avec le RETURNING de l'UPDATE de statut).
 * ═══════════════════════════════════════════════════
 */

export default router;
