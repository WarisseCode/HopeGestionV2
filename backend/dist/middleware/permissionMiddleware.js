"use strict";
// backend/middleware/permissionMiddleware.ts
// Middleware to enforce granular permissions from permission_matrix table
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = exports.checkPermission = void 0;
const index_1 = require("../index");
/**
 * Creates a middleware that checks if the user has the required permission
 * @param module - The module name (e.g., 'biens', 'locataires', 'finance')
 * @param action - The action type ('read', 'write', 'delete', 'validate')
 */
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        try {
            const userRole = req.userRole;
            console.log(`[PERM] Checking ${action} on ${module} for role ${userRole}`);
            // Admin always has full access
            if (userRole === 'admin') {
                return next();
            }
            // Check permission_matrix for this role and module
            const columnName = `can_${action}`;
            const result = await index_1.pool.query(`SELECT ${columnName} FROM permission_matrix WHERE role = $1 AND module = $2`, [userRole, module]);
            if (result.rows.length === 0) {
                // No explicit permission found - deny by default
                console.warn(`[PERM] No permission matrix entry found for role '${userRole}' on module '${module}'`);
                return res.status(403).json({
                    message: `Accès refusé. Vous n'avez pas la permission de ${getActionLabel(action)} dans ce module.`,
                    requiredPermission: { module, action }
                });
            }
            const hasPermission = result.rows[0][columnName];
            if (!hasPermission) {
                console.warn(`[PERM] Permission ${action} denied for role '${userRole}' on module '${module}'`);
                return res.status(403).json({
                    message: `Accès refusé. Vous n'avez pas la permission de ${getActionLabel(action)} dans ce module.`,
                    requiredPermission: { module, action }
                });
            }
            // Permission granted
            next();
        }
        catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ message: 'Erreur lors de la vérification des permissions.' });
        }
    };
};
exports.checkPermission = checkPermission;
/**
 * Middleware factory for common permission patterns
 */
exports.permissions = {
    // Read permissions
    canRead: (module) => (0, exports.checkPermission)(module, 'read'),
    // Write permissions (create/update)
    canWrite: (module) => (0, exports.checkPermission)(module, 'write'),
    // Delete permissions
    canDelete: (module) => (0, exports.checkPermission)(module, 'delete'),
    // Validate permissions (approve actions)
    canValidate: (module) => (0, exports.checkPermission)(module, 'validate'),
};
// Helper function
function getActionLabel(action) {
    switch (action) {
        case 'read': return 'consulter les données';
        case 'write': return 'modifier les données';
        case 'delete': return 'supprimer des éléments';
        case 'validate': return 'valider des actions';
        default: return 'effectuer cette action';
    }
}
exports.default = exports.permissions;
