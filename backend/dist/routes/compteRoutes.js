"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/compteRoutes.ts
const express_1 = require("express");
const database_1 = __importDefault(require("../db/database"));
const router = (0, express_1.Router)();
// GET /api/compte/proprietaires : Récupérer la liste des propriétaires
router.get('/proprietaires', async (req, res) => {
    // Vérification : Seuls les admins et gestionnaires peuvent accéder aux propriétaires
    if (!['admin', 'gestionnaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const query = `
            SELECT id, type, name as nom, first_name as prenom, phone as telephone, 
                   phone_secondary as "telephoneSecondaire", email, address as adresse, 
                   city as ville, country as pays, id_number as "numeroPiece", 
                   photo, management_mode as "modeGestion"
            FROM owners
            WHERE is_active = TRUE
            ORDER BY name ASC
        `;
        const result = await database_1.default.query(query);
        res.status(200).json({ proprietaires: result.rows });
    }
    catch (error) {
        console.error('Erreur récupération propriétaires:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des propriétaires.' });
    }
});
// GET /api/compte/utilisateurs : Récupérer la liste des utilisateurs
router.get('/utilisateurs', async (req, res) => {
    // Vérification : Seuls les admins peuvent accéder à la liste des utilisateurs
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const query = `
            SELECT id, nom, prenom as prenoms, telephone, email, role, photo, statut
            FROM users
            ORDER BY nom ASC
        `;
        const result = await database_1.default.query(query);
        res.status(200).json({ utilisateurs: result.rows });
    }
    catch (error) {
        console.error('Erreur récupération utilisateurs:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
    }
});
// GET /api/compte/autorisations : Récupérer les autorisations
router.get('/autorisations', async (req, res) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const query = `
            SELECT ou.*, u.nom as user_name, o.name as owner_name
            FROM owner_user ou
            JOIN users u ON ou.user_id = u.id
            JOIN owners o ON ou.owner_id = o.id
            WHERE ou.is_active = TRUE
        `;
        const result = await database_1.default.query(query);
        res.status(200).json({ autorisations: result.rows });
    }
    catch (error) {
        console.error('Erreur récupération autorisations:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des autorisations.' });
    }
});
// POST /api/compte/proprietaires : Créer ou mettre à jour un propriétaire
router.post('/proprietaires', async (req, res) => {
    if (!['admin', 'gestionnaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const { id, type, nom, prenom, telephone, telephoneSecondaire, email, adresse, ville, pays, numeroPiece, photo, modeGestion } = req.body;
        let result;
        if (id) {
            // Mise à jour
            const query = `
                UPDATE owners SET 
                    type = $1, name = $2, first_name = $3, phone = $4, phone_secondary = $5,
                    email = $6, address = $7, city = $8, country = $9, id_number = $10,
                    photo = $11, management_mode = $12, updated_at = CURRENT_TIMESTAMP
                WHERE id = $13 RETURNING *
            `;
            result = await database_1.default.query(query, [type, nom, prenom, telephone, telephoneSecondaire, email, adresse, ville, pays, numeroPiece, photo, modeGestion, id]);
        }
        else {
            // Création
            const query = `
                INSERT INTO owners (type, name, first_name, phone, phone_secondary, email, address, city, country, id_number, photo, management_mode)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
            `;
            result = await database_1.default.query(query, [type, nom, prenom, telephone, telephoneSecondaire, email, adresse, ville, pays, numeroPiece, photo, modeGestion]);
            // AUTOMATICALLY LINK CREATOR TO OWNER
            // If the creator is not an admin (i.e., a manager), they need explicit access.
            // Even for admins, it's good practice to have the link if they act as a manager.
            const newOwnerId = result.rows[0].id;
            await database_1.default.query(`INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date, can_manage_users, can_delete_data, can_access_audit_logs, can_view_finances, can_edit_properties, can_manage_tenants, can_manage_contracts, can_validate_payments)
                 VALUES ($1, $2, 'manager', TRUE, CURRENT_DATE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)`, [newOwnerId, req.userId]);
        }
        // Log action
        await database_1.default.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', [req.userId, id ? 'UPDATE_OWNER' : 'CREATE_OWNER', 'COMPTE', `Propriétaire: ${nom}`]);
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Erreur sauvegarde propriétaire:', error);
        if (error.code === '23505') {
            if (error.constraint === 'owners_phone_key') {
                return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre propriétaire.' });
            }
            return res.status(400).json({ message: 'Une donnée unique existe déjà (téléphone ou email).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde du propriétaire.' });
    }
});
// POST /api/compte/utilisateurs : Créer ou mettre à jour un utilisateur
router.post('/utilisateurs', async (req, res) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const { id, nom, prenoms, telephone, email, role, photo, statut, mot_de_passe } = req.body;
        let result;
        if (id) {
            const query = `
                UPDATE users SET 
                    nom = $1, prenom = $2, telephone = $3, email = $4, role = $5,
                    photo = $6, statut = $7, updated_at = CURRENT_TIMESTAMP
                WHERE id = $8 RETURNING *
            `;
            result = await database_1.default.query(query, [nom, prenoms, telephone, email, role, photo, statut, id]);
        }
        else {
            // Pour la création d'utilisateur, on devrait normalement hasher le mot de passe
            // Mais ici on utilise le mot de passe fourni ou un par défaut pour la démo
            const query = `
                INSERT INTO users (nom, prenom, telephone, email, role, photo, statut, mot_de_passe)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
            `;
            result = await database_1.default.query(query, [nom, prenoms, telephone, email, role, photo, statut || 'Actif', mot_de_passe || 'password123']);
        }
        await database_1.default.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', [req.userId, id ? 'UPDATE_USER' : 'CREATE_USER', 'COMPTE', `Utilisateur: ${nom}`]);
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'utilisateur.' });
    }
});
// POST /api/compte/autorisations : Créer ou mettre à jour une autorisation
router.post('/autorisations', async (req, res) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    try {
        const { utilisateur, proprietaire, role, modules, niveauAcces, dateDebut, dateFin } = req.body;
        // Modules et niveauAcces sont des objets JSON, on peut les stocker ou utiliser les colonnes booléennes existantes
        const query = `
            INSERT INTO owner_user (
                owner_id, user_id, role, start_date, end_date, is_active,
                can_view_finances, can_edit_properties, can_manage_tenants, 
                can_manage_contracts, can_validate_payments, can_manage_users,
                can_delete_data, can_access_audit_logs
            ) VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (owner_id, user_id) DO UPDATE SET
                role = $3, start_date = $4, end_date = $5, is_active = TRUE,
                can_view_finances = $6, can_edit_properties = $7, can_manage_tenants = $8,
                can_manage_contracts = $9, can_validate_payments = $10,
                can_manage_users = $11, can_delete_data = $12, can_access_audit_logs = $13
            RETURNING *
        `;
        const result = await database_1.default.query(query, [
            proprietaire, utilisateur, role || 'viewer', dateDebut, dateFin || null,
            modules.finances || false, modules.biens || false, modules.locataires || false,
            modules.contrats || false, niveauAcces.validation || false,
            niveauAcces.ecriture || false, // Mapping ecriture to manage_users for now or adding more
            niveauAcces.suppression || false,
            modules.paiements || false // Using paiements module for audit logs access check maybe? or just adding 0/1
        ]);
        await database_1.default.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', [req.userId, 'SET_PERMISSIONS', 'COMPTE', `Utilisateur ID: ${utilisateur}, Proprietaire ID: ${proprietaire}`]);
        res.status(200).json(result.rows[0]);
    }
    catch (error) {
        console.error('Erreur sauvegarde autorisation:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'autorisation.' });
    }
});
exports.default = router;
//# sourceMappingURL=compteRoutes.js.map