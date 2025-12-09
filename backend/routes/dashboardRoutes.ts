// backend/routes/dashboardRoutes.ts

import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

dotenv.config();

const router = Router();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});


// GET /api/dashboard/stats : Calculer les statistiques financières clés pour le gestionnaire
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Seul le gestionnaire a accès aux statistiques globales.
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    const gestionnaireId = req.userId;
    
    try {
        // --- 1. Total des Biens gérés ---
        const totalBiensResult = await pool.query(
            'SELECT COUNT(*) FROM biens WHERE id_gestionnaire = $1', 
            [gestionnaireId]
        );
        const totalBiens = parseInt(totalBiensResult.rows[0].count, 10);

        // --- 2. Total des Revenus (Paiements) ---
        // Jointure pour s'assurer que les paiements proviennent bien des biens gérés par ce gestionnaire
        const revenusResult = await pool.query(
            `SELECT COALESCE(SUM(p.montant), 0) AS total_revenus
             FROM paiements p
             JOIN baux bx ON bx.id = p.id_bail
             JOIN biens bi ON bi.id = bx.id_bien
             WHERE bi.id_gestionnaire = $1`,
            [gestionnaireId]
        );
        const totalRevenus = parseFloat(revenusResult.rows[0].total_revenus) || 0;

        // --- 3. Total des Dépenses ---
        const depensesResult = await pool.query(
            'SELECT COALESCE(SUM(montant), 0) AS total_depenses FROM depenses WHERE id_gestionnaire = $1',
            [gestionnaireId]
        );
        const totalDepenses = parseFloat(depensesResult.rows[0].total_depenses) || 0;

        // --- 4. Calcul de la Marge Nette ---
        const margeNette = totalRevenus - totalDepenses;

        // --- 5. Total des Locataires Actifs ---
        // (Les locataires associés à au moins un bail ACTIF pour un bien géré)
        const locatairesActifsResult = await pool.query(
            `SELECT COUNT(DISTINCT l.id_locataire) AS count
             FROM locataires l
             JOIN baux bx ON bx.id_locataire = l.id_locataire
             JOIN biens bi ON bi.id = bx.id_bien
             WHERE bi.id_gestionnaire = $1 AND bx.statut = 'Actif'`,
            [gestionnaireId]
        );
        const locatairesActifs = parseInt(locatairesActifsResult.rows[0].count, 10);


        res.status(200).json({
            stats: {
                totalBiens,
                locatairesActifs,
                totalRevenus: totalRevenus.toFixed(2),
                totalDepenses: totalDepenses.toFixed(2),
                margeNette: margeNette.toFixed(2),
                // Pourcentage (simple pour le MVP)
                rentabilitePourcentage: totalRevenus > 0 ? ((margeNette / totalRevenus) * 100).toFixed(2) : '0.00'
            }
        });

    } catch (error) {
        console.error('Erreur récupération stats dashboard:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.' });
    }
});


export default router;