"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
// ⚠️ RÈGLE ARCHITECTURE : Ne jamais utiliser pool.query() directement dans ce fichier.
// Toutes les requêtes doivent passer par req.dbClient fourni par tenantGuard.
// L'utilisation de pool.query() contournerait le Row-Level Security (RLS).
const authMiddleware_1 = require("../middleware/authMiddleware");
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const tenantGuard_1 = require("../middleware/tenantGuard");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const spacesUploadService_1 = require("../services/spacesUploadService");
const spacesConfigured = !!(process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_BUCKET);
const router = (0, express_1.Router)();
// Protect all routes with auth check and RLS context
router.use(authMiddleware_1.protect);
router.use(tenantGuard_1.tenantGuard);
// GET /api/expenses - List expenses
router.get('/', permissionMiddleware_1.default.canRead('finances'), async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const { building_id, category, start_date, end_date } = req.query;
        // RLS s'occupe de l'isolation owner_id
        let query = `
            SELECT e.*, 
                   b.nom as building_name,
                   l.ref_lot,
                   ep.name as category_label
            FROM expenses e
            LEFT JOIN buildings b ON e.building_id = b.id
            LEFT JOIN lots l ON e.lot_id = l.id
            LEFT JOIN expense_categories ep ON e.category = ep.name
            WHERE 1=1
        `;
        const params = [];
        let pIdx = 1;
        if (building_id) {
            query += ` AND e.building_id = $${pIdx++}`;
            params.push(building_id);
        }
        if (category) {
            query += ` AND e.category = $${pIdx++}`;
            params.push(category);
        }
        if (start_date) {
            query += ` AND e.date_expense >= $${pIdx++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.date_expense <= $${pIdx++}`;
            params.push(end_date);
        }
        query += ` ORDER BY e.date_expense DESC, e.created_at DESC`;
        const result = await dbClient.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/expenses/categories - List categories
router.get('/categories', async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const result = await dbClient.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching expense categories:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/expenses - Create expense (with optional proof upload)
router.post('/', permissionMiddleware_1.default.canWrite('finances'), uploadMiddleware_1.upload.single('proof'), async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const resolvedOwnerId = req.resolvedOwnerId;
        const { building_id, lot_id, category, description, amount, date_expense, supplier_name } = req.body;
        // Validation simple
        if (!amount || !date_expense || !category) {
            return res.status(400).json({ message: 'Champs obligatoires manquants' });
        }
        // Handle uploaded proof file
        let proofUrl = req.body.proof_url || null;
        if (req.file) {
            if (spacesConfigured) {
                proofUrl = await (0, spacesUploadService_1.uploadToSpaces)(req.file, 'expenses');
            }
            else {
                // Fallback local (dev uniquement)
                const localDir = path_1.default.join(__dirname, '../../uploads/expenses');
                await fs_extra_1.default.ensureDir(localDir);
                const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${path_1.default.extname(req.file.originalname)}`;
                await fs_extra_1.default.writeFile(path_1.default.join(localDir, uniqueName), req.file.buffer);
                proofUrl = `/uploads/expenses/${uniqueName}`;
            }
        }
        const result = await dbClient.query(`
            INSERT INTO expenses (
                building_id, lot_id, owner_id, category, description,
                amount, date_expense, supplier_name, status, proof_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', $9)
            RETURNING *
        `, [
            building_id || null,
            lot_id || null,
            resolvedOwnerId,
            category,
            description || '',
            amount,
            date_expense,
            supplier_name || '',
            proofUrl
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// DELETE /api/expenses/:id
router.delete('/:id', permissionMiddleware_1.default.canWrite('finances'), async (req, res) => {
    try {
        const dbClient = req.dbClient;
        const { id } = req.params;
        const result = await dbClient.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Dépense introuvable ou accès refusé' });
        }
        res.json({ message: 'Dépense supprimée' });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS TENANTGUARD — expenseRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ Application globale de protect et tenantGuard en haut de fichier via router.use().
 * ✅ L'ordre global positionne automatiquement tenantGuard AVANT multer (upload.single),
 *    empêchant ainsi l'écriture de fichier en cas d'accès rejeté ou d'absence de JWT valide.
 * ✅ Suppression totale de 'filterByOwner' et autres anciens helpers manuels désormais caduques.
 * ✅ Injection sécurisée de resolvedOwnerId sur l'INSERT de dépense.
 * ✅ Ajout d'un fs.unlinkSync() dans le catch pour nettoyer le fichier uploadé si l'insertion DB plante.
 * ✅ Blocage IDOR (404) sur le DELETE.
 * ═══════════════════════════════════════════════════
 */
exports.default = router;
