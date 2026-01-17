// backend/routes/leaseRoutes.ts
// Routes for managing leases (baux/locations)

import { Router, Response } from 'express';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import fs from 'fs';
import path from 'path';
import { NotificationService } from '../services/notificationService';

dotenv.config();

const router = Router();
import pool from '../db/database';

// GET /api/locations - Liste des baux/contrats
router.get('/', permissions.canRead('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { statut, owner_id } = req.query;
        
        let query = `
            SELECT 
                l.id,
                l.reference_bail,
                l.date_debut,
                l.date_fin,
                l.loyer_actuel as loyer_mensuel,
                l.caution,
                l.avance,
                l.charges_mensuelles,
                l.statut,
                l.devise,
                l.type_paiement,
                l.jour_echeance,
                l.duree_contrat,
                l.contrat_genere,
                l.type_contrat,
                l.prix_vente,
                l.conditions_particulieres,
                l.created_at,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                t.telephone_principal as locataire_telephone,
                t.photo_profil_url as locataire_photo,
                lot.ref_lot,
                lot.type as lot_type,
                b.nom as immeuble_nom,
                o.name as proprietaire_nom,
                o.id as owner_id
            FROM leases l
            LEFT JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lot ON l.lot_id = lot.id
            LEFT JOIN buildings b ON lot.building_id = b.id
            LEFT JOIN owners o ON l.owner_id = o.id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramIndex = 1;

        if (statut) {
            query += ` AND l.statut = $${paramIndex}`;
            params.push(statut);
            paramIndex++;
        }

        if (owner_id) {
            query += ` AND l.owner_id = $${paramIndex}`;
            params.push(owner_id);
            paramIndex++;
        }

        // AUTO-FILTER FOR GUEST USERS: Use issuer's data context
        if (req.user?.isGuest && req.user?.issuerId) {
            query += ` AND l.owner_id = $${paramIndex}`;
            params.push(req.user.issuerId);
            paramIndex++;
        }

        query += ` ORDER BY l.created_at DESC`;

        const result = await pool.query(query, params);
        
        res.json({ locations: result.rows });
    } catch (error) {
        console.error('Error fetching leases:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locations/:id - Détails d'un bail/contrat
router.get('/:id', permissions.canRead('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                l.*,
                l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                t.telephone_principal as locataire_telephone,
                t.email as locataire_email,
                lot.ref_lot,
                lot.type as lot_type,
                lot.superficie,
                b.nom as immeuble_nom,
                b.adresse as immeuble_adresse,
                o.name as proprietaire_nom
            FROM leases l
            LEFT JOIN tenants t ON l.tenant_id = t.id
            LEFT JOIN lots lot ON l.lot_id = lot.id
            LEFT JOIN buildings b ON lot.building_id = b.id
            LEFT JOIN owners o ON l.owner_id = o.id
            WHERE l.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Contrat non trouvé' });
        }

        // Get payment schedule if exists
        const schedules = await pool.query(
            'SELECT * FROM payment_schedules WHERE lease_id = $1 ORDER BY numero_echeance',
            [id]
        );

        res.json({ 
            location: result.rows[0],
            echeancier: schedules.rows
        });
    } catch (error) {
        console.error('Error fetching lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locations - Créer un contrat (Affectation)
router.post('/', permissions.canWrite('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            tenant_id,
            lot_id,
            owner_id,
            type_contrat = 'location', // par défaut
            date_debut,
            date_fin,
            duree_contrat,
            loyer_mensuel,
            caution,
            avance,
            charges_mensuelles,
            devise,
            type_paiement,
            jour_echeance,
            penalite_retard,
            tolerance_jours,
            // Nouveaux champs pour Vente/Autre
            prix_vente,
            apport_initial,
            modalite_paiement,
            date_expiration,
            conditions_particulieres
        } = req.body;

        // Validate required fields based on type
        if (!tenant_id || !lot_id || !owner_id || !date_debut) {
            return res.status(400).json({ message: 'Champs obligatoires manquants (Client, Lot, Propriétaire, Date début)' });
        }

        if (type_contrat === 'location' && !loyer_mensuel) {
            return res.status(400).json({ message: 'Le loyer est requis pour une location' });
        }

        if (type_contrat === 'vente' && !prix_vente) {
             return res.status(400).json({ message: 'Le prix de vente est requis pour une vente' });
        }

        // Check if lot is already occupied/reserved
        const lotCheck = await pool.query(
            "SELECT id FROM leases WHERE lot_id = $1 AND statut IN ('actif', 'signe')",
            [lot_id]
        );
        if (lotCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Ce lot a déjà une affectation active' });
        }

        // Generate reference based on type
        const refResult = await pool.query("SELECT COUNT(*) FROM leases");
        const count = parseInt(refResult.rows[0].count) + 1;
        const prefix = type_contrat === 'vente' ? 'VTE' : type_contrat === 'reservation' ? 'RES' : 'BAIL';
        const reference_bail = `${prefix}-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

        // Insert lease/contract
        const result = await pool.query(`
            INSERT INTO leases (
                tenant_id, lot_id, owner_id, reference_bail, type_contrat,
                date_debut, date_fin, duree_contrat, loyer_actuel,
                caution, avance, charges_mensuelles, devise,
                type_paiement, jour_echeance, penalite_retard, tolerance_jours,
                prix_vente, apport_initial, modalite_paiement, date_expiration, conditions_particulieres,
                statut, gestionnaire_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'actif', $23)
            RETURNING *
        `, [
            tenant_id, lot_id, owner_id, reference_bail, type_contrat,
            date_debut, date_fin || null, duree_contrat || 12, loyer_mensuel || 0,
            caution || 0, avance || 0, charges_mensuelles || 0, devise || 'XOF',
            type_paiement || 'classique', jour_echeance || 1, penalite_retard || 0, tolerance_jours || 0,
            prix_vente || null, apport_initial || null, modalite_paiement || null, date_expiration || null, conditions_particulieres || null,
            req.userId
        ]);

        // Determine new lot status
        let newLotStatus = 'loue';
        if (type_contrat === 'vente') newLotStatus = 'vendu';
        if (type_contrat === 'reservation') newLotStatus = 'reserve';

        // Update lot status
        await pool.query("UPDATE lots SET statut = $1 WHERE id = $2", [newLotStatus, lot_id]);

        // Generate payment schedule if type is echelonne AND duration is set
        // Works for both rent (duree_contrat) and sale (if we map terms similarly)
        if (type_paiement === 'echelonne' && duree_contrat) {
            const amount = type_contrat === 'vente' 
                ? (prix_vente - (apport_initial || 0)) / duree_contrat // Simple linear calculation for sale
                : loyer_mensuel;
                
            await generatePaymentSchedule(result.rows[0].id, date_debut, duree_contrat, amount, jour_echeance);
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/locations/:id - Modifier un bail
router.put('/:id', permissions.canWrite('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            date_fin,
            loyer_mensuel,
            charges_mensuelles,
            jour_echeance,
            penalite_retard,
            tolerance_jours,
            statut
        } = req.body;

        const result = await pool.query(`
            UPDATE leases SET
                date_fin = COALESCE($1, date_fin),
                loyer_actuel = COALESCE($2, loyer_actuel),
                charges_mensuelles = COALESCE($3, charges_mensuelles),
                jour_echeance = COALESCE($4, jour_echeance),
                penalite_retard = COALESCE($5, penalite_retard),
                tolerance_jours = COALESCE($6, tolerance_jours),
                statut = COALESCE($7, statut),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [date_fin, loyer_mensuel, charges_mensuelles, jour_echeance, penalite_retard, tolerance_jours, statut, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locations/:id/resilier - Résilier un bail
router.post('/:id/resilier', permissions.canWrite('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { motif, date_resiliation } = req.body;

        // Get lease info first
        const leaseResult = await pool.query('SELECT lot_id FROM leases WHERE id = $1', [id]);
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé' });
        }

        // Update lease
        await pool.query(`
            UPDATE leases SET 
                statut = 'resilie',
                motif_resiliation = $1,
                date_resiliation = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `, [motif || 'Résiliation', date_resiliation || new Date(), id]);

        // Free the lot
        await pool.query("UPDATE lots SET statut = 'libre' WHERE id = $1", [leaseResult.rows[0].lot_id]);

        res.json({ message: 'Bail résilié avec succès' });
    } catch (error) {
        console.error('Error terminating lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locations/:id/renouveler - Renouveler un bail
router.post('/:id/renouveler', permissions.canWrite('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { nouvelle_date_fin, nouveau_loyer } = req.body;

        const result = await pool.query(`
            UPDATE leases SET 
                date_fin = $1,
                loyer_actuel = COALESCE($2, loyer_actuel),
                statut = 'actif',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [nouvelle_date_fin, nouveau_loyer, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé' });
        }

        res.json({ message: 'Bail renouvelé', location: result.rows[0] });
    } catch (error) {
        console.error('Error renewing lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locations/:id/echeancier - Obtenir l'échéancier
router.get('/:id/echeancier', permissions.canRead('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM payment_schedules WHERE lease_id = $1 ORDER BY numero_echeance',
            [id]
        );
        res.json({ echeancier: result.rows });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
    }
});

// POST /api/locations/:id/sign - Enregistrer la signature électronique
router.post('/:id/sign', permissions.canWrite('locataires'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { signatureImage } = req.body; // base64 image

        if (!signatureImage) {
            return res.status(400).json({ message: 'Image de signature manquante' });
        }

        // Créer le dossier signatures s'il n'existe pas
        const signatureDir = path.join(__dirname, '../../uploads/signatures');
        if (!fs.existsSync(signatureDir)) {
            fs.mkdirSync(signatureDir, { recursive: true });
        }

        // Nettoyer le base64
        const base64Data = signatureImage.replace(/^data:image\/png;base64,/, "");
        const fileName = `signature_${id}_${Date.now()}.png`;
        const filePath = path.join(signatureDir, fileName);
        const relativeUrl = `/uploads/signatures/${fileName}`;

        // Sauvegarder le fichier
        fs.writeFileSync(filePath, base64Data, 'base64');

        // Mettre à jour la base de données
        const dbResult = await pool.query(`
            UPDATE leases 
            SET 
                signature_url = $1, 
                date_signature_electronique = CURRENT_TIMESTAMP,
                statut = 'signe' 
            WHERE id = $2
            RETURNING id, reference_bail, owner_id
        `, [relativeUrl, id]);

        // Notify owner
        if (dbResult.rows.length > 0) {
            const lease = dbResult.rows[0];
            await NotificationService.send(
                lease.owner_id, 
                '✍️ Contrat Signé', 
                `Le bail ${lease.reference_bail} a été signé électroniquement.`,
                'success',
                'DOCUMENT_SIGNED'
            );
        }

        res.json({ 
            message: 'Signature enregistrée avec succès',
            signatureUrl: relativeUrl
        });

    } catch (error) {
        console.error('Error signing lease:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la signature' });
    }
});

// Helper: Generate payment schedule
async function generatePaymentSchedule(leaseId: number, startDate: string, months: number, amount: number, dayOfMonth: number) {
    const start = new Date(startDate);
    
    for (let i = 0; i < months; i++) {
        const echeanceDate = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth);
        
        await pool.query(`
            INSERT INTO payment_schedules (lease_id, numero_echeance, date_echeance, montant)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (lease_id, numero_echeance) DO NOTHING
        `, [leaseId, i + 1, echeanceDate, amount]);
    }
}

export default router;
