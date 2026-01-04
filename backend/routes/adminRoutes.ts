
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db/database';

const router = Router();

// Endpoint d'urgence pour exécuter la migration manuellement
// Usage: GET /api/admin/run-migration?secret=Hope2026
// Endpoint d'urgence pour exécuter la migration manuellement
// Usage: GET /api/admin/run-migration?secret=Hope2026
router.get('/run-migration', async (req: Request, res: Response) => {
    const secret = req.query.secret;
    
    // Protection basique
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit. Code secret invalide.' });
    }

    try {
        console.log('Début de la migration manuelle...');
        
        // SQL Migration Hardcodé pour éviter les problèmes de chemin de fichier sur Render/Dist
        const sql = `
            -- Migration: Add mobile_money_coordinates and RCCM fields to owners table
            -- Date: 2026-01-03
            
            -- Add mobile_money_coordinates column (if not exists)
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'owners' AND column_name = 'mobile_money_coordinates'
                ) THEN
                    ALTER TABLE owners ADD COLUMN mobile_money_coordinates VARCHAR(255);
                    COMMENT ON COLUMN owners.mobile_money_coordinates IS 'Mobile Money account details (operator, number, account name)';
                END IF;
            END $$;

            -- Add rccm_number column (if not exists)
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'owners' AND column_name = 'rccm_number'
                ) THEN
                    ALTER TABLE owners ADD COLUMN rccm_number VARCHAR(100);
                    COMMENT ON COLUMN owners.rccm_number IS 'RCCM registration number for legal entities (personne morale)';
                END IF;
            END $$;
        `;

        // Exécuter le SQL
        await db.query(sql);

        res.status(200).json({ 
            message: 'Migration exécutée avec succès !',
            details: 'Les colonnes mobile_money_coordinates et rccm_number ont été ajoutées.'
        });

    } catch (error: any) {
        console.error('Erreur migration:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la migration', 
            error: error.message 
        });
    }
});

// Endpoint pour vérifier la structure de la table owners
router.get('/check-schema', async (req: Request, res: Response) => {
    try {
        const result = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'owners'
        `);
        res.json({ columns: result.rows });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ==============================================
// ENDPOINTS DE DIAGNOSTIC - UTILISATEURS
// ==============================================

// Lister tous les utilisateurs (pour diagnostic)
// Usage: GET /api/admin/users?secret=Hope2026
router.get('/users', async (req: Request, res: Response) => {
    const secret = req.query.secret;
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit.' });
    }

    try {
        const result = await db.query(`
            SELECT id, email, nom, role, user_type, statut, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);
        res.json({ 
            total: result.rows.length,
            users: result.rows 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Réparer les rôles manquants (role = NULL -> role = user_type)
// Usage: GET /api/admin/fix-roles?secret=Hope2026
router.get('/fix-roles', async (req: Request, res: Response) => {
    const secret = req.query.secret;
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit.' });
    }

    try {
        // Compter les utilisateurs affectés avant
        const beforeCount = await db.query(`SELECT COUNT(*) as count FROM users WHERE role IS NULL`);
        
        // Réparer : copier user_type dans role si role est NULL
        await db.query(`UPDATE users SET role = user_type WHERE role IS NULL`);
        
        // Aussi réparer si role est vide mais user_type ne l'est pas
        await db.query(`UPDATE users SET role = user_type WHERE role = '' AND user_type IS NOT NULL AND user_type != ''`);
        
        // Compter après
        const afterResult = await db.query(`SELECT id, email, role, user_type FROM users`);
        
        res.json({ 
            message: `${beforeCount.rows[0].count} utilisateur(s) réparé(s) !`,
            users: afterResult.rows 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Définir manuellement le rôle d'un utilisateur
// Usage: GET /api/admin/set-role?secret=Hope2026&email=user@example.com&role=gestionnaire
router.get('/set-role', async (req: Request, res: Response) => {
    const { secret, email, role } = req.query;
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit.' });
    }
    if (!email || !role) {
        return res.status(400).json({ message: 'email et role sont requis.' });
    }

    const validRoles = ['admin', 'gestionnaire', 'manager', 'proprietaire', 'locataire', 'comptable', 'agent_recouvreur'];
    if (!validRoles.includes(role as string)) {
        return res.status(400).json({ message: `Rôle invalide. Valeurs acceptées: ${validRoles.join(', ')}` });
    }

    try {
        const result = await db.query(
            `UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, role, user_type`,
            [role, email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: `Utilisateur avec email ${email} non trouvé.` });
        }
        
        res.json({ 
            message: `Rôle mis à jour pour ${email}`,
            user: result.rows[0] 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
