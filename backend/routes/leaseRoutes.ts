// backend/routes/leaseRoutes.ts
// Routes for managing leases (baux/locations)

import { Router, Response } from 'express';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import * as dotenv from 'dotenv';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { cache } from '../utils/cache';
import fs from 'fs';
import path from 'path';
import { NotificationService } from '../services/notificationService';
import { LeaseService } from '../services/leaseService';
import { tenantGuard } from '../middleware/tenantGuard';

dotenv.config();

const router = Router();

// GET /api/locations - Liste des baux/contrats
router.get('/', permissions.canRead('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { statut } = req.query;
        // [RLS] On passe dbClient au lieu de (req as any).ownerIds
        const leases = await LeaseService.findAll(dbClient, { statut: statut as string });
        res.json({ locations: leases });
    } catch (error) {
        console.error('Error fetching leases:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locations/:id - Détails d'un bail/contrat
router.get('/:id', permissions.canRead('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        
        const result = await dbClient.query(`
            SELECT 
                l.*,
                l.loyer_actuel as loyer_mensuel,
                t.nom as locataire_nom,
                t.prenoms as locataire_prenoms,
                t.telephone_principal as locataire_telephone,
                t.email as locataire_email,
                lot.ref_lot,
                lot.type as lot_type,
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
            return res.status(404).json({ message: 'Contrat non trouvé ou accès refusé' });
        }

        // Get payment schedule if exists
        const schedules = await dbClient.query(
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
router.post('/', permissions.canWrite('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const strictOwnerId = (req as any).resolvedOwnerId;

    try {
        const {
            tenant_id, lot_id,
            type_contrat = 'location', date_debut, date_fin, duree_contrat,
            loyer_mensuel, caution, avance, charges_mensuelles, type_charges,
            devise, type_paiement, frequence_paiement, jour_echeance, penalite_retard,
            tolerance_jours, nombre_echeances, prix_vente, apport_initial,
            modalite_paiement, date_expiration, conditions_particulieres
        } = req.body;

        if (!tenant_id || !lot_id || !date_debut) {
            return res.status(400).json({ message: 'Champs obligatoires manquants (Client, Lot, Date début)' });
        }

        if (type_contrat === 'location' && !loyer_mensuel) {
            return res.status(400).json({ message: 'Le loyer est requis pour une location' });
        }

        if (type_contrat === 'vente' && !prix_vente) {
             return res.status(400).json({ message: 'Le prix de vente est requis pour une vente' });
        }

        const lotCheck = await dbClient.query(
            "SELECT id FROM leases WHERE lot_id = $1 AND statut IN ('actif', 'signe')",
            [lot_id]
        );
        if (lotCheck.rows.length > 0) {
            return res.status(400).json({ message: 'Ce lot a déjà une affectation active' });
        }

        // INSERT sans reference_bail — on l'attribue après pour utiliser l'id (garanti unique, sans race condition RLS)
        const result = await dbClient.query(`
            INSERT INTO leases (
                tenant_id, lot_id, owner_id, type_contrat,
                date_debut, date_fin, duree_contrat, loyer_actuel,
                caution, avance, charges_mensuelles, type_charges, devise,
                type_paiement, frequence_paiement, jour_echeance, penalite_retard, tolerance_jours,
                prix_vente, apport_initial, modalite_paiement, date_expiration, conditions_particulieres,
                statut, gestionnaire_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'actif', $24)
            RETURNING *
        `, [
            tenant_id, lot_id, strictOwnerId, type_contrat,
            date_debut, date_fin || null, duree_contrat || 12, loyer_mensuel || 0,
            caution || 0, avance || 0, charges_mensuelles || 0, type_charges || 'forfaitaire', devise || 'XOF',
            type_paiement || 'classique', frequence_paiement || 'mensuel', jour_echeance || 1, penalite_retard || 0, tolerance_jours || 0,
            prix_vente || null, apport_initial || null, modalite_paiement || null, date_expiration || null, conditions_particulieres || null,
            req.userId
        ]);

        const lease = result.rows[0];
        const prefix = type_contrat === 'vente' ? 'VTE' : type_contrat === 'reservation' ? 'RES' : 'BAIL';
        const reference_bail = `${prefix}-${new Date().getFullYear()}-${String(lease.id).padStart(4, '0')}`;
        await dbClient.query('UPDATE leases SET reference_bail = $1 WHERE id = $2', [reference_bail, lease.id]);
        lease.reference_bail = reference_bail;

        let newLotStatus = 'loue';
        if (type_contrat === 'vente') newLotStatus = 'vendu';
        if (type_contrat === 'reservation') newLotStatus = 'reserve';

        await dbClient.query("UPDATE lots SET statut = $1 WHERE id = $2", [newLotStatus, lot_id]);

        if (type_paiement === 'echelonne' && duree_contrat) {
            const amount = type_contrat === 'vente' 
                ? (prix_vente - (apport_initial || 0)) / duree_contrat 
                : loyer_mensuel;
            
            const freq = frequence_paiement || 'mensuel';
            const numSchedules = nombre_echeances || duree_contrat;
            await generatePaymentSchedule(dbClient, result.rows[0].id, date_debut, numSchedules, amount, jour_echeance, freq);
        }

        cache.invalidatePrefix('dashboard:');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating contract:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// PUT /api/locations/:id - Modifier un bail
router.put('/:id', permissions.canWrite('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const { date_fin, loyer_mensuel, charges_mensuelles, jour_echeance, penalite_retard, tolerance_jours, statut, type_charges } = req.body;

        const result = await dbClient.query(`
            UPDATE leases SET
                date_fin = COALESCE($1, date_fin),
                loyer_actuel = COALESCE($2, loyer_actuel),
                charges_mensuelles = COALESCE($3, charges_mensuelles),
                type_charges = COALESCE($9, type_charges),
                jour_echeance = COALESCE($4, jour_echeance),
                penalite_retard = COALESCE($5, penalite_retard),
                tolerance_jours = COALESCE($6, tolerance_jours),
                statut = COALESCE($7, statut),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `, [date_fin, loyer_mensuel, charges_mensuelles, jour_echeance, penalite_retard, tolerance_jours, statut, id, type_charges]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locations/:id/resilier - Résilier un bail
router.post('/:id/resilier', permissions.canWrite('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const { motif, date_resiliation } = req.body;

        const leaseResult = await dbClient.query('SELECT lot_id FROM leases WHERE id = $1', [id]);
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        const result = await dbClient.query(`
            UPDATE leases SET 
                statut = 'resilie',
                motif_resiliation = $1,
                date_resiliation = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING id
        `, [motif || 'Résiliation', date_resiliation || new Date(), id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        await dbClient.query("UPDATE lots SET statut = 'libre' WHERE id = $1", [leaseResult.rows[0].lot_id]);
        res.json({ message: 'Bail résilié avec succès' });
    } catch (error) {
        console.error('Error terminating lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/locations/:id/renouveler - Renouveler un bail
router.post('/:id/renouveler', permissions.canWrite('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const { nouvelle_date_fin, nouveau_loyer } = req.body;

        const result = await dbClient.query(`
            UPDATE leases SET 
                date_fin = $1,
                loyer_actuel = COALESCE($2, loyer_actuel),
                statut = 'actif',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [nouvelle_date_fin, nouveau_loyer, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        res.json({ message: 'Bail renouvelé', location: result.rows[0] });
    } catch (error) {
        console.error('Error renewing lease:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/locations/:id/echeancier - Obtenir l'échéancier
router.get('/:id/echeancier', permissions.canRead('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const result = await dbClient.query(
            'SELECT * FROM payment_schedules WHERE lease_id = $1 ORDER BY numero_echeance',
            [id]
        );
        res.json({ echeancier: result.rows });
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'échéancier' });
    }
});

// POST /api/locations/:id/sign - Enregistrer la signature électronique
router.post('/:id/sign', permissions.canWrite('locataires'), tenantGuard, async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    try {
        const { id } = req.params;
        const { signatureImage } = req.body;

        if (!signatureImage) {
            return res.status(400).json({ message: 'Image de signature manquante' });
        }

        const signatureDir = path.join(__dirname, '../../uploads/signatures');
        if (!fs.existsSync(signatureDir)) {
            fs.mkdirSync(signatureDir, { recursive: true });
        }

        const base64Data = signatureImage.replace(/^data:image\/png;base64,/, "");
        const fileName = `signature_${id}_${Date.now()}.png`;
        const filePath = path.join(signatureDir, fileName);
        const relativeUrl = `/uploads/signatures/${fileName}`;

        fs.writeFileSync(filePath, base64Data, 'base64');

        const dbResult = await dbClient.query(`
            UPDATE leases 
            SET 
                signature_url = $1, 
                date_signature_electronique = CURRENT_TIMESTAMP,
                statut = 'signe' 
            WHERE id = $2
            RETURNING id, reference_bail, owner_id
        `, [relativeUrl, id]);

        if (dbResult.rows.length === 0) {
            return res.status(404).json({ message: 'Bail non trouvé ou accès refusé' });
        }

        const lease = dbResult.rows[0];
        
        const ownerUserRes = await dbClient.query(
            "SELECT user_id FROM owner_user WHERE owner_id = $1 AND is_active = TRUE ORDER BY role = 'owner' DESC LIMIT 1",
            [lease.owner_id]
        );

        if (ownerUserRes.rows.length > 0) {
            const userId = ownerUserRes.rows[0].user_id;
            await NotificationService.send(
                userId, 
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

async function generatePaymentSchedule(dbClient: any, leaseId: number, startDate: string, numInstallments: number, amount: number, dayOfMonth: number, frequency: string = 'mensuel') {
    const start = new Date(startDate);
    const dueDates: Date[] = [];
    const descriptions: string[] = [];
    
    for (let i = 0; i < numInstallments; i++) {
        let echeanceDate: Date;
        
        switch (frequency) {
            case 'hebdomadaire':
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 7));
                break;
            case 'bimensuel':
                echeanceDate = new Date(start);
                echeanceDate.setDate(start.getDate() + (i * 14));
                break;
            case 'mensuel':
            default:
                echeanceDate = new Date(start.getFullYear(), start.getMonth() + i, dayOfMonth || start.getDate());
                break;
        }
        
        dueDates.push(echeanceDate);
        descriptions.push(`Échéance #${i + 1}`);
    }

    if (numInstallments > 0) {
        await dbClient.query(`
            INSERT INTO payment_schedules (lease_id, due_date, total_amount, amount_paid, statut, description)
            SELECT $1, d, $3, 0, 'en_attente', descr
            FROM UNNEST($2::date[], $4::text[]) AS t(d, descr)
        `, [leaseId, dueDates, amount, descriptions]);
    }
    
    const firstPaymentDate = new Date(startDate);
    await dbClient.query('UPDATE leases SET next_payment_date = $1 WHERE id = $2', [firstPaymentDate, leaseId]);
}

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — leaseRoutes.ts (+ LeaseService.ts)
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par le commentaire d'avertissement.
 * ✅ tenantGuard ajouté sur toutes les routes de leaseRoutes.ts.
 * ✅ pool.query() remplacé par req.dbClient.query() sur toutes les requêtes (y compris \`generatePaymentSchedule\`).
 * ✅ resolvedOwnerId utilisé pour le champ owner_id dans le INSERT originel (POST /).
 * ✅ Anciens accès manuels (filterByOwner, buildOwnerWhereClause) supprimés de leaseRoutes et du LeaseService associé.
 * ✅ Réponse 404 ajoutée si la requete retourne 0 lignes modifiées (PUT, POST /resilier, POST /renouveler, POST /sign).
 * ⚠️ Points d'attention particuliers : LeaseService.findAll a été refactoré pour accepter \`dbClient\` en paramètre, empêchant ainsi la rupture du RLS en déléguant la requête au backend centralisé.
 * ═══════════════════════════════════════════════════
 */

export default router;
