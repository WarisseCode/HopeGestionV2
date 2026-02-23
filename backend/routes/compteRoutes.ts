// backend/routes/compteRoutes.ts
import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import db from '../db/database';
import { AuditService } from '../services/AuditService';

const router = Router();

// GET /api/compte/proprietaires : Récupérer la liste des propriétaires
router.get('/proprietaires', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Admins, gestionnaires, managers ET propriétaires peuvent accéder (avec filtre)
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire', 'owner'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        let query = `
            SELECT id, type, name as nom, first_name as prenom, phone as telephone, 
                   phone_secondary as "telephoneSecondaire", phone_secondary as "phone_secondary",
                   email, address as adresse, address as address,
                   city as ville, country as pays, id_number as "numeroPiece", 
                   id_number as "id_number",
                   photo, management_mode as "modeGestion",
                   mobile_money_number as "mobileMoney", 
                   id_number as "rccmNumber"
            FROM owners
            WHERE is_active = TRUE
        `;
        const params: any[] = [];

        // Si ce n'est pas un admin, on filtre pour ne montrer que les propriétaires liés (via owner_user)
        if (req.userRole !== 'admin') {
            // Trouver les IDs owner liés à cet utilisateur
            const linkResult = await db.query(
                `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = TRUE`,
                [req.userId]
            );
            
            if (linkResult.rows.length > 0) {
                // Filtrer sur les IDs trouvés
                const ownerIds = linkResult.rows.map(row => row.owner_id);
                query += ` AND id = ANY($1)`;
                params.push(ownerIds);
            } else {
                // Pas de lien owner trouvé -> liste vide
                return res.json({ proprietaires: [] });
            }
        }

        query += ` ORDER BY name ASC`;
        
        const result = await db.query(query, params);
        res.status(200).json({ proprietaires: result.rows });
    } catch (error) {
        console.error('Erreur récupération propriétaires:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des propriétaires.' });
    }
});

// GET /api/compte/utilisateurs : Récupérer la liste des utilisateurs
router.get('/utilisateurs', async (req: AuthenticatedRequest, res: Response) => {
    // Vérification : Admins, gestionnaires et propriétaires peuvent accéder à la liste des utilisateurs
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        let query: string;
        let queryParams: any[] = [];

        if (req.userRole === 'admin') {
            // Admin sees all users
            query = `
                SELECT id, nom, '' as prenom, telephone, email, role, photo_url as photo, statut, created_at
                FROM users
                ORDER BY nom ASC
            `;
        } else {
            // Gestionnaire/Proprietaire see only users they created
            query = `
                SELECT id, nom, '' as prenom, telephone, email, role, photo_url as photo, statut, created_at
                FROM users
                WHERE id = $1
                ORDER BY nom ASC
            `;
            queryParams = [req.userId];
        }
        
        const result = await db.query(query, queryParams);
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
    // Autoriser Admin, Gestionnaire ET Propriétaire à créer
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const cleanPhone = req.body.phone ? req.body.phone.replace(/[^\d+]/g, '') : null;
        const cleanMobileMoney = req.body.mobile_money_number ? req.body.mobile_money_number.replace(/[^\d+]/g, '') : null;

        // Générer un code manager sécurisé (AG- + 6 alphanum aléatoires)
        const managerCode = `AG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        console.log(`[compteRoutes] Creating owner with managerCode: ${managerCode}`);

        // Insérer le propriétaire (schema matches ownerRoutes.ts)
        const newOwner = await db.query(
            `INSERT INTO owners (
                type, name, first_name, phone, phone_secondary, email,
                address, city, country, id_number, photo, mobile_money_number, management_mode,
                manager_code
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            RETURNING *`,
            [
                req.body.type || 'individual',
                req.body.name || req.body.company_name, // Nom ou Raison sociale
                req.body.first_name || req.body.prenom || '', // Support both field names
                cleanPhone,
                req.body.phone_secondary || req.body.secondary_phone || null, // Support both field names
                req.body.email || '',
                req.body.address || '',
                req.body.city || '',
                req.body.country || 'Bénin',
                req.body.id_number || null,
                req.body.photo || req.body.photo_url || null, // Support both field names
                cleanMobileMoney || (req.body.mobile_money ? req.body.mobile_money.replace(/[^\d+]/g, '') : null), // Support both
                req.body.management_mode || 'direct',
                managerCode
            ]
        );


        
        const ownerId = newOwner.rows[0].id;
        
        // Lier à l'utilisateur qui crée (si ce n'est pas un admin pur qui crée pour les autres)
        try {
            await db.query(
                `INSERT INTO owner_user (user_id, owner_id, role, is_active, start_date) VALUES ($1, $2, 'owner', true, CURRENT_DATE)`,
                [req.userId!, ownerId]
            );
        } catch (linkError) {
            console.error('Erreur liaison owner_user:', linkError);
            // On continue même si la liaison échoue (non critique pour la création)
        }

        // Log action
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'CREATE_OWNER',
            module: 'COMPTE',
            details: { name: req.body.name || req.body.company_name }
        });

        res.status(201).json(newOwner.rows[0]);
    } catch (error: any) {
        console.error('Erreur création propriétaire:', error);
        if (error.constraint === 'owners_phone_key') {
             return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre propriétaire.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du propriétaire' });
    }
});

// PUT /api/compte/proprietaires/:id : Modifier un propriétaire
router.put('/proprietaires/:id', async (req: AuthenticatedRequest, res: Response) => {
    // Autoriser Admin, Gestionnaire ET Propriétaire à modifier (si c'est le sien)
    if (!['admin', 'gestionnaire', 'manager', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const ownerId = req.params.id;

        // Si c'est un propriétaire, vérifier qu'il modifie le sien
        if (req.userRole === 'proprietaire') {
            const checkLink = await db.query(
                `SELECT 1 FROM owner_user WHERE user_id = $1 AND owner_id = $2`,
                [req.userId!, ownerId]
            );
            if (checkLink.rows.length === 0) {
                return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce propriétaire." });
            }
        }
        // Support multiple field names for backward compatibility
        const { 
            name, type, phone, email, address, city, country,
            company_name, rccm_number, id_number, mobile_money, mobile_money_number,
            telephoneSecondaire, secondary_phone, phone_secondary,
            first_name, prenom,
            management_mode,
            photo, photo_url
        } = req.body;
        
        // Nettoyage des numéros avec support de multiples noms de champs
        const rawPhone = phone?.toString();
        const cleanPhone = rawPhone ? rawPhone.replace(/[\s\-\(\)\.]/g, '') : null;
        
        const rawPhoneSec = (phone_secondary || secondary_phone || telephoneSecondaire)?.toString();
        const cleanPhoneSec = rawPhoneSec ? rawPhoneSec.replace(/[\s\-\(\)\.]/g, '') : null;
        
        const rawMobileMoney = (mobile_money_number || mobile_money)?.toString();
        const cleanMobileMoney = rawMobileMoney ? rawMobileMoney.replace(/[\s\-\(\)\.]/g, '') : null;

        let updatedOwner;
        try {
            // Note: On met à jour id_number ET rccm_number pour être cohérent avec le type de propriétaire
            updatedOwner = await db.query(
                `UPDATE owners 
                 SET name = COALESCE($1, name), 
                     type = COALESCE($2, type), 
                     phone = COALESCE($3, phone), 
                     email = COALESCE($4, email), 
                     address = COALESCE($5, address),
                     city = COALESCE($6, city),
                     country = COALESCE($7, country),
                     first_name = COALESCE($8, first_name),
                     id_number = COALESCE($9, id_number), 
                     rccm_number = COALESCE($14, rccm_number),
                     mobile_money_number = COALESCE($10, mobile_money_number),
                     phone_secondary = COALESCE($11, phone_secondary),
                     management_mode = COALESCE($12, management_mode),
                     photo_url = COALESCE($15, photo_url),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $13 RETURNING *`,
                [
                    name || company_name || null, 
                    type || null, 
                    cleanPhone || null, 
                    email || null, 
                    address || null,
                    city || null,
                    country || null,
                    first_name || prenom || null,
                    id_number || null, 
                    cleanMobileMoney || null, 
                    cleanPhoneSec || null,
                    management_mode || null, 
                    ownerId,
                    rccm_number || null,
                    photo || photo_url || null
                ]
            );
        } catch (error: any) {
            console.error('Erreur SQL modification propriétaire:', error);
            if (error.code === '23505') {
                if (error.constraint === 'owners_phone_key') {
                    return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre propriétaire.' });
                }
                if (error.constraint === 'owners_email_key') {
                    return res.status(400).json({ message: 'Cette adresse email est déjà utilisée par un autre propriétaire.' });
                }
                return res.status(400).json({ message: `Une donnée unique est déjà utilisée : ${error.detail || error.message}` });
            }
            throw error; 
        }

        if (updatedOwner.rows.length === 0) {
            return res.status(404).json({ message: 'Propriétaire non trouvé' });
        }

        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'UPDATE_OWNER',
            module: 'COMPTE',
            details: { ownerId, message: `Propriétaire ID: ${ownerId}` }
        });

        res.json(updatedOwner.rows[0]);
    } catch (error: any) {
        console.error('Erreur modification propriétaire:', error);
        res.status(500).json({ 
            message: 'Erreur serveur lors de la modification.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
});

// POST /api/compte/utilisateurs : Créer ou mettre à jour un utilisateur
router.post('/utilisateurs', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
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
            // Pour la création d'utilisateur
            const query = `
                INSERT INTO users (nom, telephone, email, role, photo_url, statut, password_hash, user_type)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
            `;
            // Note: We should hash the password properly - using a placeholder for now
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(mot_de_passe || 'TempPassword123!', 10);
            result = await db.query(query, [nom, telephone, email, role, photo, statut || 'actif', hashedPassword, role || 'gestionnaire']);
        }

        await AuditService.log({
            userId: req.userId!.toString(),
            action: id ? 'UPDATE_USER' : 'CREATE_USER',
            module: 'COMPTE',
            details: { nom, message: `Utilisateur: ${nom}` }
        });

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

        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'SET_PERMISSIONS',
            module: 'COMPTE',
            details: { utilisateur, proprietaire, message: `Utilisateur ID: ${utilisateur}, Proprietaire ID: ${proprietaire}` }
        });

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
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'DEACTIVATE_OWNER',
            module: 'COMPTE',
            details: { ownerId: id, message: `Propriétaire ID: ${id}` }
        });

        res.status(200).json({ message: 'Propriétaire désactivé avec succès' });
    } catch (error) {
        console.error('Erreur désactivation propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la désactivation.' });
    }
});

// PATCH /api/compte/utilisateurs/:id/suspend : Soft delete (suspendre) un utilisateur
router.patch('/utilisateurs/:id/suspend', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        await db.query('UPDATE users SET statut = $1 WHERE id = $2', ['Suspendu', id]);
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'SUSPEND_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id}` }
        });

        res.status(200).json({ message: 'Utilisateur suspendu avec succès' });
    } catch (error) {
        console.error('Erreur suspension utilisateur:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la suspension.' });
    }
});

// DELETE /api/compte/utilisateurs/:id : HARD DELETE (supprimer définitivement)
router.delete('/utilisateurs/:id', async (req: AuthenticatedRequest, res: Response) => {
    if (req.userRole !== 'admin') {
        // Only admin can hard delete, or maybe gestionnaire too? Let's restrict to admin/gestionnaire for now
        // Assuming user wants validation for hard delete
         if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
            return res.status(403).json({ message: 'Accès refusé.' });
        }
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // 1. Remove assignments first (foreign key constraints)
        await client.query('DELETE FROM user_owner_assignments WHERE user_id = $1', [id]);
        
        // 2. Remove from owner_user if existing
        await client.query('DELETE FROM owner_user WHERE user_id = $1', [id]);

        // 3. Remove user
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'DELETE_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id} (Supprimé définitivement)` }
        });

        await client.query('COMMIT');
        res.status(200).json({ message: 'Utilisateur supprimé définitivement' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Erreur suppression utilisateur:', error);
        
        // Handle Foreign Key Constraint (RESTRICT)
        if (error.code === '23001' || error.constraint === 'leases_lot_id_fkey') {
           return res.status(400).json({ 
               message: 'Impossible de supprimer cet utilisateur : Il possède des biens liés à des contrats de location actifs. Veuillez d\'abord résilier les baux concernés.' 
           });
        }

        res.status(500).json({ message: 'Erreur serveur lors de la suppression.' });
    } finally {
        client.release();
    }
});

// PATCH /api/compte/utilisateurs/:id/reactivate : Réactiver un utilisateur
router.patch('/utilisateurs/:id/reactivate', async (req: AuthenticatedRequest, res: Response) => {
    if (!['admin', 'gestionnaire', 'proprietaire'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }

    try {
        const { id } = req.params;
        await db.query('UPDATE users SET statut = $1 WHERE id = $2', ['Actif', id]);
        
        await AuditService.log({
            userId: req.userId!.toString(),
            action: 'REACTIVATE_USER',
            module: 'COMPTE',
            details: { userId: id, message: `Utilisateur ID: ${id}` }
        });

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