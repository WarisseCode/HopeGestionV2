"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../db/database"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * Récupère l'ID de l'organisation (owner_id) gérée par l'utilisateur connecté.
 * On suppose pour l'instant qu'un utilisateur gère UN seul owner principal ou on prend le premier.
 */
const getManagedOwnerId = async (userId) => {
    const result = await database_1.default.query(`SELECT owner_id FROM owner_user 
     WHERE user_id = $1 AND role = 'owner' AND is_active = TRUE 
     LIMIT 1`, [userId]);
    return result.rows.length > 0 ? result.rows[0].owner_id : null;
};
// GET /api/delegations - Lister mon équipe
router.get('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const ownerId = await getManagedOwnerId(userId);
        if (!ownerId) {
            return res.status(403).json({ message: "Vous n'êtes pas propriétaire d'une organisation." });
        }
        const result = await database_1.default.query(`SELECT u.id, u.nom, u.email, ou.role, ou.start_date, ou.is_active,
              ou.can_view_finances, ou.can_edit_properties, ou.can_manage_tenants
       FROM owner_user ou
       JOIN users u ON ou.user_id = u.id
       WHERE ou.owner_id = $1 AND ou.is_active = TRUE
       ORDER BY ou.role, u.nom`, [ownerId]);
        res.json({ team: result.rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// POST /api/delegations - Ajouter un membre par email
router.post('/', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, role, permissions } = req.body;
        // 1. Vérifier droits
        const ownerId = await getManagedOwnerId(userId);
        if (!ownerId)
            return res.status(403).json({ message: "Action non autorisée." });
        // 2. Trouver l'utilisateur cible
        const userCheck = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé avec cet email." });
        }
        const targetUserId = userCheck.rows[0].id;
        if (targetUserId === userId) {
            return res.status(400).json({ message: "Vous faites déjà partie de l'équipe." });
        }
        // 3. Ajouter/Mettre à jour délégation
        // Permissions par défaut si non fournies
        const perms = permissions || {};
        await database_1.default.query(`INSERT INTO owner_user (
          owner_id, user_id, role, start_date, is_active,
          can_view_finances, can_edit_properties, can_manage_tenants
       ) VALUES ($1, $2, $3, CURRENT_DATE, TRUE, $4, $5, $6)
       ON CONFLICT (owner_id, user_id) 
       DO UPDATE SET 
          role = EXCLUDED.role, is_active = TRUE,
          can_view_finances = EXCLUDED.can_view_finances,
          can_edit_properties = EXCLUDED.can_edit_properties,
          can_manage_tenants = EXCLUDED.can_manage_tenants`, [
            ownerId, targetUserId, role || 'viewer',
            perms.can_view_finances || false,
            perms.can_edit_properties || false,
            perms.can_manage_tenants || false
        ]);
        res.status(201).json({ message: "Membre ajouté avec succès." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
// DELETE /api/delegations/:userId - Retirer un membre
router.delete('/:targetId', authMiddleware_1.protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = parseInt(req.params.targetId);
        const ownerId = await getManagedOwnerId(userId);
        if (!ownerId)
            return res.status(403).json({ message: "Action non autorisée." });
        if (targetId === userId) {
            return res.status(400).json({ message: "Vous ne pouvez pas vous retirer vous-même." });
        }
        await database_1.default.query(`UPDATE owner_user SET is_active = FALSE, end_date = CURRENT_DATE 
       WHERE owner_id = $1 AND user_id = $2`, [ownerId, targetId]);
        res.json({ message: "Membre retiré de l'équipe." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=delegationRoutes.js.map