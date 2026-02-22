import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import { AuditService } from '../services/AuditService';
import permissions from '../middleware/permissionMiddleware';

const router = express.Router();

/**
 * Helper: Récupérer l'ID propriétaire géré par l'utilisateur connecté.
 * Retourne:
 *   - owner_id (number) si l'utilisateur est lié via owner_user (propriétaire/délégué)
 *   - -1 si l'utilisateur est un admin/gestionnaire global (voit tout)
 *   - null si aucun accès
 */
const getManagedOwnerId = async (userId: number, userRole?: string, userType?: string): Promise<number | null> => {
    // 1. Admin/gestionnaire global → voit tout (sentinel -1)
    if (userRole === 'admin' || userRole === 'gestionnaire' || userType === 'gestionnaire') {
        console.log(`[getManagedOwnerId] user=${userId} role=${userRole} type=${userType} → admin/gestionnaire, accès global`);
        return -1;
    }

    // 2. Chercher un lien owner_user
    const result = await pool.query(
        `SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`,
        [userId]
    );

    if (result.rows.length > 0) {
        console.log(`[getManagedOwnerId] user=${userId} → owner_id=${result.rows[0].owner_id} via owner_user`);
        return result.rows[0].owner_id;
    }

    // 3. Fallback: peut-être que l'utilisateur est un gestionnaire sans owner_user — chercher dans users
    const userRes = await pool.query(
        `SELECT user_type, role FROM users WHERE id = $1`,
        [userId]
    );
    if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        console.log(`[getManagedOwnerId] user=${userId} → user_type=${u.user_type} role=${u.role} (DB lookup)`);
        if (u.user_type === 'gestionnaire' || u.role === 'admin' || u.role === 'gestionnaire') {
            return -1; // accès global
        }
    }

    console.log(`[getManagedOwnerId] user=${userId} → aucun accès`);
    return null;
};

// GET /api/locataires - Liste des locataires
router.get('/', protect, permissions.canRead('locataires'), async (req: any, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role || req.userRole;
        const userType = req.user.user_type;
        const ownerId = await getManagedOwnerId(userId, userRole, userType);

        console.log(`[GET /locataires] userId=${userId} role=${userRole} type=${userType} ownerId=${ownerId}`);

        if (ownerId === null) {
            return res.status(200).json({ locataires: [] }); // Pas d'accès
        }

        const { type, search } = req.query;
        let query = `
            SELECT t.*, 
                   (SELECT COUNT(*) FROM leases l WHERE l.tenant_id = t.id AND l.statut = 'actif') as active_leases,
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
                WHERE l.tenant_id = t.id AND l.statut = 'actif'
                ORDER BY l.date_debut DESC
                LIMIT 1
            ) al ON true
            LEFT JOIN LATERAL (
                SELECT MAX(date_paiement) as last_payment_date
                FROM payments p
                WHERE p.lease_id = al.lease_id
            ) lp ON true
            WHERE t.statut != 'Archivé'
        `;

        const params: any[] = [];
        let paramIndex = 1;

        // Filtre par owner uniquement si pas admin/gestionnaire global
        if (ownerId !== -1) {
            query += ` AND t.owner_id = $${paramIndex}`;
            params.push(ownerId);
            paramIndex++;
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

        const result = await pool.query(query, params);
        console.log(`[GET /locataires] → ${result.rows.length} résultats`);
        res.json({ locataires: result.rows });
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locataires/:id - Détail complet
router.get('/:id', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.params.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: "Non autorisé" });

        // Vérifier appartenance
        const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id = $1 AND owner_id = $2', [tenantId, ownerId]);
        if (tenantCheck.rows.length === 0) return res.status(404).json({ message: "Locataire non trouvé" });

        // 1. Infos Locataire
        const tenantResult = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
        
        // 2. Baux / Contrats
        const leasesResult = await pool.query(`
            SELECT l.*, b.nom as building_name, lot.ref_lot, lot.type as lot_type
            FROM leases l
            JOIN lots lot ON l.lot_id = lot.id
            JOIN buildings b ON lot.building_id = b.id
            WHERE l.tenant_id = $1
            ORDER BY l.date_debut DESC
        `, [tenantId]);

        // 3. Paiements récents
        const paymentsResult = await pool.query(`
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
router.post('/', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: "Vous devez gérer une organisation pour créer un locataire." });

        const {
            nom, prenoms, email, telephone_principal, telephone_secondaire,
            nationalite, type_piece, numero_piece, type, mode_paiement_preferentiel,
            // Module IV new fields
            adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
            caution, avance, paiement_echelonne
        } = req.body;

        // Sanitize optional fields (empty string -> null)
        const cleanEmail = email && email.trim() !== '' ? email : null;
        const cleanStartPhone2 = telephone_secondaire && telephone_secondaire.trim() !== '' ? telephone_secondaire : null;
        const cleanAddress = adresse_actuelle && adresse_actuelle.trim() !== '' ? adresse_actuelle : null;
        const cleanExpDate = date_expiration_piece && date_expiration_piece.trim() !== '' ? date_expiration_piece : null;
        const cleanPhotoProfil = photo_profil_url && photo_profil_url.trim() !== '' ? photo_profil_url : null;
        const cleanPhotoPiece = photo_piece_url && photo_piece_url.trim() !== '' ? photo_piece_url : null;

        // Check for duplicates (Phone or Email) logic for same owner
        const duplicateCheck = await pool.query(
            `SELECT id FROM tenants 
             WHERE owner_id = $1 
             AND (telephone_principal = $2 OR (email IS NOT NULL AND email != '' AND email = $3))
             AND statut != 'Archivé'`,
            [ownerId, telephone_principal, cleanEmail || '']
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({ message: "Un locataire avec ce téléphone ou cet email existe déjà." });
        }

        // Generate invitation code: LOC- + 6 random alphanumeric chars
        const invitationCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const result = await pool.query(
            `INSERT INTO tenants (
                owner_id, nom, prenoms, email, telephone_principal, telephone_secondaire,
                nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
                adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
                caution, avance, paiement_echelonne, invitation_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Actif', $11, $12, $13, $14, $15, $16, $17, $18, $19) 
            RETURNING id, invitation_code`,
            [
                ownerId, nom, prenoms, cleanEmail, telephone_principal, cleanStartPhone2,
                nationalite, type_piece, numero_piece, type || 'Locataire', mode_paiement_preferentiel,
                cleanAddress, cleanExpDate, cleanPhotoProfil, cleanPhotoPiece,
                caution || 0, avance || 0, paiement_echelonne || false,
                invitationCode
            ]
        );

        // Log Creation (Silent fail)
        try {
            await AuditService.log({
                userId: userId,
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
router.put('/:id', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.params.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: "Non autorisé" });

        // Vérif appartenance
        const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id = $1 AND owner_id = $2', [tenantId, ownerId]);
        if (tenantCheck.rows.length === 0) return res.status(404).json({ message: "Locataire non trouvé" });

        const {
            nom, prenoms, email, telephone_principal, telephone_secondaire,
            nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
            // Module IV new fields
            adresse_actuelle, date_expiration_piece, photo_profil_url, photo_piece_url,
            caution, avance, paiement_echelonne
        } = req.body;

        await pool.query(
            `UPDATE tenants SET 
                nom = $1, prenoms = $2, email = $3, telephone_principal = $4, 
                telephone_secondaire = $5, nationalite = $6, type_piece = $7, 
                numero_piece = $8, type = $9, statut = $10, mode_paiement_preferentiel = $11,
                adresse_actuelle = $12, date_expiration_piece = $13, photo_profil_url = $14, photo_piece_url = $15,
                caution = $16, avance = $17, paiement_echelonne = $18,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $19`,
            [
                nom, prenoms, email, telephone_principal, telephone_secondaire,
                nationalite, type_piece, numero_piece, type, statut, mode_paiement_preferentiel,
                adresse_actuelle || null, date_expiration_piece || null, photo_profil_url || null, photo_piece_url || null,
                caution || 0, avance || 0, paiement_echelonne || false,
                tenantId
            ]
        );

        const AuditService = require('../services/AuditService').AuditService;
        AuditService.log({
            userId: userId,
            action: 'UPDATE_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
            details: { changes: req.body },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.json({ message: "Locataire mis à jour" });

    } catch (error) {
        console.error('Error updating tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/locataires/:id - Archivage
router.delete('/:id', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.params.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: "Non autorisé" });

        const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id = $1 AND owner_id = $2', [tenantId, ownerId]);
        if (tenantCheck.rows.length === 0) return res.status(404).json({ message: "Locataire non trouvé" });

        await pool.query("UPDATE tenants SET statut = 'Archivé' WHERE id = $1", [tenantId]);

        const AuditService = require('../services/AuditService').AuditService;
        AuditService.log({
            userId: userId,
            action: 'ARCHIVE_TENANT',
            entityType: 'TENANT',
            entityId: tenantId,
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.json({ message: "Locataire archivé" });

    } catch (error) {
        console.error('Error archiving tenant:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/locataires/:id/approve - Valider une demande
router.post('/:id/approve', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.params.id;
        const userRole = req.user.role || req.userRole;
        const userType = req.user.user_type;
        const ownerId = await getManagedOwnerId(userId, userRole, userType);

        if (ownerId === null) return res.status(403).json({ message: "Non autorisé" });

        // Vérif appartenance — si admin (ownerId=-1), on vérifie juste l'existence du tenant
        const tenantCheck = ownerId === -1
            ? await pool.query('SELECT id FROM tenants WHERE id = $1', [tenantId])
            : await pool.query('SELECT id FROM tenants WHERE id = $1 AND owner_id = $2', [tenantId, ownerId]);
        if (tenantCheck.rows.length === 0) return res.status(404).json({ message: "Locataire non trouvé" });

        await pool.query("UPDATE tenants SET statut = 'Actif' WHERE id = $1", [tenantId]);

        // Notification au locataire
        const tenantData = await pool.query('SELECT user_id, nom FROM tenants WHERE id = $1', [tenantId]);
        if (tenantData.rows.length > 0 && tenantData.rows[0].user_id) {
            const tenantUserId = tenantData.rows[0].user_id;
            await pool.query(
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
router.post('/:id/reject', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const tenantId = req.params.id;
        const userRole = req.user.role || req.userRole;
        const userType = req.user.user_type;
        const ownerId = await getManagedOwnerId(userId, userRole, userType);

        if (ownerId === null) return res.status(403).json({ message: "Non autorisé" });

        // Vérif appartenance — si admin (ownerId=-1), on vérifie juste l'existence du tenant
        const tenantCheck = ownerId === -1
            ? await pool.query('SELECT id FROM tenants WHERE id = $1', [tenantId])
            : await pool.query('SELECT id FROM tenants WHERE id = $1 AND owner_id = $2', [tenantId, ownerId]);
        if (tenantCheck.rows.length === 0) return res.status(404).json({ message: "Locataire non trouvé" });

        await pool.query("UPDATE tenants SET statut = 'Rejeté' WHERE id = $1", [tenantId]);

        // Notification au locataire
        const tenantData = await pool.query('SELECT user_id FROM tenants WHERE id = $1', [tenantId]);
        if (tenantData.rows.length > 0 && tenantData.rows[0].user_id) {
            const tenantUserId = tenantData.rows[0].user_id;
            await pool.query(
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
export default router;
