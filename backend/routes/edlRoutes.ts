import express, { Response } from 'express';
import pool from '../db/database';
import { AuthenticatedRequest, protect } from '../middleware/authMiddleware';

const router = express.Router();

// Protect all routes
router.use(protect);

// ============================================
// GET /api/edl - Liste des états des lieux
// ============================================
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { lot_id, type_edl, statut } = req.query;
        
        let query = `
            SELECT e.*, 
                   l.ref_lot, l.type as lot_type,
                   (SELECT COUNT(*) FROM edl_items WHERE edl_id = e.id) as item_count
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            WHERE 1=1
        `;
        const params: any[] = [];
        
        if (lot_id) {
            params.push(lot_id);
            query += ` AND e.lot_id = $${params.length}`;
        }
        
        if (type_edl) {
            params.push(type_edl);
            query += ` AND e.type_edl = $${params.length}`;
        }
        
        if (statut) {
            params.push(statut);
            query += ` AND e.statut = $${params.length}`;
        }
        
        query += ` ORDER BY e.date_realisation DESC, e.created_at DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/:id - Détails complets d'un EDL
// ============================================
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        // Get EDL Header
        const edlResult = await pool.query(`
            SELECT e.*, 
                   l.ref_lot, l.type as lot_type,
                   'Bail #' || loc.id as ref_location,
                   parent.ref_edl as parent_ref
            FROM edl_inspections e
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN baux loc ON e.location_id = loc.id
            LEFT JOIN edl_inspections parent ON e.parent_edl_id = parent.id
            WHERE e.id = $1
        `, [id]);
        
        if (edlResult.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé' });
        }
        
        const edl = edlResult.rows[0];
        
        // Get Items
        const itemsResult = await pool.query(`
            SELECT * FROM edl_items 
            WHERE edl_id = $1 
            ORDER BY piece, nom
        `, [id]);
        
        res.json({
            ...edl,
            items: itemsResult.rows
        });
    } catch (error) {
        console.error('Error fetching EDL details:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// POST /api/edl - Créer un nouvel état des lieux
// ============================================
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const {
            lot_id,
            location_id,
            type_edl,
            date_realisation,
            locataire_id,
            locataire_name,
            locataire_present,
            commentaires,
            parent_edl_id
        } = req.body;
        
        // Générer référence unique
        const year = new Date().getFullYear();
        const seqResult = await pool.query(`SELECT nextval('edl_ref_seq')`);
        const seq = seqResult.rows[0].nextval;
        const ref_edl = `EDL-${year}-${String(seq).padStart(4, '0')}`;
        
        const result = await pool.query(`
            INSERT INTO edl_inspections (
                ref_edl, lot_id, location_id, type_edl, date_realisation,
                agent_id, agent_name, locataire_id, locataire_name, 
                locataire_present, commentaires, parent_edl_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            ref_edl,
            lot_id,
            location_id || null,
            type_edl,
            date_realisation || new Date(),
            req.user?.id,
            `${req.user?.nom} ${req.user?.prenoms}`,
            locataire_id || null,
            locataire_name || '',
            locataire_present !== false,
            commentaires || '',
            parent_edl_id || null
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// POST /api/edl/:id/items - Ajouter/Modifier des items
// ============================================
router.post('/:id/items', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const {
            inventory_item_id,
            piece,
            categorie,
            nom,
            description,
            etat,
            quantite,
            observation,
            photos
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO edl_items (
                edl_id, inventory_item_id, piece, categorie, nom,
                description, etat, quantite, observation, photos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            id,
            inventory_item_id || null,
            piece,
            categorie || '',
            nom,
            description || '',
            etat,
            quantite || 1,
            observation || '',
            JSON.stringify(photos || [])
        ]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/items/:itemId - Modifier un item
// ============================================
router.put('/:id/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        const { etat, quantite, observation, photos } = req.body;
        
        const result = await pool.query(`
            UPDATE edl_items SET
                etat = COALESCE($1, etat),
                quantite = COALESCE($2, quantite),
                observation = COALESCE($3, observation),
                photos = COALESCE($4, photos)
            WHERE id = $5
            RETURNING *
        `, [
            etat,
            quantite,
            observation,
            photos ? JSON.stringify(photos) : null,
            itemId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Élément non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// DELETE /api/edl/:id/items/:itemId - Supprimer un item
// ============================================
router.delete('/:id/items/:itemId', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { itemId } = req.params;
        await pool.query('DELETE FROM edl_items WHERE id = $1', [itemId]);
        res.json({ message: 'Élément supprimé' });
    } catch (error) {
        console.error('Error deleting EDL item:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id/sign - Enregistrer les signatures
// ============================================
router.put('/:id/sign', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { signatures } = req.body;
        
        const result = await pool.query(`
            UPDATE edl_inspections SET
                signatures_json = $1,
                statut = 'signe',
                validated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [
            JSON.stringify(signatures),
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error signing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// PUT /api/edl/:id - Mettre à jour un EDL (statut, commentaires)
// ============================================
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { statut, commentaires } = req.body;
        
        const result = await pool.query(`
            UPDATE edl_inspections SET
                statut = COALESCE($1, statut),
                commentaires = COALESCE($2, commentaires),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [
            statut,
            commentaires,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'État des lieux non trouvé' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// ============================================
// GET /api/edl/compare/:idEntree/:idSortie - Comparaison Entrée/Sortie
// ============================================
router.get('/compare/:idEntree/:idSortie', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { idEntree, idSortie } = req.params;
        
        // Get both EDLs
        const edlEntree = await pool.query('SELECT * FROM edl_inspections WHERE id = $1', [idEntree]);
        const edlSortie = await pool.query('SELECT * FROM edl_inspections WHERE id = $1', [idSortie]);
        
        if (edlEntree.rows.length === 0 || edlSortie.rows.length === 0) {
            return res.status(404).json({ message: 'Un ou plusieurs EDL introuvables' });
        }
        
        // Get items for both
        const itemsEntree = await pool.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idEntree]);
        const itemsSortie = await pool.query('SELECT * FROM edl_items WHERE edl_id = $1 ORDER BY piece, nom', [idSortie]);
        
        res.json({
            entree: {
                ...edlEntree.rows[0],
                items: itemsEntree.rows
            },
            sortie: {
                ...edlSortie.rows[0],
                items: itemsSortie.rows
            }
        });
    } catch (error) {
        console.error('Error comparing EDL:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
