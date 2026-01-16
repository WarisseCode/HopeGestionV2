// backend/routes/authRoutes.ts

import { Router } from 'express';
import { Pool } from 'pg'; 
import * as dotenv from 'dotenv';

// Outils de sécurité
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import crypto from 'crypto';

// Charger les variables d'environnement
dotenv.config();

import { AuditService } from '../services/AuditService';

const router = Router();

// Pour que les routes aient accès à la DB (Méthode simple pour le MVP)
import pool from '../db/database';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const SALT_ROUNDS = 10; // Niveau de complexité pour bcrypt

// 1. Endpoint d'INSCRIPTION
router.post('/register', async (req, res) => {
    const { email, password, prenoms, nom, telephone, userType, nomAgence } = req.body;

    try {
        // Validation des champs requis
        if (!email || !password || !nom || !prenoms || !telephone) {
            return res.status(400).json({ 
                message: 'Tous les champs sont requis : email, mot de passe, nom, prénoms et téléphone.' 
            });
        }

        // Vérification de la validité de l'email
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Veuillez fournir une adresse email valide.' 
            });
        }

        // Vérification de la longueur du mot de passe
        if (password.length < 6) {
            return res.status(400).json({ 
                message: 'Le mot de passe doit contenir au moins 6 caractères.' 
            });
        }

        // Nettoyage et validation du téléphone
        // On enlève les espaces, tirets, parenthèses pour ne garder que + et chiffres
        const cleanPhone = telephone.replace(/[^\d+]/g, '');

        // Vérification du format du téléphone (formats internationaux ou locaux acceptés après nettoyage)
        // Accepte +229..., 00229..., ou juste des chiffres
        const phoneRegex = /^(\+|00)?[1-9]\d{1,14}$/;
        
        // Si le numéro commence par 0 (format local sans indicatif), on peut l'accepter ou le rejeter
        // Ici on décide d'être permissif si c'est des chiffres, mais on préfère E.164 (+...)
        // L'expression ci-dessus demande (optionnel + ou 00) puis un chiffre 1-9.
        // Donc "01..." sera rejeté. Pour accepter "01...", on doit ajuster.
        // Mais PhoneInput envoie "+229 ..." donc cleanPhone sera "+229..." -> OK.
        
        if (!phoneRegex.test(cleanPhone)) {
             // Fallback: Si c'est un format local (ex: 01 97...) on pourrait l'accepter
             // Essayons une regex plus simple : au moins 8 chiffres
             const simpleRegex = /^(\+)?\d{8,15}$/;
             if (!simpleRegex.test(cleanPhone)) {
                return res.status(400).json({ 
                    message: 'Veuillez fournir un numéro de téléphone valide.' 
                });
             }
        }
        // Save the cleaned phone number
        const finalPhone = cleanPhone;

        // Hachage du mot de passe
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Insertion dans la base de données
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, nom, user_type, role, telephone) 
             VALUES ($1, $2, TRIM($3 || ' ' || $4), $5, $5, $6) RETURNING id`,
            [email, password_hash, nom, prenoms, userType || 'gestionnaire', finalPhone]
        );

        // Log successful registration
        await AuditService.log({
            userId: result.rows[0].id.toString(),
            action: 'REGISTER',
            entityType: 'USER',
            entityId: result.rows[0].id.toString(),
            details: { email, userType: userType || 'gestionnaire' },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.status(201).json({ 
            message: 'Utilisateur créé avec succès.',
            userId: result.rows[0].id
        });

    } catch (error: any) {
        console.error('Erreur inscription:', error);
        
        // Gérer l'erreur d'email déjà utilisé (code d'erreur PostgreSQL 23505)
        if (error.code === '23505') {
            return res.status(409).json({ 
                message: 'Cet email est déjà utilisé par un autre compte.' 
            });
        }
        
        // Gérer l'erreur de téléphone déjà utilisé
        if (error.code === '23505' && error.detail && error.detail.includes('telephone')) {
            return res.status(409).json({ 
                message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.' 
            });
        }
        
        // Erreur de connexion à la base de données
        if (error.code === '23502') { // NOT NULL constraint violation
            return res.status(400).json({ 
                message: 'Un champ requis n\'a pas été fourni correctement.' 
            });
        }
        
        // Erreur générique
        res.status(500).json({ 
            message: 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
    }
});

// 2. Endpoint de CONNEXION (Login)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validation des champs requis
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email et mot de passe sont requis.' 
            });
        }

        // Vérification de la validité de l'email
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: 'Veuillez fournir une adresse email valide.' 
            });
        }

        // Vérification de la longueur du mot de passe
        if (password.length < 1) {
            return res.status(400).json({ 
                message: 'Le mot de passe ne peut pas être vide.' 
            });
        }

        // 1. Rechercher l'utilisateur par email
        const result = await pool.query(
            'SELECT id, password_hash, role, statut FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                message: 'Aucun compte n\'est associé à cet email.' 
            });
        }

        const utilisateur = result.rows[0];
        
        // Vérifier si le compte est actif
        if (utilisateur.statut === 'inactif' || utilisateur.statut === 'suspendu') {
            return res.status(401).json({ 
                message: 'Votre compte est inactif ou suspendu. Veuillez contacter l\'administrateur.' 
            });
        }

        // 2. Comparer le mot de passe fourni avec le mot de passe haché en DB
        const match = await bcrypt.compare(password, utilisateur.password_hash);

        if (!match) {
            return res.status(401).json({ 
                message: 'Mot de passe incorrect.' 
            });
        }

        // 3. Générer le jeton JWT
        const token = jwt.sign(
            { id: utilisateur.id, role: utilisateur.role }, 
            JWT_SECRET, 
            { expiresIn: '1d' } // Le jeton expire après 1 jour
        );

        // 4. Log Audit
        try {
            await AuditService.log({
                userId: utilisateur.id.toString(),
                action: 'LOGIN',
                entityType: 'USER',
                entityId: utilisateur.id.toString(),
                details: { role: utilisateur.role },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });
        } catch (e) { console.error('Audit log failed', e); }

        // 5. Succès: Renvoyer le jeton et le rôle
        res.status(200).json({
            token,
            userId: utilisateur.id,
            role: utilisateur.role
        });

    } catch (error: any) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ 
            message: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
    }
});

// Middleware de vérification de token (simplifié pour ce fichier)
const verifyToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Accès refusé. Token manquant.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Token invalide.' });
        req.user = user;
        next();
    });
};

// 3. Endpoint PROFILE (GET)
router.get('/profile', verifyToken, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            `SELECT id, nom, user_type, role, email, telephone, photo_url, preferences, is_guest 
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = result.rows[0];
        
        // Séparation nom/prénom
        const nameParts = user.nom.split(' ');
        const lastName = nameParts[0];
        const firstName = nameParts.slice(1).join(' ');

        // --- FETCH PERMISSIONS ---
        let permissions: any = {};

        // 1. Full access for Admin (Always)
        if (user.role === 'admin') {
            permissions = {
                biens_read: true, biens_write: true,
                locataires_read: true, locataires_write: true,
                owners_read: true, owners_write: true,
                finance_read: true, finance_write: true, finance_validate: true,
                contrats_read: true, contrats_write: true,
                documents_read: true, documents_write: true,
                users_read: true, users_write: true,
                can_delete: true
            };
        } else if (['proprietaire', 'gestionnaire'].includes(user.role)) {
            // 2. For Proprietaire/Gestionnaire: Check Matrix FIRST, then fall back to defaults
            // This allows customizable restrictions even for these roles.
            
            const matrixResult = await pool.query(
                `SELECT module, can_read, can_write, can_validate, can_delete FROM permission_matrix WHERE role = $1`,
                [user.role]
            );

            if (matrixResult.rows.length > 0) {
                 // Initialize all to false first
                permissions = {
                    biens_read: false, biens_write: false,
                    locataires_read: false, locataires_write: false,
                    owners_read: false, owners_write: false,
                    finance_read: false, finance_write: false, finance_validate: false,
                    contrats_read: false, contrats_write: false,
                    documents_read: false, documents_write: false,
                    users_read: false, users_write: false,
                    can_delete: false
                };
                
                for (const row of matrixResult.rows) {
                    const mod = row.module.toLowerCase();
                    if (mod === 'biens') { permissions.biens_read = row.can_read; permissions.biens_write = row.can_write; }
                    if (mod === 'locataires') { permissions.locataires_read = row.can_read; permissions.locataires_write = row.can_write; }
                    if (mod === 'owners') { permissions.owners_read = row.can_read; permissions.owners_write = row.can_write; }
                    if (mod === 'finance') { 
                        permissions.finance_read = row.can_read; 
                        permissions.finance_write = row.can_write; 
                        permissions.finance_validate = row.can_validate; 
                    }
                    if (mod === 'contrats') { permissions.contrats_read = row.can_read; permissions.contrats_write = row.can_write; }
                    if (mod === 'documents') { permissions.documents_read = row.can_read; permissions.documents_write = row.can_write; }
                    if (mod === 'users') { permissions.users_read = row.can_read; permissions.users_write = row.can_write; }
                    if (row.can_delete) permissions.can_delete = true;
                }
            } else {
                 // No Matrix -> Default to FULL ACCESS
                permissions = {
                    biens_read: true, biens_write: true,
                    locataires_read: true, locataires_write: true,
                    owners_read: true, owners_write: true,
                    finance_read: true, finance_write: true, finance_validate: true,
                    contrats_read: true, contrats_write: true,
                    documents_read: true, documents_write: true,
                    users_read: true, users_write: true,
                    can_delete: true
                };
            }
        } else {
            // 3. Other roles (guests, delegated users)
            // ... (delegation logic follows)
            // 2. Try to get from owner_user delegation
            const delegationResult = await pool.query(
                `SELECT can_view_finances, can_edit_properties, can_manage_tenants,
                        can_manage_contracts, can_validate_payments, can_manage_users, can_delete_data
                 FROM owner_user 
                 WHERE user_id = $1 AND is_active = true 
                 LIMIT 1`,
                [userId]
            );

            if (delegationResult.rows.length > 0) {
                // Map old owner_user columns to new permission structure
                const d = delegationResult.rows[0];
                permissions = {
                    biens_read: d.can_edit_properties,
                    biens_write: d.can_edit_properties,
                    locataires_read: d.can_manage_tenants,
                    locataires_write: d.can_manage_tenants,
                    owners_read: d.can_manage_users,
                    owners_write: d.can_manage_users,
                    finance_read: d.can_view_finances,
                    finance_write: d.can_validate_payments,
                    finance_validate: d.can_validate_payments,
                    contrats_read: d.can_manage_contracts,
                    contrats_write: d.can_manage_contracts,
                    documents_read: d.can_view_finances || d.can_manage_contracts, // If can see finances or contracts, can see related docs
                    documents_write: d.can_manage_contracts,
                    users_read: d.can_manage_users,
                    users_write: d.can_manage_users,
                    can_delete: d.can_delete_data
                };
            } else {
                // 3. Fallback: Get defaults from permission_matrix based on role
                const matrixResult = await pool.query(
                    `SELECT module, can_read, can_write, can_validate, can_delete FROM permission_matrix WHERE role = $1`,
                    [user.role]
                );

                // Initialize all permissions to false
                permissions = {
                    biens_read: false,
                    biens_write: false,
                    locataires_read: false,
                    locataires_write: false,
                    owners_read: false,
                    owners_write: false,
                    finance_read: false,
                    finance_write: false,
                    finance_validate: false,
                    contrats_read: false,
                    contrats_write: false,
                    documents_read: false,
                    documents_write: false,
                    users_read: false,
                    users_write: false,
                    can_delete: false
                };

                // Map each module from permission_matrix
                for (const row of matrixResult.rows) {
                    const mod = row.module.toLowerCase();
                    
                    if (mod === 'biens') {
                        permissions.biens_read = row.can_read;
                        permissions.biens_write = row.can_write;
                    }
                    if (mod === 'locataires') {
                        permissions.locataires_read = row.can_read;
                        permissions.locataires_write = row.can_write;
                    }
                    if (mod === 'owners') {
                        permissions.owners_read = row.can_read;
                        permissions.owners_write = row.can_write;
                    }
                    if (mod === 'finance') {
                        permissions.finance_read = row.can_read;
                        permissions.finance_write = row.can_write;
                        permissions.finance_validate = row.can_validate;
                    }
                    if (mod === 'contrats') {
                        permissions.contrats_read = row.can_read;
                        permissions.contrats_write = row.can_write;
                    }
                    if (mod === 'documents') {
                        permissions.documents_read = row.can_read;
                        permissions.documents_write = row.can_write;
                    }
                    if (mod === 'users') {
                        permissions.users_read = row.can_read;
                        permissions.users_write = row.can_write;
                    }
                    
                    // Global delete is true if ANY module has can_delete
                    if (row.can_delete) {
                        permissions.can_delete = true;
                    }
                }
            }
        }

        res.json({
            message: 'Profil récupéré',
            user: {
                id: user.id,
                nom: lastName,
                prenom: firstName,
                email: user.email,
                telephone: user.telephone,
                role: user.role,
                userType: user.user_type,
                isGuest: user.is_guest || false,
                photo_url: user.photo_url,
                preferences: user.preferences || {},
                permissions  // <-- Now included!
            }
        });

    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// 4. Endpoint UPDATE PROFILE (PUT)
router.put('/profile', verifyToken, async (req: any, res) => {
    const { nom, prenom, email, telephone, preferences, photo_url } = req.body;
    const userId = req.user.id;

    try {
        // Debug: Log incoming data
        console.log('[PUT /profile] Received body:', JSON.stringify(req.body, null, 2));
        
        // Validation basique
        if (!email) return res.status(400).json({ message: 'Email requis.' });

        // Reconstruction du nom complet
        const fullName = `${nom} ${prenom}`.trim();

        await pool.query(
            `UPDATE users 
             SET nom = $1, email = $2, telephone = $3, preferences = $4, photo_url = $5 
             WHERE id = $6`,
            [fullName, email, telephone, JSON.stringify(preferences), photo_url, userId]
        );

        // Log
        await AuditService.log({
            userId: userId.toString(),
            action: 'UPDATE_PROFILE',
            entityType: 'USER',
            entityId: userId.toString(),
            details: { updatedFields: Object.keys(req.body) },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.json({ message: 'Profil mis à jour avec succès.' });

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// 5. Endpoint CHANGE PASSWORD (POST)
router.post('/change-password', verifyToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Veuillez fournir le mot de passe actuel et le nouveau.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
        }

        // 1. Récupérer le hash actuel
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

        const user = result.rows[0];

        // 2. Vérifier l'ancien mot de passe
        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
        }

        // 3. Hasher le nouveau
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 4. Mettre à jour
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        // 5. Log
        await AuditService.log({
            userId: userId.toString(),
            action: 'CHANGE_PASSWORD',
            entityType: 'USER',
            entityId: userId.toString(),
            details: {},
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        res.json({ message: 'Mot de passe modifié avec succès.' });

    } catch (error) {
        console.error('Erreur changement mot de passe:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// 6. Endpoint INVITE USER (POST)
router.post('/invite-user', verifyToken, async (req: any, res) => {
    const { email, nom, prenom, telephone, role, access_scope } = req.body;
    const issuerId = req.user.id;

    try {
        // Validation minimale
        if (!telephone || !nom || !role) {
            return res.status(400).json({ message: 'Nom, Téléphone et Rôle sont requis.' });
        }

        // 1. Créer le compte utilisateur en statut "invited" (ou "inactif" si "invited" n'est pas dans l'enum)
        // On met un hash impossible pour le password temporairement.
        const tempHash = '$2b$10$INVALIDHASHForInvitedUserOnlyXXXXXXXXXXXXXXXXXXXXX'; 
        
        // Check duplicate
        const check = await pool.query('SELECT id FROM users WHERE email = $1 OR telephone = $2', [email || '', telephone]);
        if (check.rows.length > 0) {
            return res.status(409).json({ message: 'Un utilisateur existe déjà avec cet email ou téléphone.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertRes = await client.query(
                `INSERT INTO users (email, password_hash, nom, user_type, role, telephone, statut, access_scope, created_by) 
                 VALUES ($1, $2, TRIM($3 || ' ' || $4), $5, $5, $6, 'invited', $7, $8) 
                 RETURNING id`,
                [email || null, tempHash, nom, prenom || '', role, telephone, access_scope || 'assigned', issuerId]
            );
            const userId = insertRes.rows[0].id;

            // 2. Générer Token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48h

            // 3. Stocker Invitation
            await client.query(
                `INSERT INTO user_invitations (token, email, role, issuer_id, permissions, expires_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [token, email || telephone, role, issuerId, { userId }, expiresAt] // Storing userId in permissions json as a link hack or use a generic json
            );
            // Wait, I created a schema with owner_id but no user_id column in invitations? 
            // Actually, I can use the permissions JSON to store the targeted user_id or just rely on email/phone matching.
            // But wait, the invitation needs to verify THIS specific pending user. 
            // Let's add user_id to user_invitations in a future migration or just put it in the JSON for now.
            // Better: update the schema I just made? No, I can't easily undo. 
            // I'll put it in permissions column for now: { "targetUserId": 123 }

            await client.query('COMMIT');

            // 4. Retourner le lien (pour envoi WhatsApp)
            // L'URL frontend: /accept-invite?token=...
            const link = `${req.headers.origin || 'http://localhost:5173'}/accept-invite?token=${token}`;
            
            res.status(201).json({ 
                message: 'Utilisateur invité avec succès.',
                link,
                token,
                userId
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error('Erreur invitation:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// 7. Endpoint ACCEPT INVITE (POST)
// Public endpoint (no token required)
router.post('/accept-invite', async (req, res) => {
    const { token, password, nom, prenom } = req.body;

    try {
        if (!token || !password) return res.status(400).json({ message: 'Token et mot de passe requis.' });

        // 1. Vérifier le token
        const inviteRes = await pool.query(
            `SELECT * FROM user_invitations WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
            [token]
        );

        if (inviteRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invitation invalide ou expirée.' });
        }

        const invite = inviteRes.rows[0];
        // Retrieve userId from json if we stored it there
        const targetUserId = invite.permissions?.userId; 

        if (!targetUserId) {
             return res.status(500).json({ message: 'Erreur intégrité invitation (User ID manquant).' });
        }

        // 2. Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 3. Mettre à jour l'utilisateur
            // On maj aussi le nom/prenom si l'utilisateur veut corriger lors de l'acceptation
            const updateQ = `
                UPDATE users 
                SET password_hash = $1, statut = 'actif', 
                    nom = COALESCE(NULLIF($3, ''), nom) -- Update name if provided
                WHERE id = $2`;
                
            await client.query(updateQ, [password_hash, targetUserId, nom ? `${nom} ${prenom||''}`.trim() : '']);

            // 4. Marquer invitation comme utilisée
            await client.query('UPDATE user_invitations SET used_at = NOW() WHERE id = $1', [invite.id]);

            await client.query('COMMIT');

            res.json({ message: 'Compte activé avec succès. Vous pouvez maintenant vous connecter.' });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur acceptation invitation:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// 8. Endpoint CREATE GUEST ACCESS (POST)
router.post('/create-guest', verifyToken, async (req: any, res) => {
    const { nom, prenom, telephone, durationDays, permissions, role } = req.body;
    const issuerId = req.user.id; // The owner/manager creating the guest access

    try {
        if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });

        // 1. Generate unique Guest Key
        // Format: GUEST-XXXX-YYYY (Random hex)
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        const accessKey = `GUEST-${randomPart}`;

        // 2. Calculate Expiration
        const days = durationDays || 7; // Default 1 week
        const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);

        // 3. Create User (Guest)
        // We use a dummy email/password since they are not used for login
        const dummyEmail = `${accessKey}@guest.local`;
        const dummyHash = '$2b$10$GUESTACCESSHASHONLYXXXXXXXXXXXXXXXXXXXXX'; 

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get issuer's agency_id
            const issuerRes = await client.query('SELECT agency_id FROM users WHERE id = $1', [issuerId]);
            const agencyId = issuerRes.rows[0]?.agency_id;

            // Determine the role to assign (use provided role or default to 'viewer')
            const guestRole = role || 'viewer';

            const insertRes = await client.query(
                `INSERT INTO users (email, password_hash, nom, user_type, role, telephone, statut, access_key, access_key_expires_at, is_guest, agency_id) 
                 VALUES ($1, $2, TRIM($3 || ' ' || $4), 'guest', $5, $6, 'actif', $7, $8, true, $9) 
                 RETURNING id`,
                [dummyEmail, dummyHash, nom, prenom || '', guestRole, telephone, accessKey, expiresAt, agencyId]
            );
            const guestId = insertRes.rows[0].id;

            // 4. Get the issuer's first owner assignment (for FK compliance)
            // owner_user.owner_id references owners.id, NOT users.id
            const issuerAssignmentRes = await client.query(
                `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = true LIMIT 1`,
                [issuerId]
            );

            if (issuerAssignmentRes.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ 
                    message: 'Aucun propriétaire assigné. Vous devez être assigné à un propriétaire pour créer un accès invité.' 
                });
            }

            const targetOwnerId = issuerAssignmentRes.rows[0].owner_id;

            // 5. Determine permissions
            // If a role is provided, look up permissions from permission_matrix
            // Otherwise, use provided permissions or defaults
            let userPermissions = permissions || null;

            if (role && !permissions) {
                // Look up default permissions for this role from permission_matrix
                const permMatrixRes = await client.query(
                    `SELECT module, can_read, can_write, can_delete, can_validate 
                     FROM permission_matrix 
                     WHERE role = $1`,
                    [role]
                );

                // If no permission matrix found for this role, reject the request
                if (permMatrixRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({ 
                        message: `Aucune permission définie pour le rôle "${role}" dans la matrice de permissions. Veuillez configurer ce rôle dans l'onglet Permissions.` 
                    });
                }

                // Convert matrix rows to our permission flags
                // Initialize all to false - permissions must be explicitly granted via DB
                userPermissions = {
                    can_view_finances: false,
                    can_edit_properties: false,
                    can_manage_tenants: false,
                    can_manage_contracts: false,
                    can_validate_payments: false,
                    can_manage_users: false,
                    can_delete_data: false
                };

                // Map permission_matrix modules to owner_user columns
                for (const row of permMatrixRes.rows) {
                    const module = row.module.toLowerCase();
                    
                    // Finance module
                    if (module === 'finance') {
                        if (row.can_read) userPermissions.can_view_finances = true;
                        if (row.can_validate) userPermissions.can_validate_payments = true;
                    }
                    
                    // Biens (Properties) module
                    if (module === 'biens') {
                        if (row.can_write) userPermissions.can_edit_properties = true;
                    }
                    
                    // Locataires (Tenants) module
                    if (module === 'locataires') {
                        if (row.can_write) userPermissions.can_manage_tenants = true;
                    }
                    
                    // Owners/Contracts module
                    if (module === 'owners' || module === 'contrats') {
                        if (row.can_write) userPermissions.can_manage_contracts = true;
                    }
                    
                    // Users module
                    if (module === 'users') {
                        if (row.can_write) userPermissions.can_manage_users = true;
                    }
                    
                    // Delete permission: granted if ANY module has can_delete
                    if (row.can_delete) {
                        userPermissions.can_delete_data = true;
                    }
                }
            }

            // If still no permissions (neither role nor permissions provided), reject
            if (!userPermissions) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({ 
                    message: 'Vous devez spécifier soit un rôle, soit des permissions explicites pour créer un accès invité.' 
                });
            }

            // 6. Assign permissions (Delegation)
            // The guest is assigned to the same owner as the issuer
            await client.query(`
                INSERT INTO owner_user (
                    user_id, owner_id, role, is_active, start_date,
                    can_view_finances, can_edit_properties, can_manage_tenants,
                    can_manage_contracts, can_validate_payments, can_manage_users,
                    can_delete_data
                )
                VALUES ($1, $2, $3, true, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10)
            `, [
                guestId, targetOwnerId, guestRole,
                userPermissions.can_view_finances,
                userPermissions.can_edit_properties,
                userPermissions.can_manage_tenants,
                userPermissions.can_manage_contracts,
                userPermissions.can_validate_payments,
                userPermissions.can_manage_users,
                userPermissions.can_delete_data
            ]);

            await client.query('COMMIT');

            // 7. Log
            await AuditService.log({
                userId: issuerId.toString(),
                action: 'CREATE_GUEST',
                entityType: 'USER',
                entityId: guestId.toString(),
                details: { accessKey, expiresAt, agencyId, role: guestRole },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });

            res.status(201).json({
                message: 'Accès invité créé',
                accessKey,
                expiresAt,
                guestId,
                role: guestRole
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erreur création invité:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});


// 9. Endpoint LOGIN WITH KEY (POST) - SHARED CONTEXT
router.post('/login-with-key', async (req, res) => {
    const { accessKey } = req.body;

    try {
        if (!accessKey) return res.status(400).json({ message: 'Clé d\'accès requise.' });

        // 1. Find the guest user by access key
        const userResult = await pool.query(
            `SELECT id, nom, role, access_key_expires_at, is_guest, statut 
             FROM users 
             WHERE access_key = $1`,
            [accessKey]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Clé d\'accès invalide.' });
        }

        const guestUser = userResult.rows[0];

        // Check if expired
        if (new Date() > new Date(guestUser.access_key_expires_at)) {
             return res.status(401).json({ message: 'Cette clé d\'accès a expiré.' });
        }

        if (guestUser.statut !== 'actif') {
            return res.status(401).json({ message: 'Compte désactivé.' });
        }

        // 2. Get the issuer (owner) assignment and permissions
        const assignmentResult = await pool.query(
            `SELECT ou.owner_id, ou.can_view_finances, ou.can_edit_properties, 
                    ou.can_manage_tenants, ou.can_manage_contracts, 
                    ou.can_validate_payments, ou.can_manage_users, ou.can_delete_data,
                    u.nom as issuer_name, u.role as issuer_role
             FROM owner_user ou
             JOIN users u ON u.id = ou.owner_id
             WHERE ou.user_id = $1 AND ou.is_active = true
             LIMIT 1`,
            [guestUser.id]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(401).json({ message: 'Aucune délégation active pour cet accès.' });
        }

        const assignment = assignmentResult.rows[0];
        const permissions = {
            can_view_finances: assignment.can_view_finances,
            can_edit_properties: assignment.can_edit_properties,
            can_manage_tenants: assignment.can_manage_tenants,
            can_manage_contracts: assignment.can_manage_contracts,
            can_validate_payments: assignment.can_validate_payments,
            can_manage_users: assignment.can_manage_users,
            can_delete_data: assignment.can_delete_data
        };

        // 3. Generate Token with issuerId and permissions
        const token = jwt.sign(
            { 
                id: guestUser.id, 
                issuerId: assignment.owner_id,  // CRITICAL: The account context
                role: 'guest', 
                isGuest: true,
                permissions 
            }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 4. Log
        await AuditService.log({
            userId: guestUser.id.toString(),
            action: 'LOGIN_KEY',
            entityType: 'USER',
            entityId: guestUser.id.toString(),
            details: { isGuest: true, issuerId: assignment.owner_id, issuerName: assignment.issuer_name },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        // 5. Return token with all context info
        res.json({
            token,
            userId: guestUser.id,
            issuerId: assignment.owner_id,
            issuerName: assignment.issuer_name,
            role: 'guest',
            isGuest: true,
            permissions,
            expiresAt: guestUser.access_key_expires_at
        });

    } catch (error) {
        console.error('Erreur login clé:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;