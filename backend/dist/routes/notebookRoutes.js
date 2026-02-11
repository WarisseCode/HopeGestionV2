"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/notebookRoutes.ts
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const router = (0, express_1.Router)();
// === NOTES ===
// GET /api/carnet/notes
router.get('/notes', async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM notebook_notes WHERE user_id = $1 OR visibility = \'shared\' ORDER BY created_at DESC', [req.userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/carnet/notes
router.post('/notes', async (req, res) => {
    try {
        const { title, content, type, entity_type, entity_id, visibility, user_id } = req.body;
        const result = await database_1.default.query('INSERT INTO notebook_notes (title, content, type, entity_type, entity_id, visibility, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [title, content, type, entity_type, entity_id, visibility, req.userId] // Force current user as creator
        );
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création note' });
    }
});
// DELETE /api/carnet/notes/:id
router.delete('/notes/:id', async (req, res) => {
    try {
        await database_1.default.query('DELETE FROM notebook_notes WHERE id = $1', [req.params.id]);
        res.json({ message: 'Note supprimée' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur suppression' });
    }
});
// === CONTACTS ===
// GET /api/carnet/contacts
router.get('/contacts', async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM notebook_contacts ORDER BY name ASC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/carnet/contacts
router.post('/contacts', async (req, res) => {
    try {
        const { name, role, phone, email, address, description } = req.body;
        const result = await database_1.default.query('INSERT INTO notebook_contacts (name, role, phone, email, address, description, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, role, phone, email, address, description, req.userId]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur création contact' });
    }
});
// === FIELD ACTIONS ===
// GET /api/carnet/field-actions
router.get('/field-actions', async (req, res) => {
    try {
        const result = await database_1.default.query('SELECT * FROM notebook_field_actions ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/carnet/field-actions
router.post('/field-actions', async (req, res) => {
    try {
        const { type, description, photo_url, location_lat, location_lng, location_address } = req.body;
        const result = await database_1.default.query('INSERT INTO notebook_field_actions (type, description, photo_url, location_lat, location_lng, location_address, user_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, \'pending\') RETURNING *', [type, description, photo_url, location_lat, location_lng, location_address, req.userId]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création action' });
    }
});
exports.default = router;
