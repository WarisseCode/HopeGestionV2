"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../db/database"));
const router = (0, express_1.Router)();
// Endpoint d'urgence pour exécuter la migration manuellement
// Usage: GET /api/admin/run-migration?secret=Hope2026
router.get('/run-migration', async (req, res) => {
    const secret = req.query.secret;
    // Protection basique
    if (secret !== 'Hope2026') {
        return res.status(403).json({ message: 'Accès interdit. Code secret invalide.' });
    }
    try {
        const migrationPath = path_1.default.join(__dirname, '../migrations/add_owner_fields.sql');
        if (!fs_1.default.existsSync(migrationPath)) {
            return res.status(404).json({ message: 'Fichier de migration non trouvé.' });
        }
        const sql = fs_1.default.readFileSync(migrationPath, 'utf8');
        // Exécuter le SQL
        await database_1.default.query(sql);
        res.status(200).json({
            message: 'Migration exécutée avec succès !',
            details: 'Les colonnes mobile_money_coordinates et rccm_number ont été ajoutées.'
        });
    }
    catch (error) {
        console.error('Erreur migration:', error);
        res.status(500).json({
            message: 'Erreur lors de la migration',
            error: error.message
        });
    }
});
// Endpoint pour vérifier la structure de la table owners
router.get('/check-schema', async (req, res) => {
    try {
        const result = await database_1.default.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'owners'
        `);
        res.json({ columns: result.rows });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map