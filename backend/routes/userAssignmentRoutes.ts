import { Router } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const router = Router();

import pool from '../db/database';

// PUT /api/user-assignments/bulk/:userId
// Bulk update assignments for a user with granular permissions
// NOTE: This route MUST be defined BEFORE /:userId to avoid path conflicts
router.put('/bulk/:userId', async (req: any, res) => {
    try {
        const { userId } = req.params;
        const { assignments } = req.body; // Array of { owner_id, role, permissions }

        if (!assignments || !Array.isArray(assignments)) {
            return res.status(400).json({ message: 'Assignments array required' });
        }

        // Deactivate all current assignments
        await pool.query(
            'UPDATE owner_user SET is_active = false WHERE user_id = $1',
            [userId]
        );

        // Reactivate/Insert selected
        for (const assign of assignments) {
            const { owner_id, role, permissions } = assign;
             await pool.query(`
                INSERT INTO owner_user (
                    user_id, owner_id, role, is_active, start_date,
                    can_view_finances, can_edit_properties, can_manage_tenants,
                    can_manage_contracts, can_validate_payments, can_manage_users,
                    can_delete_data
                )
                VALUES ($1, $2, $3, true, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id, owner_id) 
                DO UPDATE SET 
                    is_active = true,
                    role = EXCLUDED.role,
                    can_view_finances = EXCLUDED.can_view_finances,
                    can_edit_properties = EXCLUDED.can_edit_properties,
                    can_manage_tenants = EXCLUDED.can_manage_tenants,
                    can_manage_contracts = EXCLUDED.can_manage_contracts,
                    can_validate_payments = EXCLUDED.can_validate_payments,
                    can_manage_users = EXCLUDED.can_manage_users,
                    can_delete_data = EXCLUDED.can_delete_data
            `, [
                userId, owner_id, role || 'viewer',
                permissions?.can_view_finances || false,
                permissions?.can_edit_properties || false,
                permissions?.can_manage_tenants || false,
                permissions?.can_manage_contracts || false,
                permissions?.can_validate_payments || false,
                permissions?.can_manage_users || false,
                permissions?.can_delete_data || false
            ]);
        }

        res.json({ message: 'Affectations mises à jour', count: assignments.length });
    } catch (error) {
        console.error('Error bulk updating assignments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/user-assignments/by-owner/:ownerId
// Get all users assigned to a specific owner
// NOTE: This route MUST be defined BEFORE /:userId 
router.get('/by-owner/:ownerId', async (req, res) => {
    try {
        const { ownerId } = req.params;
        const result = await pool.query(`
            SELECT 
                ou.user_id,
                ou.start_date as assigned_at,
                u.nom as user_name,
                u.email,
                ou.role
            FROM owner_user ou
            JOIN users u ON u.id = ou.user_id
            WHERE ou.owner_id = $1 AND ou.is_active = true
            ORDER BY u.nom
        `, [ownerId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users for owner:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/user-assignments/:userId
// Get all owner assignments for a specific user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT 
                ou.user_id,
                ou.owner_id,
                ou.role,
                ou.is_active,
                ou.start_date as assigned_at,
                o.name as owner_name,
                o.type as type_proprietaire,
                ou.can_view_finances,
                ou.can_edit_properties,
                ou.can_manage_tenants,
                ou.can_manage_contracts,
                ou.can_validate_payments,
                ou.can_manage_users,
                ou.can_delete_data,
                ou.can_access_audit_logs
            FROM owner_user ou
            JOIN owners o ON o.id = ou.owner_id
            WHERE ou.user_id = $1 AND ou.is_active = true
            ORDER BY o.name
        `, [userId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/user-assignments
// Assign a user to an owner with permissions
router.post('/', async (req: any, res) => {
    try {
        const { user_id, owner_id, role, permissions } = req.body;
        // permissions = { can_view_finances: true, ... }

        const query = `
            INSERT INTO owner_user (
                user_id, owner_id, role, is_active, start_date,
                can_view_finances, can_edit_properties, can_manage_tenants,
                can_manage_contracts, can_validate_payments, can_manage_users,
                can_delete_data
            )
            VALUES ($1, $2, $3, true, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (user_id, owner_id) DO UPDATE SET
                role = EXCLUDED.role,
                is_active = true,
                can_view_finances = EXCLUDED.can_view_finances,
                can_edit_properties = EXCLUDED.can_edit_properties,
                can_manage_tenants = EXCLUDED.can_manage_tenants,
                can_manage_contracts = EXCLUDED.can_manage_contracts,
                can_validate_payments = EXCLUDED.can_validate_payments,
                can_manage_users = EXCLUDED.can_manage_users,
                can_delete_data = EXCLUDED.can_delete_data
            RETURNING *
        `;

        const result = await pool.query(query, [
            user_id, owner_id, role || 'viewer',
            permissions?.can_view_finances || false,
            permissions?.can_edit_properties || false,
            permissions?.can_manage_tenants || false,
            permissions?.can_manage_contracts || false,
            permissions?.can_validate_payments || false,
            permissions?.can_manage_users || false,
            permissions?.can_delete_data || false
        ]);

        res.status(201).json({ message: 'Affectation créée/mise à jour', assignment: result.rows[0] });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/user-assignments/:userId/:ownerId
// Remove an assignment (soft delete)
router.delete('/:userId/:ownerId', async (req, res) => {
    try {
        const { userId, ownerId } = req.params;
        await pool.query(
            'UPDATE owner_user SET is_active = false WHERE user_id = $1 AND owner_id = $2',
            [userId, ownerId]
        );
        res.json({ message: 'Affectation supprimée' });
    } catch (error) {
        console.error('Error removing assignment:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
