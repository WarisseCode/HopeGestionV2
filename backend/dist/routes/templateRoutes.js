"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/templateRoutes.ts
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const permissionMiddleware_1 = __importDefault(require("../middleware/permissionMiddleware"));
const router = (0, express_1.Router)();
// GET /api/templates - List
router.get('/', permissionMiddleware_1.default.canRead('documents'), async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM document_templates ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// GET /api/templates/:id - Detail
router.get('/:id', permissionMiddleware_1.default.canRead('documents'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('SELECT * FROM document_templates WHERE id = $1', [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Modèle introuvable' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/templates - Create
router.post('/', permissionMiddleware_1.default.canWrite('documents'), async (req, res) => {
    try {
        const { name, type, content } = req.body;
        const result = await database_1.default.query('INSERT INTO document_templates (name, type, content) VALUES ($1, $2, $3) RETURNING *', [name, type, content]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création modèle' });
    }
});
// PUT /api/templates/:id - Update
router.put('/:id', permissionMiddleware_1.default.canWrite('documents'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, content } = req.body;
        const result = await database_1.default.query('UPDATE document_templates SET name = $1, type = $2, content = $3, updated_at = NOW() WHERE id = $4 RETURNING *', [name, type, content, id]);
        if (result.rows.length === 0)
            return res.status(404).json({ message: 'Modèle introuvable' });
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur mise à jour' });
    }
});
// DELETE /api/templates/:id - Delete
router.delete('/:id', permissionMiddleware_1.default.canWrite('documents'), async (req, res) => {
    try {
        const { id } = req.params;
        await database_1.default.query('DELETE FROM document_templates WHERE id = $1', [id]);
        res.json({ message: 'Modèle supprimé' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur suppression' });
    }
});
// GET /api/templates/variables/:type - Get available variables
router.get('/variables/:type', async (req, res) => {
    const { type } = req.params;
    let variables = [];
    switch (type) {
        case 'lease':
            variables = [
                '{{TenantName}}', '{{TenantPhone}}',
                '{{OwnerName}}', '{{OwnerPhone}}',
                '{{PropertyAddress}}', '{{PropertyType}}', '{{Floor}}',
                '{{RentAmount}}', '{{StartDate}}', '{{EndDate}}',
                '{{RefLot}}'
            ];
            break;
        case 'receipt':
            variables = [
                '{{TenantName}}',
                '{{Period}}',
                '{{Amount}}',
                '{{PropertyAddress}}',
                '{{Date}}'
            ];
            break;
        default:
            variables = ['{{Date}}', '{{Me}}'];
    }
    res.json(variables);
});
exports.default = router;
