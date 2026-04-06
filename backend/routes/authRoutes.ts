// backend/routes/authRoutes.ts

import { Router, Request, Response } from 'express';
import { protect } from '../middleware/authMiddleware';
import { Pool } from 'pg'; 

// Outils de sécurité
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 
import crypto from 'crypto';

import { AuditService } from '../services/AuditService';
import EmailService from '../services/EmailService';
import { validatePassword } from '../utils/passwordUtils';


// Re-trigger compilation for new EmailService method

const router = Router();

// Pour que les routes aient accès à la DB (Méthode simple pour le MVP)
import pool from '../db/database';
import { JWT_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from '../config/config';

// Durée du refresh token en ms (pour l'expiration en DB)
const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Génère un access token + refresh token pour un utilisateur.
 * Stocke le refresh token (hashé) en base de données.
 */
async function issueTokenPair(userId: number, role: string, userType: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
        { id: userId, role, userType },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as any
    );

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const tokenHash  = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt  = new Date(Date.now() + REFRESH_TOKEN_MS);

    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );

    return { accessToken, refreshToken: rawRefresh };
}

const SALT_ROUNDS = 10; // Niveau de complexité pour bcrypt

// 1. Endpoint d'INSCRIPTION
router.post('/register', async (req, res) => {
    const { email, password, prenoms, nom, telephone, userType, nomAgence, invitationCode } = req.body;

    try {
        // Validation des champs requis
        if (!email || !password || !nom || !prenoms || !telephone) {
            return res.status(400).json({ 
                message: 'Tous les champs sont requis : email, mot de passe, nom, prénoms et téléphone.' 
            });
        }

        // 🔒 SECURITY: Sanitize email input
        const sanitizedEmail = email.trim().toLowerCase();

        // Vérification de la validité de l'email
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return res.status(400).json({ 
                message: 'Veuillez fournir une adresse email valide.' 
            });
        }

        // 🔒 SECURITY: Enhanced password validation
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                message: passwordValidation.message
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
        
        // Génération de l'OTP (6 chiffres)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Insertion dans la base de données
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, nom, user_type, role, telephone, is_verified, verification_otp, otp_expires_at) 
             VALUES ($1, $2, TRIM($3 || ' ' || $4), $5, $5, $6, false, $7, $8) RETURNING id`,
            [sanitizedEmail, password_hash, nom, prenoms, userType || 'gestionnaire', finalPhone, otp, otpExpiresAt]
        );

        // Envoyer l'email avec le code OTP
        try {
            await EmailService.sendEmail(
                sanitizedEmail,
                'Vérification de votre compte - Hope Gestion',
                `Bonjour ${prenoms},\n\nMerci de vous être inscrit sur Hope Gestion.\nVotre code de vérification est : ${otp}\nIl est valide pendant 15 minutes.\n\nL'équipe Hope Gestion.`,
                `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Code de vérification</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; text-align: center;">
                        <p style="font-size: 16px; color: #333;">Bonjour <strong>${prenoms}</strong>,</p>
                        <p style="font-size: 16px; color: #333;">Merci de vous être inscrit. Utilisez le code ci-dessous pour vérifier votre compte :</p>
                        <div style="margin: 30px 0; padding: 15px; background-color: white; border-radius: 8px; border: 2px dashed #3498db; display: inline-block;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otp}</span>
                        </div>
                        <p style="font-size: 14px; margin-top: 20px; color: #666;">Ce code expire dans 15 minutes.</p>
                    </div>
                </div>
                `
            );
        } catch (emailErr) {
            console.error('[Auth] Failed to send verification email:', emailErr);
            // On ne bloque pas l'inscription si l'email échoue (pour que l'utilisateur puisse demander un renvoi)
        }

        // Log successful registration
        await AuditService.log({
            userId: result.rows[0].id.toString(),
            action: 'REGISTER',
            entityType: 'USER',
            entityId: result.rows[0].id.toString(),
            details: { email: sanitizedEmail, userType: userType || 'gestionnaire' },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        // Handle Invitation Code (Link to existing tenant OR Manager Org)
        if (invitationCode) {
            try {
                // 1. Try to find INDIVIDUAL tenant invitation
                const tenantRes = await pool.query(
                    `SELECT id FROM tenants WHERE invitation_code = $1 AND user_id IS NULL`,
                    [invitationCode]
                );

                if (tenantRes.rows.length > 0) {
                    const tenantId = tenantRes.rows[0].id;
                    const userId = result.rows[0].id;

                    // Update tenant with User info (Synchronization as requested)
                    await pool.query(
                        `UPDATE tenants SET 
                            user_id = $1,
                            nom = $2, 
                            email = $3, 
                            telephone_principal = $4,
                            prenoms = $5
                         WHERE id = $6`,
                        [userId, nom, sanitizedEmail, finalPhone, prenoms, tenantId]
                    );

                    // Force role to 'locataire'
                    await pool.query(
                        `UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`,
                        [userId]
                    );

                    console.log(`[Auth] User ${userId} linked to Tenant ${tenantId} via INDIVIDUAL code.`);
                } else {
                    // 2. Try to find MANAGER/AGENCY code
                    const ownerRes = await pool.query(
                        `SELECT id FROM owners WHERE manager_code = $1`,
                        [invitationCode]
                    );

                    if (ownerRes.rows.length > 0) {
                        const ownerId = ownerRes.rows[0].id;
                        const userId = result.rows[0].id;
                        
                        // Create NEW Tenant for this owner
                        const newTenantCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                        
                        // Note: tenants table requires nom, prenoms, telephone_principal
                        const newTenant = await pool.query(
                            `INSERT INTO tenants (
                                owner_id, nom, prenoms, email, telephone_principal, 
                                statut, type, invitation_code, user_id
                            ) VALUES ($1, $2, $3, $4, $5, 'Nouveau', 'Locataire', $6, $7)
                            RETURNING id`,
                            [
                                ownerId, nom, prenoms, sanitizedEmail, finalPhone,
                                newTenantCode, userId
                            ]
                        );
                        
                        // Force role to 'locataire'
                        await pool.query(
                            `UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`,
                            [userId]
                        );

                        console.log(`[Auth] User ${userId} created as new Tenant ${newTenant.rows[0].id} via MANAGER code ${ownerId}.`);
                    } else {
                        console.warn(`[Auth] Invalid invitation code: ${invitationCode} for user ${result.rows[0].id}`);
                    }
                }
            } catch (linkErr) {
                console.error('[Auth] Error processing invitation code:', linkErr);
                // Non-blocking error
            }
        }

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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
 *     description: Authentifie un utilisateur et retourne un access token (15 min) + refresh token (7 jours).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Email ou mot de passe incorrect
 *       429:
 *         description: Trop de tentatives — rate limit atteint
 */
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

        // 🔒 SECURITY: Sanitize inputs
        const sanitizedEmail = email.trim().toLowerCase();

        // Vérification de la validité de l'email
        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(sanitizedEmail)) {
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
            'SELECT id, password_hash, role, user_type, statut, is_verified FROM users WHERE email = $1',
            [sanitizedEmail]
        );

        if (result.rows.length === 0) {
            // 🔒 SECURITY: Generic error to prevent user enumeration
            console.warn(`🚨 SECURITY: Login attempt for non-existent email: ${sanitizedEmail} from IP: ${req.ip}`);
            return res.status(401).json({ 
                message: 'Email ou mot de passe incorrect.' 
            });
        }

        const utilisateur = result.rows[0];
        
        // Vérifier si le compte est actif
        if (utilisateur.statut === 'inactif' || utilisateur.statut === 'suspendu') {
            return res.status(401).json({ 
                message: 'Votre compte est inactif ou suspendu. Veuillez contacter l\'administrateur.' 
            });
        }

        // Vérifier si l'email est validé
        if (utilisateur.is_verified === false) {
             return res.status(403).json({ 
                isVerified: false, 
                message: 'Veuillez vérifier votre adresse email avec le code que nous vous avons envoyé.' 
            });
        }

        // 2. Comparer le mot de passe fourni avec le hash
        const passwordMatch = await bcrypt.compare(password, utilisateur.password_hash);

        // 🔒 SECURITY: Log failed login attempts
        if (!passwordMatch) {
            await AuditService.log({
                userId: utilisateur.id.toString(),
                action: 'FAILED_LOGIN',
                entityType: 'USER',
                entityId: utilisateur.id.toString(),
                details: { email, reason: 'Invalid password' },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });

            console.warn(`🚨 SECURITY: Failed login attempt for ${email} from IP: ${req.ip}`);
            
            // Generic error message to prevent user enumeration
            return res.status(401).json({ 
                message: 'Email ou mot de passe incorrect.' 
            });
        }

        // 3. Generate access token + refresh token
        const { accessToken, refreshToken } = await issueTokenPair(
            utilisateur.id,
            utilisateur.role,
            utilisateur.user_type || 'gestionnaire'
        );

        // 🔒 SECURITY: Log successful login
        await AuditService.log({
            userId: utilisateur.id.toString(),
            action: 'LOGIN',
            entityType: 'USER',
            entityId: utilisateur.id.toString(),
            details: { email },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        console.log(`✅ Successful login for ${email} from IP: ${req.ip}`);

        res.json({
            message: 'Connexion réussie.',
            token: accessToken,
            refreshToken,
            role: utilisateur.role,
            userId: utilisateur.id
        });

    } catch (error: any) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ 
            message: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        });
    }
});

// 2a. Endpoint de VERIFICATION EMAIL (POST)
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;
    try {
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email et code de vérification requis.' });
        }

        const sanitizedEmail = email.trim().toLowerCase();
        const result = await pool.query(
            'SELECT id, verification_otp, otp_expires_at, is_verified, role, user_type FROM users WHERE email = $1',
            [sanitizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return res.status(400).json({ message: 'Cet email est déjà vérifié.' });
        }

        if (user.verification_otp !== otp.trim()) {
             return res.status(400).json({ message: 'Code de vérification incorrect.' });
        }

        if (new Date(user.otp_expires_at) < new Date()) {
             return res.status(400).json({ message: 'Ce code a expiré. Veuillez en demander un nouveau.' });
        }

        // Marquer comme vérifié et nettoyer les champs OTP
        await pool.query(
            'UPDATE users SET is_verified = true, verification_otp = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        // Connexion automatique après vérification
        const { accessToken, refreshToken } = await issueTokenPair(
            user.id,
            user.role,
            user.user_type || 'gestionnaire'
        );

        res.status(200).json({
            message: 'Email vérifié avec succès.',
            token: accessToken,
            refreshToken,
            role: user.role,
            userId: user.id
        });

    } catch (error) {
        console.error('Erreur verify-email:', error);
        res.status(500).json({ message: 'Erreur interne lors de la vérification.' });
    }
});

// 2b. Endpoint RESEND OTP (POST)
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        if (!email) {
            return res.status(400).json({ message: 'L\'email est requis pour renvoyer le code.' });
        }
        
        const sanitizedEmail = email.trim().toLowerCase();
        const result = await pool.query('SELECT id, nom, is_verified FROM users WHERE email = $1', [sanitizedEmail]);

        if (result.rows.length === 0) {
            // Pour des raisons de sécurité, on ne dit pas si l'email existe ou pas
            return res.status(200).json({ message: 'Si l\'email existe, un nouveau code a été envoyé.' });
        }

        const user = result.rows[0];
        if (user.is_verified) {
             return res.status(400).json({ message: 'Cet email est déjà vérifié. Connectez-vous.' });
        }

        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await pool.query(
            'UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3',
            [newOtp, newExpiresAt, user.id]
        );

        // Envoyer l'email
        await EmailService.sendEmail(
            sanitizedEmail,
            'Nouveau code de vérification - Hope Gestion',
            `Bonjour ${user.nom},\n\nVotre nouveau code de vérification est : ${newOtp}\n\nL'équipe Hope Gestion.`,
            `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Nouveau Code de vérification</h1>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <p style="font-size: 16px;">Voici votre nouveau code :</p>
                    <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px; border: 2px dashed #e67e22; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #e67e22;">${newOtp}</span>
                    </div>
                    <p style="font-size: 14px; margin-top: 20px; color: #666;">Ce code expire dans 15 minutes.</p>
                </div>
            </div>
            `
        );

        res.status(200).json({ message: 'Un nouveau code a été envoyé.' });

    } catch (error) {
        console.error('Erreur resend-otp:', error);
        res.status(500).json({ message: 'Erreur lors du renvoi de l\'email.' });
    }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renouveler l'access token
 *     description: Échange un refresh token valide contre un nouvel access token. Le refresh token est tourné (l'ancien est révoqué).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token reçu lors du login
 *     responses:
 *       200:
 *         description: Nouveau token émis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:        { type: string }
 *                 refreshToken: { type: string }
 *       401:
 *         description: Refresh token invalide ou expiré
 */
// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Échange un refresh token valide contre un nouvel access token (+ rotation du refresh token).
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token manquant.' });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const result = await pool.query(
            `SELECT rt.*, u.role, u.user_type
             FROM refresh_tokens rt
             JOIN users u ON rt.user_id = u.id
             WHERE rt.token_hash = $1
               AND rt.revoked_at IS NULL
               AND rt.expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Refresh token invalide ou expiré.' });
        }

        const stored = result.rows[0];

        // Révoquer l'ancien refresh token (rotation)
        await pool.query(
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [stored.id]
        );

        // Émettre une nouvelle paire de tokens
        const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
            stored.user_id,
            stored.role,
            stored.user_type || 'gestionnaire'
        );

        res.json({ token: accessToken, refreshToken: newRefreshToken });

    } catch (error) {
        console.error('Erreur refresh token:', error);
        res.status(500).json({ message: 'Erreur serveur lors du rafraîchissement.' });
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Déconnexion
 *     description: Révoque le refresh token en base. L'access token reste valide jusqu'à expiration (15 min max).
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 */
// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Révoque le refresh token en base (invalide la session côté serveur).
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        try {
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            await pool.query(
                `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
                [tokenHash]
            );
        } catch (err) {
            console.error('Erreur révocation refresh token:', err);
        }
    }

    // Réponse toujours 200 : même si le token était inconnu, la déconnexion est réussie côté client
    res.json({ message: 'Déconnexion réussie.' });
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
            `SELECT 
                id, nom, user_type, role, email, telephone,
                COALESCE(photo_url, NULL) as photo_url,
                COALESCE(preferences, '{}') as preferences,
                COALESCE(is_guest, FALSE) as is_guest
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = result.rows[0];
        
        // Séparation nom/prénom (with null safety)
        const nameParts = (user.nom || '').split(' ');
        const lastName = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || '';

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
                photo_url: user.photo_url || null,
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

/**
 * GET /test-email
 * Route temporaire de diagnostic email pour la production
 */
router.get('/test-email', async (req: Request, res: Response) => {
    const config = {
        EMAIL_HOST: process.env.EMAIL_HOST || '(non défini)',
        EMAIL_PORT: process.env.EMAIL_PORT || '(non défini)',
        EMAIL_USER: process.env.EMAIL_USER || '(non défini)',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '***configuré***' : '(non défini)',
        EMAIL_FROM: process.env.EMAIL_FROM || '(non défini)',
    };
    
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
        
        // Vérifier la connexion SMTP d'abord
        await transporter.verify();
        
        // Si verify passe, envoyer un vrai email
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
            to: process.env.EMAIL_USER,
            subject: 'Test SMTP Hope Gestion',
            text: 'Ceci est un test. Si vous lisez ceci, le SMTP fonctionne !',
        });
        
        res.json({ success: true, message: 'Email envoyé avec succès !', config });
    } catch (error: any) {
        res.status(500).json({ 
            success: false, 
            message: 'Erreur SMTP', 
            error: error.message,
            code: error.code,
            config 
        });
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

        // Générer un email placeholder si non fourni (la colonne email est NOT NULL)
        const userEmail = email || `invite_${telephone.replace(/[^0-9]/g, '')}@hopegestion.local`;

        // 1. Créer le compte utilisateur en statut "invited"
        // On met un hash impossible pour le password temporairement.
        const tempHash = '$2b$10$INVALIDHASHForInvitedUserOnlyXXXXXXXXXXXXXXXXXXXXX'; 
        
        // Check duplicate
        const check = await pool.query('SELECT id FROM users WHERE email = $1 OR telephone = $2', [userEmail, telephone]);
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
                [userEmail, tempHash, nom, prenom || '', role, telephone, access_scope || 'assigned', issuerId]
            );
            const userId = insertRes.rows[0].id;

            // 2. Générer Token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 48 * 3600 * 1000); // 48h

            // 3. Stocker Invitation
            await client.query(
                `INSERT INTO user_invitations (token, email, role, issuer_id, permissions, expires_at, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [token, userEmail, role, issuerId, JSON.stringify({}), expiresAt, userId]
            );

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
        console.error('Erreur invitation:', error.message, error.stack);
        res.status(500).json({ message: `Erreur serveur: ${error.message}` });
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
        // Retrieve userId from user_id column (primary) or permissions json (legacy fallback)
        const targetUserId = invite.user_id || invite.permissions?.userId;

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
        if (!telephone) return res.status(400).json({ message: 'Le numéro de téléphone est requis.' });

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

            // Check for duplicate telephone or dummy email (unlikely for email but safe)
            const duplicateCheck = await client.query(
                'SELECT id FROM users WHERE telephone = $1 OR email = $2',
                [telephone, dummyEmail]
            );

            if (duplicateCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({ 
                    message: `Un utilisateur existe déjà avec ce numéro de téléphone (${telephone}). Chaque accès invité doit avoir un numéro unique.` 
                });
            }

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

        } catch (err: any) {
            await client.query('ROLLBACK');
            console.error('ERROR in /create-guest:', err);
            res.status(500).json({ 
                message: 'Erreur serveur lors de la création de l\'accès invité.',
                error: err.message, // Temporairement pour débugger
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error('OUTER ERROR in /create-guest:', err);
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

// ========================================
// 🔐 PASSWORD RESET ENDPOINTS
// ========================================

/**
 * POST /api/auth/forgot-password
 * Generate password reset token and send email
 * 🔒 SECURITY: Anti-enumeration - Always returns success even if email doesn't exist
 */
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Validate input
        if (!email) {
            return res.status(400).json({ message: 'Email requis.' });
        }

        // 🔒 SECURITY: Sanitize email
        const sanitizedEmail = email.trim().toLowerCase();

        const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
        if (!emailRegex.test(sanitizedEmail)) {
            return res.status(400).json({ message: 'Email invalide.' });
        }

        // 2. Find user (silent if not found - anti-enumeration)
        const userResult = await pool.query(
            'SELECT id, nom, email FROM users WHERE email = $1',
            [sanitizedEmail]
        );

        // 🔒 SECURITY: Always respond with success to prevent user enumeration
        // If no user found, we still return 200 but don't send email
        if (userResult.rows.length === 0) {
            console.warn(`⚠️  Password reset requested for non-existent email: ${sanitizedEmail} from IP: ${req.ip}`);
            
            // Fake delay to prevent timing attacks (simulate email sending)
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            
            return res.status(200).json({ 
                message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' 
            });
        }

        const user = userResult.rows[0];

        // 3. Invalidate any existing tokens for this user
        await pool.query(
            'DELETE FROM password_reset_tokens WHERE user_id = $1',
            [user.id]
        );

        // 4. Generate secure random token (32 bytes = 64 hex chars)
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // 5. Hash the token for database storage (SHA-256)
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        // 6. Set expiration (15 minutes from now)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // 7. Store hashed token in database
        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, tokenHash, expiresAt, req.ip || 'unknown', req.headers['user-agent'] || 'unknown']
        );

        // 8. Send email with plain token (only in email, never stored)
        const emailSent = await EmailService.sendPasswordResetEmail(
            user.email,
            resetToken,
            user.nom,
            req.ip || 'unknown'
        );

        if (!emailSent) {
            console.error(`❌ Failed to send password reset email to ${user.email}`);
            // Still return success to prevent enumeration
        }

        // 9. Audit log
        await AuditService.log({
            userId: user.id.toString(),
            action: 'PASSWORD_RESET_REQUESTED',
            entityType: 'USER',
            entityId: user.id.toString(),
            details: { email: user.email },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        console.log(`✅ Password reset token generated for ${user.email} from IP: ${req.ip}`);

        res.status(200).json({ 
            message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' 
        });

    } catch (error) {
        console.error('❌ Error in forgot-password:', error);
        res.status(500).json({ 
            message: 'Une erreur est survenue. Veuillez réessayer ultérieurement.' 
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using valid token
 */
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // 1. Validate inputs
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token et nouveau mot de passe requis.' });
        }

        // 2. Validate token format (64 hex chars)
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({ message: 'Token invalide.' });
        }

        // 3. Validate new password policy (same as registration)
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ 
                message: passwordValidation.message
            });
        }

        // 4. Hash the received token to compare with DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 5. Find valid token (not expired, not used)
        const tokenResult = await pool.query(
            `SELECT user_id, expires_at, used_at 
             FROM password_reset_tokens 
             WHERE token_hash = $1`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            console.warn(`⚠️  Invalid reset token attempted from IP: ${req.ip}`);
            return res.status(400).json({ message: 'Token invalide ou expiré.' });
        }

        const resetRecord = tokenResult.rows[0];

        // 6. Check if already used
        if (resetRecord.used_at) {
            console.warn(`⚠️  Attempted reuse of password reset token from IP: ${req.ip}`);
            return res.status(400).json({ message: 'Ce token a déjà été utilisé.' });
        }

        // 7. Check if expired
        if (new Date() > new Date(resetRecord.expires_at)) {
            console.warn(`⚠️  Expired password reset token used from IP: ${req.ip}`);
            return res.status(400).json({ message: 'Ce token a expiré. Veuillez faire une nouvelle demande.' });
        }

        // 8. Get user details
        const userResult = await pool.query(
            'SELECT id, email, nom FROM users WHERE id = $1',
            [resetRecord.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        const user = userResult.rows[0];

        // 9. Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // 10. Update user password
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, user.id]
        );

        // 11. Mark token as used
        await pool.query(
            'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
            [tokenHash]
        );

        // 12. Send confirmation email
        await EmailService.sendPasswordResetConfirmation(
            user.email,
            user.nom,
            req.ip || 'unknown'
        );

        // 13. Audit log
        await AuditService.log({
            userId: user.id.toString(),
            action: 'PASSWORD_RESET_COMPLETED',
            entityType: 'USER',
            entityId: user.id.toString(),
            details: { email: user.email },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        console.log(`✅ Password successfully reset for user ${user.email} from IP: ${req.ip}`);

        res.status(200).json({ 
            message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.' 
        });

    } catch (error) {
        console.error('❌ Error in reset-password:', error);
        res.status(500).json({ 
            message: 'Une erreur est survenue lors de la réinitialisation. Veuillez réessayer.' 
        });
    }
});

/**
 * GET /api/auth/validate-reset-token/:token
 * Validate if a reset token is valid (optional helper for frontend)
 */
router.get('/validate-reset-token/:token', async (req, res) => {
    const { token } = req.params;

    try {
        // Validate token format
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({ valid: false, message: 'Token invalide.' });
        }

        // Hash token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Check if exists and valid
        const result = await pool.query(
            `SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(200).json({ valid: false, message: 'Token invalide.' });
        }

        const tokenData = result.rows[0];

        if (tokenData.used_at) {
            return res.status(200).json({ valid: false, message: 'Token déjà utilisé.' });
        }

        if (new Date() > new Date(tokenData.expires_at)) {
            return res.status(200).json({ valid: false, message: 'Token expiré.' });
        }

        res.status(200).json({ valid: true, message: 'Token valide.' });

    } catch (error) {
        console.error('❌ Error validating token:', error);
        res.status(500).json({ valid: false, message: 'Erreur de validation.' });
    }
});

// 8. Endpoint de liaison manuelle (post-inscription)
// 8. Endpoint de liaison manuelle (post-inscription)
router.post('/link-tenant', protect, async (req: any, res) => {
    const { invitationCode } = req.body;
    const userId = req.userId;

    if (!invitationCode) {
        return res.status(400).json({ message: 'Code invitation requis.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 0. CHECK IF USER ALREADY LINKED
        // Multi-tenant support: We DO NOT unlink previous tenants anymore.
        // We just log it for info.
        const existingLinkRes = await client.query(
            `SELECT id FROM tenants WHERE user_id = $1`,
            [userId]
        );

        if (existingLinkRes.rows.length > 0) {
            console.log(`[Auth] User ${userId} is already linked to tenant(s) ${existingLinkRes.rows.map(r => r.id).join(', ')}. Adding new link...`);
        }

        // 1. Try individual invitation code first (LOC-XXXXXX)
        const tenantRes = await client.query(
            `SELECT id FROM tenants WHERE invitation_code = $1 AND user_id IS NULL`,
            [invitationCode.toUpperCase()]
        );

        if (tenantRes.rows.length > 0) {
            const tenantId = tenantRes.rows[0].id;

            // Get user info for synchronization
            const userRes = await client.query(
                `SELECT nom, email, telephone FROM users WHERE id = $1`,
                [userId]
            );

            // Link tenant to user
            await client.query(
                `UPDATE tenants SET user_id = $1 WHERE id = $2`,
                [userId, tenantId]
            );

            // Sync user data to tenant
            if (userRes.rows.length > 0) {
                const u = userRes.rows[0];
                await client.query(
                    `UPDATE tenants SET 
                        nom = COALESCE($1, nom), 
                        email = COALESCE($2, email), 
                        telephone_principal = COALESCE($3, telephone_principal)
                     WHERE id = $4`,
                    [u.nom, u.email, u.telephone, tenantId]
                );
            }

            // Update user role
            await client.query(
                `UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`,
                [userId]
            );

            await client.query('COMMIT');
            return res.json({ message: 'Dossier locataire lié avec succès.', tenantId });
        }

        // 2. Try manager code (AG-XXXXXX)
        const ownerRes = await client.query(
            `SELECT id, email, name FROM owners WHERE manager_code = $1`,
            [invitationCode.toUpperCase()]
        );

        if (ownerRes.rows.length > 0) {
            const owner = ownerRes.rows[0];
            const ownerId = owner.id;

            // CHECK DOUBLE LINK (Prevent linking to same owner twice)
            const doubleLinkRes = await client.query(
                `SELECT id FROM tenants WHERE user_id = $1 AND owner_id = $2`,
                [userId, ownerId]
            );

            if (doubleLinkRes.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Vous êtes déjà lié à ce gestionnaire.' });
            }

            // Get user info
            const userRes = await client.query(
                `SELECT nom, email, telephone FROM users WHERE id = $1`,
                [userId]
            );
            const u = userRes.rows[0] || {};

            // Generate unique invitation code for the new tenant
            const codeRes = await client.query(
                `SELECT 'LOC-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6) AS code`
            );
            const newCode = codeRes.rows[0].code.toUpperCase();

            const nameParts = (u.nom || 'Locataire').split(' ');
            const lastName = nameParts[0] || 'Locataire';
            const firstName = nameParts.slice(1).join(' ') || lastName;

            // Create new tenant linked to this owner and user
            const newTenant = await client.query(
                `INSERT INTO tenants (nom, prenoms, email, telephone_principal, owner_id, user_id, invitation_code, statut, type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'En attente', 'Locataire')
                 RETURNING id`,
                [lastName, firstName, u.email || '', u.telephone || '', ownerId, userId, newCode]
            );

            const tenantId = newTenant.rows[0]?.id;
            if (!tenantId) {
                await client.query('ROLLBACK');
                return res.status(500).json({ message: 'Erreur lors de la création du dossier locataire.' });
            }

            // Update user role
            await client.query(
                `UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`,
                [userId]
            );

            // NOTIFY ALL USERS linked to this owner (propriétaires ET gestionnaires)
            const linkedUsersRes = await client.query(
                `SELECT ou.user_id FROM owner_user ou
                 WHERE ou.owner_id = $1 AND ou.is_active = TRUE`,
                [ownerId]
            );

            if (linkedUsersRes.rows.length > 0) {
                const notifTitle = "Nouvelle demande de liaison";
                const notifMessage = `Le locataire ${u.nom || 'Inconnu'} souhaite rejoindre votre agence via le code gestionnaire.`;

                for (const row of linkedUsersRes.rows) {
                    await client.query(
                        `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
                         VALUES ($1, 'info', $2, $3, '/dashboard/locataires?tab=requests', false, NOW())`,
                        [row.user_id, notifTitle, notifMessage]
                    );
                }
                console.log(`[Auth] Notified ${linkedUsersRes.rows.length} user(s) for owner_id=${ownerId}`);
            } else {
                console.warn(`[Auth] No linked users found for owner_id=${ownerId} — notification not sent`);
            }

            await client.query('COMMIT');
            console.log(`[Auth] New tenant request via manager code: tenant_id=${tenantId}, owner_id=${ownerId}, user_id=${userId}`);
            return res.json({ message: 'Demande envoyée. En attente de validation par le gestionnaire.', tenantId });
        }

        // 3. No match found
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Code invalide ou déjà utilisé.' });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Error linking tenant:', error);
        const detail = error?.message || 'Erreur inconnue';
        const sqlDetail = error?.column ? `Colonne: ${error.column}` : '';
        const sqlTable = error?.table ? `Table: ${error.table}` : '';
        const sqlConstraint = error?.constraint ? `Contrainte: ${error.constraint}` : '';
        const fullDetail = [detail, sqlDetail, sqlTable, sqlConstraint].filter(Boolean).join(' | ');
        res.status(500).json({ 
            message: 'Erreur lors de la liaison.', 
            detail: fullDetail,
            errorCode: error?.code || null
        });
    } finally {
        client.release();
    }
});


// Récupérer les codes gestionnaire (pour le dashboard gestionnaire)
// Retourne tous les owners gérés avec leurs codes respectifs
router.post('/manager-code', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        console.log(`[manager-code] START user_id=${userId} email=${userEmail}`);

        // Étape 0 : S'assurer que la colonne manager_code existe et est NULLABLE (auto-migration)
        try {
            await pool.query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS manager_code VARCHAR(20)`);
            await pool.query(`ALTER TABLE owners ALTER COLUMN manager_code DROP NOT NULL`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_owners_manager_code ON owners(manager_code)`);
        } catch (e) {
            // Ignore si la colonne/index existe déjà
        }

        // Étape 1 : Générer des codes pour tous les owners qui n'en ont pas
        const genResult = await pool.query(`
            UPDATE owners SET manager_code = 'AG-' || UPPER(SUBSTRING(MD5(id::text || COALESCE(name,'') || RANDOM()::text), 1, 6))
            WHERE manager_code IS NULL OR manager_code = ''
            RETURNING id, manager_code
        `);
        if (genResult.rows.length > 0) {
            console.log(`[manager-code] Auto-generated codes for ${genResult.rows.length} owners:`, 
                genResult.rows.map((r: any) => `${r.id}→${r.manager_code}`).join(', '));
        }

        // Étape 2 : Chercher les owners liés à cet utilisateur
        // Stratégie A : Via owner_user
        let result = await pool.query(
            `SELECT o.id as owner_id, o.name as owner_name, o.manager_code
             FROM owners o
             JOIN owner_user ou ON o.id = ou.owner_id
             WHERE ou.user_id = $1 AND ou.is_active = TRUE
               AND o.manager_code IS NOT NULL AND o.manager_code != ''
             ORDER BY o.name ASC`,
            [userId]
        );
        console.log(`[manager-code] Stratégie A (owner_user): ${result.rows.length} résultats`);

        // Stratégie B : Par email (case-insensitive)
        if (result.rows.length === 0 && userEmail) {
            result = await pool.query(
                `SELECT id as owner_id, name as owner_name, manager_code
                 FROM owners
                 WHERE LOWER(email) = LOWER($1)
                   AND manager_code IS NOT NULL AND manager_code != ''
                 ORDER BY name ASC`,
                [userEmail]
            );
            console.log(`[manager-code] Stratégie B (email): ${result.rows.length} résultats`);

            // Si trouvé par email mais pas dans owner_user, créer le lien owner_user
            if (result.rows.length > 0) {
                const ownerId = result.rows[0].owner_id;
                try {
                    await pool.query(`
                        INSERT INTO owner_user (owner_id, user_id, role, is_active, start_date,
                            can_view_finances, can_manage_tenants, can_manage_properties, can_manage_leases, can_manage_documents)
                        VALUES ($1, $2, 'owner', TRUE, CURRENT_DATE, TRUE, TRUE, TRUE, TRUE, TRUE)
                        ON CONFLICT (owner_id, user_id) DO NOTHING
                    `, [ownerId, userId]);
                    console.log(`[manager-code] Auto-created owner_user link: owner=${ownerId} user=${userId}`);
                } catch (e) {
                    console.warn(`[manager-code] Could not auto-create owner_user link:`, e);
                }
            }
        }

        // Stratégie C : Chercher un owner avec le même téléphone
        if (result.rows.length === 0) {
            const userPhone = await pool.query(`SELECT telephone FROM users WHERE id = $1`, [userId]);
            if (userPhone.rows.length > 0 && userPhone.rows[0].telephone) {
                result = await pool.query(
                    `SELECT id as owner_id, name as owner_name, manager_code
                     FROM owners
                     WHERE phone = $1
                       AND manager_code IS NOT NULL AND manager_code != ''
                     ORDER BY name ASC`,
                    [userPhone.rows[0].telephone]
                );
                console.log(`[manager-code] Stratégie C (phone): ${result.rows.length} résultats`);
            }
        }

        if (result.rows.length > 0) {
            console.log(`[manager-code] SUCCESS → code=${result.rows[0].manager_code}`);
            res.json({
                managerCode: result.rows[0].manager_code,
                owners: result.rows
            });
        } else {
            console.warn(`[manager-code] FAIL: No owner found for user_id=${userId} (email=${userEmail})`);
            // Debug: lister tous les owners pour traçabilité
            const allOwners = await pool.query(`SELECT id, name, email, phone, manager_code FROM owners LIMIT 10`);
            console.log(`[manager-code] DEBUG: premiers owners =`, JSON.stringify(allOwners.rows));
            res.json({ managerCode: null, owners: [] });
        }
    } catch (error) {
        console.error('[manager-code] Error:', error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});


export default router;