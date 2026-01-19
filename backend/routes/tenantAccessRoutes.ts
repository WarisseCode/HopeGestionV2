// backend/routes/tenantAccessRoutes.ts
// Manages tenant portal access control

import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import crypto from 'crypto';

const router = express.Router();

/**
 * Helper: Get managed owner ID for the connected user
 */
const getManagedOwnerId = async (userId: number): Promise<number | null> => {
    const result = await pool.query(
        `SELECT owner_id FROM owner_user 
         WHERE user_id = $1 AND is_active = TRUE 
         ORDER BY (CASE WHEN role='owner' THEN 1 ELSE 2 END) LIMIT 1`,
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};

/**
 * Verify tenant belongs to manager's owner
 */
const verifyTenantAccess = async (tenantId: number, ownerId: number): Promise<boolean> => {
    const result = await pool.query(
        'SELECT id FROM tenants WHERE id = $1 AND owner_id = $2',
        [tenantId, ownerId]
    );
    return result.rows.length > 0;
};

// GET /api/tenant-access/:tenantId - Get access config
router.get('/:tenantId', protect, permissions.canRead('locataires'), async (req: any, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: 'Non autorisé' });
        if (!(await verifyTenantAccess(tenantId, ownerId))) {
            return res.status(404).json({ message: 'Locataire non trouvé' });
        }

        const result = await pool.query(
            'SELECT * FROM tenant_access WHERE tenant_id = $1',
            [tenantId]
        );

        if (result.rows.length === 0) {
            // No access config yet, return defaults
            return res.json({
                tenant_id: tenantId,
                is_active: false,
                access_modules: { contrat: true, paiements: true, plaintes: true, services: false },
                allow_online_payment: false,
                notification_channel: 'whatsapp',
                access_code: null
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/tenant-access/:tenantId - Update access config
router.put('/:tenantId', protect, permissions.canWrite('locataires'), async (req: any, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: 'Non autorisé' });
        if (!(await verifyTenantAccess(tenantId, ownerId))) {
            return res.status(404).json({ message: 'Locataire non trouvé' });
        }

        const { access_modules, allow_online_payment, notification_channel } = req.body;

        // Upsert access config
        const result = await pool.query(`
            INSERT INTO tenant_access (tenant_id, access_modules, allow_online_payment, notification_channel)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id) DO UPDATE SET
                access_modules = EXCLUDED.access_modules,
                allow_online_payment = EXCLUDED.allow_online_payment,
                notification_channel = EXCLUDED.notification_channel,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [
            tenantId,
            JSON.stringify(access_modules || { contrat: true, paiements: true, plaintes: true, services: false }),
            allow_online_payment || false,
            notification_channel || 'whatsapp'
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tenant-access/:tenantId/activate - Activate tenant access and generate code
router.post('/:tenantId/activate', protect, permissions.canWrite('locataires'), async (req: any, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: 'Non autorisé' });
        if (!(await verifyTenantAccess(tenantId, ownerId))) {
            return res.status(404).json({ message: 'Locataire non trouvé' });
        }

        // Generate unique access code
        const accessCode = crypto.randomBytes(16).toString('hex');

        const result = await pool.query(`
            INSERT INTO tenant_access (tenant_id, is_active, access_code)
            VALUES ($1, TRUE, $2)
            ON CONFLICT (tenant_id) DO UPDATE SET
                is_active = TRUE,
                access_code = EXCLUDED.access_code,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [tenantId, accessCode]);

        res.json({
            message: 'Accès activé',
            access_code: accessCode,
            access: result.rows[0]
        });
    } catch (error) {
        console.error('Error activating tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/tenant-access/:tenantId/suspend - Suspend tenant access
router.post('/:tenantId/suspend', protect, permissions.canWrite('locataires'), async (req: any, res) => {
    try {
        const tenantId = parseInt(req.params.tenantId);
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);

        if (!ownerId) return res.status(403).json({ message: 'Non autorisé' });
        if (!(await verifyTenantAccess(tenantId, ownerId))) {
            return res.status(404).json({ message: 'Locataire non trouvé' });
        }

        await pool.query(`
            UPDATE tenant_access SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = $1
        `, [tenantId]);

        res.json({ message: 'Accès suspendu' });
    } catch (error) {
        console.error('Error suspending tenant access:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
