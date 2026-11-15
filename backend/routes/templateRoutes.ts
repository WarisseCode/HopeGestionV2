// backend/routes/templateRoutes.ts
import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../index'; // Use the shared pool from index
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import permissions from '../middleware/permissionMiddleware';
import { validate } from '../middleware/validate';
import { resolveAgencyUserId, isTemplateAdmin, templateVisibilityClause, templateWriteClause } from '../utils/templateAgency';

const router = Router();

const templateCreateRules = [
    body('name').notEmpty().withMessage('Le nom est obligatoire').bail().isString().isLength({ max: 150 }).withMessage('Nom trop long'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('content').optional({ nullable: true }).isString().withMessage('Contenu invalide'),
];
const templateIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide');
const templateUpdateRules = [
    param('id').isInt({ min: 1 }).withMessage('Identifiant invalide'),
    body('name').optional({ nullable: true }).isString().isLength({ max: 150 }).withMessage('Nom trop long'),
    body('type').optional({ nullable: true }).isString().isLength({ max: 50 }).withMessage('Type invalide'),
    body('content').optional({ nullable: true }).isString().withMessage('Contenu invalide'),
];

// [SÉCURITÉ] Audit S3 : les modèles étaient communs à toutes les agences (lecture ET
// écriture). Désormais :
//  - modèles Hope (agency_user_id NULL) : visibles par tous, modifiables par l'admin ;
//  - modèles d'agence : visibles et modifiables par l'agence qui les a créés.
// Voir utils/templateAgency.ts pour la notion d'agence.

// Ajoute `editable` pour que l'interface sache s'il faut proposer « Personnaliser »
// (copie) plutôt que « Modifier » / « Supprimer ».
const withEditable = (req: AuthenticatedRequest, agencyUserId: number) => (t: any) => ({
    ...t,
    editable: isTemplateAdmin(req) || (t.agency_user_id !== null && Number(t.agency_user_id) === agencyUserId),
});

// GET /api/templates - List
router.get('/', permissions.canRead('documents'), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agencyUserId = await resolveAgencyUserId(req);
        const params: any[] = [];
        const clause = templateVisibilityClause(req, agencyUserId, params);
        const result = await pool.query(
            `SELECT * FROM document_templates WHERE 1=1${clause} ORDER BY created_at DESC`,
            params
        );
        res.json(result.rows.map(withEditable(req, agencyUserId)));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/templates/:id - Detail
router.get('/:id', permissions.canRead('documents'), validate([templateIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const agencyUserId = await resolveAgencyUserId(req);
        const params: any[] = [req.params.id];
        const clause = templateVisibilityClause(req, agencyUserId, params);
        const result = await pool.query(`SELECT * FROM document_templates WHERE id = $1${clause}`, params);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Modèle introuvable' });
        res.json(withEditable(req, agencyUserId)(result.rows[0]));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/templates - Create
// Admin : modèle Hope (agency_user_id NULL, visible par toutes les agences).
// Autres : modèle de l'agence.
router.post('/', permissions.canWrite('documents'), validate(templateCreateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, type, content } = req.body;
        const agencyUserId = isTemplateAdmin(req) ? null : await resolveAgencyUserId(req);
        const result = await pool.query(
            'INSERT INTO document_templates (name, type, content, agency_user_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, type || 'other', content || '', agencyUserId]
        );
        res.status(201).json({ ...result.rows[0], editable: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création modèle' });
    }
});

// Distingue « n'existe pas / pas visible » (404) de « modèle Hope en lecture seule » (403).
async function writeRefusal(req: AuthenticatedRequest, agencyUserId: number, id: string, res: Response) {
    const params: any[] = [id];
    const clause = templateVisibilityClause(req, agencyUserId, params);
    const visible = await pool.query(`SELECT 1 FROM document_templates WHERE id = $1${clause}`, params);
    if (visible.rows.length > 0) {
        return res.status(403).json({ message: 'Modèle Hope en lecture seule : utilisez « Personnaliser » pour en créer votre version.' });
    }
    return res.status(404).json({ message: 'Modèle introuvable' });
}

// PUT /api/templates/:id - Update
router.put('/:id', permissions.canWrite('documents'), validate(templateUpdateRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, content } = req.body;
        const agencyUserId = await resolveAgencyUserId(req);
        const params: any[] = [name, type, content, id];
        const clause = templateWriteClause(req, agencyUserId, params);
        // COALESCE : un champ absent du corps garde sa valeur (name est NOT NULL)
        const result = await pool.query(
            `UPDATE document_templates
                SET name = COALESCE($1, name), type = COALESCE($2, type), content = COALESCE($3, content), updated_at = NOW()
              WHERE id = $4${clause} RETURNING *`,
            params
        );
        if (result.rows.length === 0) return writeRefusal(req, agencyUserId, id as string, res);
        res.json({ ...result.rows[0], editable: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur mise à jour' });
    }
});

// DELETE /api/templates/:id - Delete
router.delete('/:id', permissions.canWrite('documents'), validate([templateIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const agencyUserId = await resolveAgencyUserId(req);
        const params: any[] = [id];
        const clause = templateWriteClause(req, agencyUserId, params);
        const result = await pool.query(`DELETE FROM document_templates WHERE id = $1${clause} RETURNING id`, params);
        if (result.rows.length === 0) return writeRefusal(req, agencyUserId, id as string, res);
        res.json({ message: 'Modèle supprimé' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});

// GET /api/templates/variables/:type - Get available variables with French labels
router.get('/variables/:type', async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.params;
    // eslint-disable-next-line no-useless-assignment
    let variables: { variable: string; label: string }[] = [];

    switch (type) {
        case 'lease':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Téléphone Locataire}}', label: 'Numéro de téléphone du locataire' },
                { variable: '{{Email Locataire}}', label: 'Adresse email du locataire' },
                { variable: '{{Nom du Propriétaire}}', label: 'Nom complet du propriétaire / bailleur' },
                { variable: '{{Téléphone Propriétaire}}', label: 'Numéro de téléphone du propriétaire' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien immobilier' },
                { variable: '{{Type de Bien}}', label: 'Type de bien (Appartement, Maison, etc.)' },
                { variable: '{{Étage}}', label: 'Étage du lot' },
                { variable: '{{Référence Lot}}', label: 'Référence du lot (ex: A01)' },
                { variable: '{{Montant du Loyer}}', label: 'Montant du loyer mensuel en FCFA' },
                { variable: '{{Date de Début}}', label: 'Date de début du bail' },
                { variable: '{{Date de Fin}}', label: 'Date de fin du bail' },
            ];
            break;
        case 'receipt':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Période}}', label: 'Période concernée (ex: Janvier 2026)' },
                { variable: '{{Montant Payé}}', label: 'Montant du paiement en FCFA' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien' },
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
            ];
            break;
        case 'notice':
            variables = [
                { variable: '{{Nom du Locataire}}', label: 'Nom complet du locataire' },
                { variable: '{{Adresse du Bien}}', label: 'Adresse complète du bien' },
                { variable: '{{Montant Dû}}', label: 'Montant impayé total' },
                { variable: '{{Nombre de Mois}}', label: 'Nombre de mois d\'impayés' },
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
            ];
            break;
        default:
            variables = [
                { variable: '{{Date du Jour}}', label: 'Date du jour (auto)' },
                { variable: '{{Mon Nom}}', label: 'Votre nom (gestionnaire connecté)' },
            ];
    }

    res.json(variables);
});

export default router;

