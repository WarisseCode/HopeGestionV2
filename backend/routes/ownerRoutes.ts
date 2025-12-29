// backend/routes/ownerRoutes.ts
import { Router, Response } from 'express';
import { protect, AuthenticatedRequest } from '../middleware/authMiddleware';
import { checkOwnerAccess } from '../middleware/ownerIsolation';
import db from '../db/database';

const router = Router();

// GET /api/owners - Liste des propriétaires
router.get('/', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        let query = '';
        let params: any[] = [];

        if (userRole === 'admin' || userRole === 'manager') {
            query = `
                SELECT o.*, 
                    (SELECT COUNT(*) FROM buildings WHERE owner_id = o.id) as total_properties,
                    (SELECT COUNT(*) FROM lots WHERE owner_id = o.id) as total_lots
                FROM owners o
                WHERE o.is_active = TRUE
                ORDER BY o.created_at DESC
            `;
        } else {
            query = `
                SELECT DISTINCT o.*, 
                    (SELECT COUNT(*) FROM buildings WHERE owner_id = o.id) as total_properties,
                    (SELECT COUNT(*) FROM lots WHERE owner_id = o.id) as total_lots
                FROM owners o
                INNER JOIN owner_user ou ON o.id = ou.owner_id
                WHERE ou.user_id = $1 AND ou.is_active = TRUE AND o.is_active = TRUE
                ORDER BY o.created_at DESC
            `;
            params = [userId];
        }

        const result = await db.query(query, params);
        res.json({ success: true, owners: result.rows });
    } catch (error) {
        console.error('Error fetching owners:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// GET /api/owners/:id - Détails d'un propriétaire
router.get('/:id', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ownerId = req.params.id;

        const ownersResult = await db.query(
            `SELECT * FROM owners WHERE id = $1 AND is_active = TRUE`,
            [ownerId]
        );

        if (ownersResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Propriétaire non trouvé' });
        }

        const usersResult = await db.query(
            `SELECT u.id, u.nom, u.email, u.role, ou.role as assignment_role,
                    ou.can_view_finances, ou.can_edit_properties, ou.can_manage_tenants,
                    ou.start_date, ou.end_date, ou.is_active
             FROM users u
             INNER JOIN owner_user ou ON u.id = ou.user_id
             WHERE ou.owner_id = $1`,
            [ownerId]
        );

        res.json({ 
            success: true, 
            owner: ownersResult.rows[0],
            users: usersResult.rows
        });
    } catch (error) {
        console.error('Error fetching owner details:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST /api/owners - Créer un nouveau propriétaire
router.post('/', protect, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            type, name, first_name, phone, phone_secondary, email,
            address, city, country, id_number, photo, mobile_money_number, management_mode
        } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Nom et téléphone sont obligatoires' });
        }

        const existingResult = await db.query('SELECT id FROM owners WHERE phone = $1', [phone]);
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé' });
        }

        const result = await db.query(
            `INSERT INTO owners (
                type, name, first_name, phone, phone_secondary, email,
                address, city, country, id_number, photo, mobile_money_number, management_mode
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [
                type || 'individual', name, first_name, phone, phone_secondary, email,
                address, city, country || 'Bénin', id_number, photo, mobile_money_number, management_mode || 'direct'
            ]
        );

        const ownerId = result.rows[0].id;
        const userId = req.userId;

        await db.query(
            `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
             VALUES ($1, $2, 'owner', CURRENT_DATE, TRUE)`,
            [ownerId, userId]
        );

        res.status(201).json({ success: true, message: 'Propriétaire créé avec succès', ownerId });
    } catch (error) {
        console.error('Error creating owner:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// PUT /api/owners/:id - Modifier un propriétaire
router.put('/:id', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ownerId = req.params.id;
        const {
            type, name, first_name, phone, phone_secondary, email,
            address, city, country, id_number, photo, mobile_money_number, management_mode
        } = req.body;

        await db.query(
            `UPDATE owners SET
                type = $1, name = $2, first_name = $3, phone = $4, phone_secondary = $5,
                email = $6, address = $7, city = $8, country = $9, id_number = $10,
                photo = $11, mobile_money_number = $12, management_mode = $13, updated_at = CURRENT_TIMESTAMP
             WHERE id = $14`,
            [type, name, first_name, phone, phone_secondary, email, address, city, country, id_number, photo, mobile_money_number, management_mode, ownerId]
        );

        res.json({ success: true, message: 'Propriétaire modifié avec succès' });
    } catch (error) {
        console.error('Error updating owner:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// DELETE /api/owners/:id - Désactiver un propriétaire
router.delete('/:id', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        await db.query('UPDATE owners SET is_active = FALSE WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Propriétaire désactivé avec succès' });
    } catch (error) {
        console.error('Error deleting owner:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// POST /api/owners/:id/users - Affecter un utilisateur
router.post('/:id/users', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ownerId = req.params.id;
        const {
            user_id, role, can_view_finances, can_edit_properties,
            can_manage_tenants, can_manage_contracts, can_validate_payments,
            start_date, end_date
        } = req.body;

        const usersResult = await db.query('SELECT id FROM users WHERE id = $1', [user_id]);
        if (usersResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
        }

        await db.query(
            `INSERT INTO owner_user (
                owner_id, user_id, role, can_view_finances, can_edit_properties,
                can_manage_tenants, can_manage_contracts, can_validate_payments,
                start_date, end_date, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
            ON CONFLICT (owner_id, user_id) DO UPDATE SET
                role = EXCLUDED.role, can_view_finances = EXCLUDED.can_view_finances,
                can_edit_properties = EXCLUDED.can_edit_properties,
                can_manage_tenants = EXCLUDED.can_manage_tenants,
                can_manage_contracts = EXCLUDED.can_manage_contracts,
                can_validate_payments = EXCLUDED.can_validate_payments,
                start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, is_active = TRUE`,
            [
                ownerId, user_id, role || 'viewer', can_view_finances || false,
                can_edit_properties || false, can_manage_tenants || false,
                can_manage_contracts || false, can_validate_payments || false,
                start_date || new Date().toISOString().split('T')[0], end_date || null
            ]
        );

        res.status(201).json({ success: true, message: 'Utilisateur affecté avec succès' });
    } catch (error) {
        console.error('Error assigning user to owner:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// DELETE /api/owners/:id/users/:userId - Retirer un utilisateur
router.delete('/:id/users/:userId', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id: ownerId, userId } = req.params;
        await db.query(
            'UPDATE owner_user SET is_active = FALSE, end_date = CURRENT_DATE WHERE owner_id = $1 AND user_id = $2',
            [ownerId, userId]
        );
        res.json({ success: true, message: 'Utilisateur retiré avec succès' });
    } catch (error) {
        console.error('Error removing user from owner:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// GET /api/owners/:id/properties - Biens d'un propriétaire
router.get('/:id/properties', protect, checkOwnerAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await db.query(
            `SELECT b.*, 
                    (SELECT COUNT(*) FROM lots WHERE building_id = b.id) as total_lots
             FROM buildings b
             WHERE b.owner_id = $1
             ORDER BY b.created_at DESC`,
            [req.params.id]
        );
        res.json({ success: true, properties: result.rows });
    } catch (error) {
        console.error('Error fetching owner properties:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

export default router;
