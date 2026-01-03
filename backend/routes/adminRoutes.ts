
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db/database';

const router = Router();

// Endpoint d'urgence pour exécuter la migration manuellement
// Usage: GET /api/admin/run-migration?secret=Hope2026
router.get('/run-migration', async (req: Request, res: Response) => {
    const secret = req.query.secret;
    
    // Protection basique
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit. Code secret invalide.' });
    }

    try {
        const migrationPath = path.join(__dirname, '../migrations/add_owner_fields.sql');
        
        if (!fs.existsSync(migrationPath)) {
            return res.status(404).json({ message: 'Fichier de migration non trouvé.' });
        }

        const sql = fs.readFileSync(migrationPath, 'utf8');

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
