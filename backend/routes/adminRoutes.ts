
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

export default router;
