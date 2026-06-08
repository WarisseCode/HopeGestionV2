// backend/routes/paiementRoutes.ts
import express, { Response } from 'express';
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
import { body } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { tenantGuard } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import { cache } from '../utils/cache';

const router = express.Router();

// Validation de l'enregistrement d'un paiement. Seuls lease_id et montant sont
// exigés (champs critiques pour l'intégrité financière) ; le reste est typé mais
// optionnel pour ne pas casser les flux existants. .bail() coupe la chaîne d'un
// champ dès la 1re erreur (évite un message de format sur une valeur absente).
const paiementCreateRules = [
    body('lease_id').notEmpty().withMessage('lease_id est obligatoire').bail()
        .isInt({ min: 1 }).withMessage('lease_id invalide'),
    body('montant').notEmpty().withMessage('Le montant est obligatoire').bail()
        .isFloat({ gt: 0 }).withMessage('Le montant doit être un nombre strictement positif'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('mode_paiement').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Mode de paiement invalide'),
    body('date_paiement').optional({ nullable: true }).isISO8601().withMessage('Date de paiement invalide (format ISO 8601)'),
    body('reference_transaction').optional({ nullable: true }).isString().isLength({ max: 255 }).withMessage('Référence trop longue'),
    body('schedule_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('schedule_id invalide'),
];

// [RLS] Filtrage automatique par tenant via PostgreSQL Row-Level Security
// Anciens helpers (filterByOwner, buildOwnerWhereClause, vérifications de rôle manuelles) supprimés.

// GET /api/paiements - Liste des paiements
router.get('/', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        const query = `
            SELECT p.*, 
                   t.nom as tenant_name, t.prenoms as tenant_surname, 
                   l.ref_lot, 
                   b.nom as building_name
            FROM payments p
            LEFT JOIN leases lease ON p.lease_id = lease.id
            LEFT JOIN tenants t ON lease.tenant_id = t.id
            LEFT JOIN lots l ON lease.lot_id = l.id
            LEFT JOIN buildings b ON l.building_id = b.id
            ORDER BY p.date_paiement DESC LIMIT 100
        `;

        const result = await dbClient.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur récupération paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// POST /api/paiements - Enregistrer un paiement (Module V: linked to schedule)
router.post('/', permissions.canWrite('finance'), tenantGuard, validate(paiementCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    const dbClient = (req as any).dbClient;
    const strictOwnerId = (req as any).resolvedOwnerId;
    
    try {
        const { 
            lease_id, 
            montant, 
            type, 
            mode_paiement, 
            date_paiement, 
            reference_transaction,
            schedule_id // Module V: Link to specific schedule entry
        } = req.body;
        
        // 1. Vérifier l'existence du bail ET récupérer son propriétaire.
        // La RLS de lecture (multi-owner via app.current_user_id) garantit que le bail
        // appartient bien à l'utilisateur ; on en dérive l'owner du logement payé.
        const leaseResult = await dbClient.query(
            `SELECT b.owner_id
             FROM leases l
             JOIN lots lot ON l.lot_id = lot.id
             JOIN buildings b ON lot.building_id = b.id
             WHERE l.id = $1`,
            [lease_id]
        );
        if (leaseResult.rows.length === 0) {
            return res.status(404).json({ message: "Bail non trouvé ou accès refusé." });
        }

        // L'owner du bail fait foi : tenantGuard ne résout pas un owner unique pour un
        // gestionnaire multi-owner (resolvedOwnerId = null) → l'INSERT écrirait owner_id
        // NULL et la WITH CHECK de la policy payments rejetterait (erreur 42501).
        // Pas d'élévation de privilège : ce bail est déjà autorisé (sinon SELECT → 404).
        const ownerId = leaseResult.rows[0].owner_id ?? strictOwnerId;
        if (!ownerId) {
            return res.status(422).json({ message: "Propriétaire du bail introuvable." });
        }

        let paymentResult;

        await dbClient.query('BEGIN');

        try {
            // Positionne le contexte RLS sur l'owner du bail (transaction-local, ne fuit
            // pas vers la requête suivante) pour que la WITH CHECK accepte l'INSERT.
            await dbClient.query(`SELECT set_config('app.current_owner_id', $1, true)`, [String(ownerId)]);

            // 2. Insérer paiement
            const result = await dbClient.query(
                `INSERT INTO payments
                (lease_id, montant, type, mode_paiement, date_paiement, reference_transaction, owner_id, schedule_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [lease_id, montant, type, mode_paiement, date_paiement || new Date(), reference_transaction || null, ownerId, schedule_id || null]
            );
            
            paymentResult = result.rows[0];

            // 3. Module V: Update schedule if linked
            if (schedule_id) {
                // Get current schedule info - correct column names: total_amount, amount_paid
                const scheduleResult = await dbClient.query(
                    'SELECT total_amount, amount_paid FROM payment_schedules WHERE id = $1',
                    [schedule_id]
                );
                
                if (scheduleResult.rows.length > 0) {
                    const schedule = scheduleResult.rows[0];
                    const newPaid = parseFloat(schedule.amount_paid || 0) + parseFloat(montant);
                    const scheduledAmount = parseFloat(schedule.total_amount);
                    
                    let newStatus = 'partiel';
                    if (newPaid >= scheduledAmount) {
                        newStatus = 'paye';
                    }
                    
                    const updateRes = await dbClient.query(
                        // $2::text sur la comparaison : sans le cast, $2 est déduit varchar
                        // (colonne statut) ET text (littéral 'paye') → 42P08. Le cast tranche.
                        `UPDATE payment_schedules
                         SET amount_paid = $1,
                             statut = $2,
                             date_reglement_final = CASE WHEN $2::text = 'paye' THEN CURRENT_DATE ELSE date_reglement_final END
                         WHERE id = $3
                         RETURNING id`,
                        [newPaid, newStatus, schedule_id]
                    );
                    
                    if (updateRes.rowCount === 0) {
                        throw new Error("Impossible de mettre à jour l'échéance de paiement : accès refusé ou ressource introuvable.");
                    }
                } else {
                    throw new Error("L'échéance spécifiée n'existe pas ou l'accès est refusé (RLS).");
                }
            }

            await dbClient.query('COMMIT');
            cache.invalidatePrefix('dashboard:');
            res.status(201).json(paymentResult);
        } catch (txError) {
            await dbClient.query('ROLLBACK');
            throw txError;
        }

    } catch (error: any) {
        console.error('Erreur création paiement:', error);
        res.status(500).json({ message: error.message || "Erreur serveur" });
    }
});

// GET /api/paiements/stats - Statistiques financières
router.get('/stats', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        // [PATTERN RLS] Les filtrages manuels par rôle et ownership qui prenaient 20 lignes sont désormais obsolètes !
        
        // Revenus du mois en cours
        const revenusMois = await dbClient.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('month', p.date_paiement) = date_trunc('month', CURRENT_DATE)
        `);

        // Revenus année
        const revenusAnnee = await dbClient.query(`
            SELECT COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE date_trunc('year', p.date_paiement) = date_trunc('year', CURRENT_DATE)
        `);

        res.json({
            mois: revenusMois.rows[0].total || 0,
            annee: revenusAnnee.rows[0].total || 0
        });
    } catch (error) {
        console.error('Erreur stats paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// GET /api/paiements/history - Historique sur 6 mois
router.get('/history', permissions.canRead('finance'), tenantGuard, async (req: AuthenticatedRequest, res) => {
    const dbClient = (req as any).dbClient;
    try {
        // [PATTERN RLS] Pareil ici, le filtrage ownerFilter est maintenant 100% natif.
        const result = await dbClient.query(`
            SELECT 
                TO_CHAR(p.date_paiement, 'Mon') as mois,
                EXTRACT(MONTH FROM p.date_paiement) as mois_num,
                COALESCE(SUM(p.montant), 0) as total 
            FROM payments p
            WHERE p.date_paiement >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY mois, mois_num 
            ORDER BY mois_num
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur historique paiements:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — paiementRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Import pool supprimé et remplacé par le commentaire d'avertissement.
 * ✅ tenantGuard ajouté sur toutes les routes de paiementRoutes.ts (4 routes).
 * ✅ pool.query() remplacé par req.dbClient.query() sur 8 occurrences.
 * ✅ resolvedOwnerId utilisé pour le champ owner_id centralisé dans le INSERT (POST /).
 * ✅ Anciens accès manuels massifs liés aux rôles supprimés: les blocs conditionnels (if role === 'gestionnaire') construisant le 'ownerFilter' (~ 40 lignes) ont été jetés !
 * ✅ Réponse 404/protection ajoutée en cas de refus RLS. Si la MAJ asynchrone du schedule_id échoue ou n'affecte aucune ligne, ça gère la protection sereinement.
 * ⚠️ Points d'attention particuliers : Aucun service externe identifié ni générateur de PDF. Tout est géré proprement en base limit.
 * ═══════════════════════════════════════════════════
 */

export default router;
