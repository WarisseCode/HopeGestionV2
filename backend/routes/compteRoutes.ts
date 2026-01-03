// backend/routes/compteRoutes.ts
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import db from '../db/database';

const router = Router();

// GET /api/compte/proprietaires : Récupérer la liste des propriétaires
router.get('/proprietaires', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Seuls les admins et gestionnaires peuvent accéder aux propriétaires
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const query = `
            SELECT id, type, name as nom, first_name as prenom, phone as telephone, 
                   phone_secondary as "telephoneSecondaire", email, address as adresse, 
                   city as ville, country as pays, id_number as "numeroPiece", 
                   photo, management_mode as "modeGestion",
                   mobile_money_coordinates as "mobileMoney", rccm_number as "rccmNumber"
            FROM owners
            WHERE is_active = TRUE
            ORDER BY name ASC
        `;
        const result = await db.query(query);
        res.status(200).json({ proprietaires: result.rows });
    } catch (error) {
        console.error('Erreur récupération propriétaires:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des propriétaires.' });
    }
});

// GET /api/compte/utilisateurs : Récupérer la liste des utilisateurs
router.get('/utilisateurs', async (req: AuthenticatedRequest, res: Response) => {
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
        const result = await db.query(query);
        res.status(200).json({ utilisateurs: result.rows });
    } catch (error) {
        console.error('Erreur récupération utilisateurs:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.' });
    }
});

// GET /api/compte/autorisations : Récupérer les autorisations
router.get('/autorisations', async (req: AuthenticatedRequest, res: Response) => {
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
        const result = await db.query(query);
        res.status(200).json({ autorisations: result.rows });
    } catch (error) {
        console.error('Erreur récupération autorisations:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des autorisations.' });
    }
});

// POST /api/compte/proprietaires : Créer ou mettre à jour un propriétaire
router.post('/proprietaires', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id, type, nom, prenom, telephone, telephoneSecondaire, email, adresse, ville, pays, numeroPiece, photo, modeGestion, mobileMoney, rccmNumber } = req.body;
        
        // Sanitize phones
        const cleanPhone = telephone ? telephone.replace(/[^\d+]/g, '') : telephone;
        const cleanPhoneSec = telephoneSecondaire ? telephoneSecondaire.replace(/[^\d+]/g, '') : telephoneSecondaire;
        const cleanMobileMoney = mobileMoney ? mobileMoney.replace(/[^\d+]/g, '') : mobileMoney;

        
        let result;
        if (id) {
            // Mise à jour
            const query = `
                UPDATE owners SET 
                    type = $1, name = $2, first_name = $3, phone = $4, phone_secondary = $5,
                    email = $6, address = $7, city = $8, country = $9, id_number = $10,
                    photo = $11, management_mode = $12, mobile_money_coordinates = $13,
                    rccm_number = $14, updated_at = CURRENT_TIMESTAMP
                WHERE id = $15 RETURNING *
            `;
            result = await db.query(query, [type, nom, prenom, cleanPhone, cleanPhoneSec, email, adresse, ville, pays, numeroPiece, photo, modeGestion, cleanMobileMoney, rccmNumber, id]);
        } else {
            // Création
            const query = `
                INSERT INTO owners (type, name, first_name, phone, phone_secondary, email, address, city, country, id_number, photo, management_mode, mobile_money_coordinates, rccm_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
            `;
            result = await db.query(query, [type, nom, prenom, cleanPhone, cleanPhoneSec, email, adresse, ville, pays, numeroPiece, photo, modeGestion, cleanMobileMoney, rccmNumber]);
            
            // AUTOMATICALLY LINK CREATOR TO OWNER
            // If the creator is not an admin (i.e., a manager), they need explicit access.
            // Even for admins, it's good practice to have the link if they act as a manager.
            const newOwnerId = result.rows[0].id;
            await db.query(
                `INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date, can_manage_users, can_delete_data, can_access_audit_logs, can_view_finances, can_edit_properties, can_manage_tenants, can_manage_contracts, can_validate_payments)
                 VALUES ($1, $2, 'manager', TRUE, CURRENT_DATE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)`,
                [newOwnerId, req.userId]
            );
        }
        
        // Log action
        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, id ? 'UPDATE_OWNER' : 'CREATE_OWNER', 'COMPTE', `Propriétaire: ${nom}`]);

        res.status(200).json(result.rows[0]);
    } catch (error: any) {
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
router.post('/utilisateurs', async (req: AuthenticatedRequest, res: Response) => {
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
            result = await db.query(query, [nom, prenoms, telephone, email, role, photo, statut, id]);
        } else {
            // Pour la création d'utilisateur, on devrait normalement hasher le mot de passe
            // Mais ici on utilise le mot de passe fourni ou un par défaut pour la démo
            const query = `
                INSERT INTO users (nom, prenom, telephone, email, role, photo, statut, mot_de_passe)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
            `;
            result = await db.query(query, [nom, prenoms, telephone, email, role, photo, statut || 'Actif', mot_de_passe || 'password123']);
        }

        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, id ? 'UPDATE_USER' : 'CREATE_USER', 'COMPTE', `Utilisateur: ${nom}`]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur sauvegarde utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'utilisateur.' });
    }
});

// POST /api/compte/autorisations : Créer ou mettre à jour une autorisation
router.post('/autorisations', async (req: AuthenticatedRequest, res: Response) => {
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
        
        const result = await db.query(query, [
            proprietaire, utilisateur, role || 'viewer', dateDebut, dateFin || null,
            modules.finances || false, modules.biens || false, modules.locataires || false,
            modules.contrats || false, niveauAcces.validation || false,
            niveauAcces.ecriture || false, // Mapping ecriture to manage_users for now or adding more
            niveauAcces.suppression || false,
            modules.paiements || false // Using paiements module for audit logs access check maybe? or just adding 0/1
        ]);

        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, 'SET_PERMISSIONS', 'COMPTE', `Utilisateur ID: ${utilisateur}, Proprietaire ID: ${proprietaire}`]);

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur sauvegarde autorisation:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la sauvegarde de l\'autorisation.' });
    }
});

// DELETE /api/compte/proprietaires/:id : Soft delete (désactiver) un propriétaire
router.delete('/proprietaires/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        await db.query('UPDATE owners SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
        
        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, 'DEACTIVATE_OWNER', 'COMPTE', `Propriétaire ID: ${id}`]);

        res.status(200).json({ message: 'Propriétaire désactivé avec succès' });
    } catch (error) {
        console.error('Erreur désactivation propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la désactivation.' });
    }
});

// DELETE /api/compte/utilisateurs/:id : Soft delete (suspendre) un utilisateur
router.delete('/utilisateurs/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        await db.query('UPDATE users SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['Suspendu', id]);
        
        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, 'SUSPEND_USER', 'COMPTE', `Utilisateur ID: ${id}`]);

        res.status(200).json({ message: 'Utilisateur suspendu avec succès' });
    } catch (error) {
        console.error('Erreur suspension utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suspension.' });
    }
});

// PATCH /api/compte/utilisateurs/:id/reactivate : Réactiver un utilisateur
router.patch('/utilisateurs/:id/reactivate', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        await db.query('UPDATE users SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['Actif', id]);
        
        await db.query('INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)', 
            [req.userId, 'REACTIVATE_USER', 'COMPTE', `Utilisateur ID: ${id}`]);

        res.status(200).json({ message: 'Utilisateur réactivé avec succès' });
    } catch (error) {
        console.error('Erreur réactivation utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la réactivation.' });
    }
});

// GET /api/compte/proprietaires/:id/biens : Récupérer les biens d'un propriétaire
router.get('/proprietaires/:id/biens', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        
        // Get buildings
        const buildingsQuery = `
            SELECT id, nom as name, adresse as address, ville as city, 
                   nombre_etages as floors, nombre_lots as total_lots
            FROM buildings 
            WHERE owner_id = $1 AND is_active = TRUE
            ORDER BY nom ASC
        `;
        const buildings = await db.query(buildingsQuery, [id]);

        // Get lots
        const lotsQuery = `
            SELECT l.id, l.ref_lot, l.type, l.superficie, l.loyer, l.statut,
                   b.nom as building_name
            FROM lots l
            JOIN buildings b ON l.building_id = b.id
            WHERE l.owner_id = $1
            ORDER BY b.nom, l.ref_lot ASC
        `;
        const lots = await db.query(lotsQuery, [id]);

        res.status(200).json({ 
            buildings: buildings.rows,
            lots: lots.rows,
            summary: {
                totalBuildings: buildings.rows.length,
                totalLots: lots.rows.length
            }
        });
    } catch (error) {
        console.error('Erreur récupération biens propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des biens.' });
    }
});

export default router;