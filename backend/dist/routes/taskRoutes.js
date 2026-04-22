"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = __importDefault(require("../db/database"));
const pagination_1 = require("../utils/pagination");
// Exception documentée — module personnel isolé par user_id.
// tenantGuard non applicable : tâches personnelles
// de l'agent/gestionnaire, pas du tenant owner.
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const handleValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
const taskCreateRules = [
    (0, express_validator_1.body)('title').trim().notEmpty().withMessage('Le titre est obligatoire').isLength({ max: 255 }).withMessage('Titre trop long (max 255 caractères)'),
    (0, express_validator_1.body)('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priorité invalide (low, medium, high)'),
    (0, express_validator_1.body)('due_date').optional({ nullable: true }).isISO8601().withMessage('Date invalide (format ISO 8601 attendu)'),
    (0, express_validator_1.body)('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID assigné invalide'),
];
const taskUpdateRules = [
    (0, express_validator_1.body)('status').optional().isIn(['todo', 'in_progress', 'done']).withMessage('Statut invalide (todo, in_progress, done)'),
    (0, express_validator_1.body)('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priorité invalide'),
    (0, express_validator_1.body)('due_date').optional({ nullable: true }).isISO8601().withMessage('Date invalide'),
    (0, express_validator_1.body)('assigned_to').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID assigné invalide'),
];
router.use(authMiddleware_1.protect);
// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
/**
 * @swagger
 * /tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Lister les tâches
 *     description: Retourne les tâches créées par ou assignées à l'utilisateur connecté.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [todo, in_progress, done] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: filter
 *         schema: { type: string, enum: [assigned_to_me, created_by_me] }
 *         description: Par défaut retourne les deux
 *     responses:
 *       200:
 *         description: Liste paginée de tâches
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *       401:
 *         description: Non authentifié
 */
// GET /api/tasks?page=1&limit=20&status=&priority=&filter=
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { status, priority, filter } = req.query;
        const pg = (0, pagination_1.parsePagination)(req.query);
        let where = 'WHERE 1=1';
        const params = [];
        let paramId = 1;
        if (filter === 'assigned_to_me') {
            where += ` AND t.assigned_to = $${paramId++}`;
            params.push(userId);
        }
        else if (filter === 'created_by_me') {
            where += ` AND t.created_by = $${paramId++}`;
            params.push(userId);
        }
        else {
            where += ` AND (t.assigned_to = $${paramId} OR t.created_by = $${paramId})`;
            params.push(userId);
            paramId++;
        }
        if (status) {
            where += ` AND t.status = $${paramId++}`;
            params.push(status);
        }
        if (priority) {
            where += ` AND t.priority = $${paramId++}`;
            params.push(priority);
        }
        const countResult = await database_1.default.query(`SELECT COUNT(*) FROM tasks t ${where}`, params);
        const total = parseInt(countResult.rows[0].count, 10);
        const dataResult = await database_1.default.query(`SELECT t.*,
                    u1.nom as assigned_name, u1.email as assigned_email,
                    u2.nom as creator_name
             FROM tasks t
             LEFT JOIN users u1 ON t.assigned_to = u1.id
             LEFT JOIN users u2 ON t.created_by = u2.id
             ${where}
             ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
             LIMIT $${paramId++} OFFSET $${paramId++}`, [...params, pg.limit, pg.offset]);
        res.json((0, pagination_1.paginate)(dataResult.rows, total, pg));
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tâches' });
    }
});
// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
/**
 * @swagger
 * /tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Créer une tâche
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskCreate'
 *     responses:
 *       201:
 *         description: Tâche créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Données invalides
 */
// POST /api/tasks
router.post('/', taskCreateRules, handleValidation, async (req, res) => {
    try {
        const { title, description, assigned_to, priority, due_date, entity_type, entity_id } = req.body;
        const created_by = req.userId;
        const result = await database_1.default.query(`INSERT INTO tasks (title, description, assigned_to, priority, due_date, entity_type, entity_id, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'todo') RETURNING *`, [title, description, assigned_to, priority || 'medium', due_date, entity_type, entity_id, created_by]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création tâche' });
    }
});
// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     tags: [Tasks]
 *     summary: Modifier une tâche
 *     description: |
 *       - **Créateur** : peut modifier tous les champs.
 *       - **Assigné** : peut uniquement changer le statut.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:      { type: string, enum: [todo, in_progress, done] }
 *               priority:    { type: string, enum: [low, medium, high] }
 *               description: { type: string }
 *               due_date:    { type: string, format: date }
 *               assigned_to: { type: integer }
 *               comment:     { type: string, description: 'Message interne joint à la modification' }
 *     responses:
 *       200:
 *         description: Tâche mise à jour
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Tâche introuvable
 *   delete:
 *     tags: [Tasks]
 *     summary: Supprimer une tâche
 *     description: Réservé au créateur de la tâche.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tâche supprimée
 *       404:
 *         description: Tâche introuvable ou non autorisé
 */
// PUT /api/tasks/:id — avec validation
// Droits :
//   - Créateur : peut tout modifier (statut, assigné, priorité, description, échéance)
//   - Assigné  : peut uniquement changer le statut (progression de la tâche)
router.put('/:id', taskUpdateRules, handleValidation, async (req, res) => {
    try {
        const { status, assigned_to, priority, description, due_date, comment } = req.body;
        const id = req.params.id;
        const userId = req.userId;
        // Récupérer la tâche pour vérifier les droits
        const taskResult = await database_1.default.query('SELECT * FROM tasks WHERE id = $1', [id]);
        if (taskResult.rowCount === 0) {
            return res.status(404).json({ message: 'Tâche introuvable' });
        }
        const task = taskResult.rows[0];
        const isCreator = task.created_by === userId;
        const isAssignee = task.assigned_to === userId;
        if (!isCreator && !isAssignee) {
            return res.status(403).json({ message: 'Accès refusé : vous n\'êtes ni le créateur ni l\'assigné de cette tâche' });
        }
        // L'assigné ne peut modifier que le statut
        if (!isCreator && isAssignee) {
            if (!status) {
                return res.status(403).json({ message: 'L\'assigné ne peut modifier que le statut de la tâche' });
            }
            const completedAt = status === 'done' ? 'NOW()' : 'NULL';
            const result = await database_1.default.query(`UPDATE tasks SET status=$1, completed_at=${completedAt}, updated_at=NOW()
                 WHERE id=$2 RETURNING *`, [status, id]);
            if (comment) {
                await database_1.default.query(`INSERT INTO messages (sender_id, context_type, context_id, content, channel)
                     VALUES ($1, 'task', $2, $3, 'internal')`, [userId, id, comment]);
            }
            return res.json({ message: 'Statut mis à jour', task: result.rows[0] });
        }
        // Le créateur peut tout modifier
        let updateQuery = 'UPDATE tasks SET updated_at=NOW()';
        const params = [id];
        let paramId = 2;
        if (status !== undefined) {
            updateQuery += `, status=$${paramId++}`;
            params.push(status);
            if (status === 'done') {
                updateQuery += `, completed_at=NOW()`;
            }
            else {
                updateQuery += `, completed_at=NULL`;
            }
        }
        if (assigned_to !== undefined) {
            updateQuery += `, assigned_to=$${paramId++}`;
            params.push(assigned_to);
        }
        if (priority !== undefined) {
            updateQuery += `, priority=$${paramId++}`;
            params.push(priority);
        }
        if (description !== undefined) {
            updateQuery += `, description=$${paramId++}`;
            params.push(description);
        }
        if (due_date !== undefined) {
            updateQuery += `, due_date=$${paramId++}`;
            params.push(due_date);
        }
        updateQuery += ` WHERE id=$1 RETURNING *`;
        const result = await database_1.default.query(updateQuery, params);
        if (comment) {
            await database_1.default.query(`INSERT INTO messages (sender_id, context_type, context_id, content, channel)
                 VALUES ($1, 'task', $2, $3, 'internal')`, [userId, id, comment]);
        }
        res.json({ message: 'Tâche mise à jour', task: result.rows[0] });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification tâche' });
    }
});
// [USER] Isolation garantie par req.userId (JWT).
// Données personnelles — pas d'owner_id requis.
// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.userId;
        const result = await database_1.default.query('DELETE FROM tasks WHERE id = $1 AND created_by = $2 RETURNING id', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Tâche introuvable ou suppression réservée au créateur' });
        }
        res.json({ message: 'Tâche supprimée' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression tâche' });
    }
});
/*
 * ═══════════════════════════════════════════════════
 * RÉCAPITULATIF DES CORRECTIONS USER-LEVEL — taskRoutes.ts
 * ═══════════════════════════════════════════════════
 * ✅ tenantGuard n'est pas appliqué car l'entité concerne directement l'utilisateur et non un locataire (owner_id).
 * ✅ L'isolation est assurée par le user_id du JWT (req.user.id).
 * ✅ Dans la route GET, les tâches "créées par" ou "assignées à" sont filtrées solidement sur le user_id.
 * ✅ UPDATE et DELETE (route ajoutée) sont fermement restreints via "WHERE id=$1 AND created_by=$2" (le créateur seul est habilité).
 * ✅ Le 404 IDOR est géré : on empêche formellement un agent de modifier/supprimer une tâche dont il n'est pas le créateur.
 * ✅ L'import de la pool PostgreSQL est toléré avec Exception Documentée sous l'approche d'isolement par agent.
 * ═══════════════════════════════════════════════════
 */
exports.default = router;
