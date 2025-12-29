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


// GET /api/dashboard/stats/gestionnaire : Stats globales pour le gestionnaire
router.get('/stats/gestionnaire', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'gestionnaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    try {
        // Total des bâtiments
        const buildingsResult = await pool.query('SELECT COUNT(*) FROM buildings');
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);

        // Total des lots
        const lotsResult = await pool.query('SELECT COUNT(*) FROM lots');
        const totalLots = parseInt(lotsResult.rows[0].count, 10);

        // Lots occupés
        const occupiedResult = await pool.query("SELECT COUNT(*) FROM lots WHERE statut = 'occupe'");
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);

        // Taux d'occupation
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;

        // Total revenus (paiements du mois en cours)
        const revenusResult = await pool.query(`
            SELECT COALESCE(SUM(montant), 0) as total 
            FROM payments 
            WHERE EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
        `);
        const revenusMois = parseFloat(revenusResult.rows[0].total) || 0;

        // Impayés (estimation basée sur les contrats actifs sans paiement ce mois)
        const impayesResult = await pool.query(`
            SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
            FROM leases l
            WHERE l.statut = 'actif'
            AND NOT EXISTS (
                SELECT 1 FROM payments p 
                WHERE p.lease_id = l.id 
                AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            )
        `);
        const impayesEnCours = parseFloat(impayesResult.rows[0].total) || 0;

        // Locataires actifs
        const tenantsResult = await pool.query(`
            SELECT COUNT(DISTINCT tenant_id) FROM leases WHERE statut = 'actif'
        `);
        const locatairesActifs = parseInt(tenantsResult.rows[0].count, 10);

        res.status(200).json({
            stats: {
                totalBiens,
                totalLots,
                lotsOccupes,
                tauxOccupation,
                revenusMois,
                impayesEnCours,
                locatairesActifs
            }
        });

    } catch (error) {
        console.error('Erreur récupération stats gestionnaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});


// GET /api/dashboard/stats/proprietaire : Stats filtrées par owner_id
router.get('/stats/proprietaire', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'proprietaire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    const userId = req.userId;
    
    try {
        // Trouver l'owner_id associé à cet utilisateur
        const ownerResult = await pool.query(`
            SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE LIMIT 1
        `, [userId]);
        
        if (ownerResult.rows.length === 0) {
            return res.status(200).json({
                stats: {
                    totalBiens: 0,
                    totalLots: 0,
                    tauxOccupation: 0,
                    revenusMois: 0,
                    impayesEnCours: 0
                }
            });
        }
        
        const ownerId = ownerResult.rows[0].owner_id;

        // Total des bâtiments de ce propriétaire
        const buildingsResult = await pool.query(
            'SELECT COUNT(*) FROM buildings WHERE owner_id = $1', 
            [ownerId]
        );
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);

        // Total des lots de ce propriétaire
        const lotsResult = await pool.query(
            'SELECT COUNT(*) FROM lots WHERE owner_id = $1', 
            [ownerId]
        );
        const totalLots = parseInt(lotsResult.rows[0].count, 10);

        // Lots occupés
        const occupiedResult = await pool.query(
            "SELECT COUNT(*) FROM lots WHERE owner_id = $1 AND statut = 'occupe'", 
            [ownerId]
        );
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);

        // Taux d'occupation
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;

        // Revenus du mois pour ce propriétaire
        const revenusResult = await pool.query(`
            SELECT COALESCE(SUM(montant), 0) as total 
            FROM payments 
            WHERE owner_id = $1
            AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
        `, [ownerId]);
        const revenusMois = parseFloat(revenusResult.rows[0].total) || 0;

        // Impayés pour ce propriétaire
        const impayesResult = await pool.query(`
            SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
            FROM leases l
            WHERE l.owner_id = $1 AND l.statut = 'actif'
            AND NOT EXISTS (
                SELECT 1 FROM payments p 
                WHERE p.lease_id = l.id 
                AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
            )
        `, [ownerId]);
        const impayesEnCours = parseFloat(impayesResult.rows[0].total) || 0;

        res.status(200).json({
            stats: {
                totalBiens,
                totalLots,
                lotsOccupes,
                tauxOccupation,
                revenusMois,
                impayesEnCours
            }
        });

    } catch (error) {
        console.error('Erreur récupération stats propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});


// GET /api/dashboard/stats/locataire : Stats pour un locataire
router.get('/stats/locataire', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'locataire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    
    const userId = req.userId;
    
    try {
        // Trouver le tenant associé à cet utilisateur (via email ou téléphone)
        // Note: Cette logique suppose qu'un utilisateur locataire est lié à un tenant
        const userResult = await pool.query('SELECT email, telephone FROM users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        
        const userEmail = userResult.rows[0].email;
        const userPhone = userResult.rows[0].telephone;
        
        // Chercher le tenant correspondant
        const tenantResult = await pool.query(`
            SELECT t.id, t.nom, t.prenoms
            FROM tenants t
            WHERE t.email = $1 OR t.telephone_principal = $2
            LIMIT 1
        `, [userEmail, userPhone]);
        
        if (tenantResult.rows.length === 0) {
            return res.status(200).json({
                stats: {
                    nomLogement: 'Aucun logement',
                    loyerMensuel: 0,
                    prochainPaiement: null,
                    statutContrat: 'inactif'
                }
            });
        }
        
        const tenantId = tenantResult.rows[0].id;
        
        // Trouver le bail actif du locataire
        const leaseResult = await pool.query(`
            SELECT l.id, l.loyer_actuel, l.jour_echeance, l.statut, l.date_debut, l.date_fin,
                   lo.ref_lot, b.nom as nom_immeuble
            FROM leases l
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE l.tenant_id = $1 AND l.statut = 'actif'
            ORDER BY l.date_debut DESC
            LIMIT 1
        `, [tenantId]);
        
        if (leaseResult.rows.length === 0) {
            return res.status(200).json({
                stats: {
                    nomLogement: 'Aucun bail actif',
                    loyerMensuel: 0,
                    prochainPaiement: null,
                    statutContrat: 'inactif'
                }
            });
        }
        
        const lease = leaseResult.rows[0];
        const nomLogement = `${lease.ref_lot} - ${lease.nom_immeuble}`;
        const loyerMensuel = parseFloat(lease.loyer_actuel) || 0;
        
        // Calculer la prochaine date d'échéance
        const today = new Date();
        const jourEcheance = lease.jour_echeance || 5;
        let prochainPaiement = new Date(today.getFullYear(), today.getMonth(), jourEcheance);
        if (prochainPaiement < today) {
            prochainPaiement = new Date(today.getFullYear(), today.getMonth() + 1, jourEcheance);
        }
        
        res.status(200).json({
            stats: {
                nomLogement,
                loyerMensuel,
                prochainPaiement: prochainPaiement.toISOString().split('T')[0],
                statutContrat: lease.statut,
                dateDebut: lease.date_debut,
                dateFin: lease.date_fin
            }
        });

    } catch (error) {
        console.error('Erreur récupération stats locataire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});


export default router;