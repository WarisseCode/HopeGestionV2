// backend/routes/authRoutes.ts
// Thin HTTP controller for /api/auth routes.
// Pure auth operations (login, register, OTP, tokens, password reset) are delegated to AuthService.
// Profile, invite, and guest management remain here until a dedicated UserService is created.

import { Router, Request, Response } from 'express';
import { protect } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AuditService } from '../services/AuditService';
import pool from '../db/database';
import { JWT_SECRET } from '../config/config';
import { authService, AuthError, REFRESH_TOKEN_MS } from '../services/AuthService';

const router = Router();

// ── Cookie configuration ──────────────────────────────────────────────────────

const REFRESH_COOKIE_NAME = 'refreshToken';
const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: REFRESH_TOKEN_MS,
    path: '/api/auth',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendAuthError(res: Response, error: unknown) {
    if (error instanceof AuthError) {
        return res.status(error.status).json({ message: error.message, ...error.data });
    }
    console.error('Auth route unexpected error:', error);
    res.status(500).json({
        message: 'Une erreur est survenue. Veuillez réessayer.',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
}

// Local token verifier (for routes that use a different token format than protect middleware)
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

const SALT_ROUNDS = 10;

// ── Auth routes (delegate to AuthService) ────────────────────────────────────

router.post('/register', async (req, res) => {
    try {
        const { userId } = await authService.register(
            req.body,
            req.ip || 'unknown',
            (req.headers['user-agent'] as string) || 'unknown'
        );
        res.status(201).json({ message: 'Utilisateur créé avec succès.', userId });
    } catch (error) {
        sendAuthError(res, error);
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Connexion utilisateur
 *     description: Authentifie un utilisateur et retourne un access token (15 min) + refresh token httpOnly cookie (7 jours).
 *     security: []
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { accessToken, refreshToken, role, userId } = await authService.login(
            email, password,
            req.ip || 'unknown',
            (req.headers['user-agent'] as string) || 'unknown'
        );
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
        res.json({ message: 'Connexion réussie.', token: accessToken, role, userId });
    } catch (error) {
        sendAuthError(res, error);
    }
});

router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const { accessToken, refreshToken, role, userId } = await authService.verifyEmail(email, otp);
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
        res.status(200).json({ message: 'Email vérifié avec succès.', token: accessToken, role, userId });
    } catch (error) {
        sendAuthError(res, error);
    }
});

router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        await authService.resendOtp(email);
        res.status(200).json({ message: "Si l'email existe, un nouveau code a été envoyé." });
    } catch (error) {
        sendAuthError(res, error);
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
 */
router.post('/refresh', async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) return res.status(400).json({ message: 'Refresh token manquant.' });
    try {
        const { accessToken, refreshToken } = await authService.rotateRefreshToken(rawToken);
        res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
        res.json({ token: accessToken });
    } catch (error) {
        sendAuthError(res, error);
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
 */
router.post('/logout', async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.revokeRefreshToken(rawToken);
    res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    });
    res.json({ message: 'Déconnexion réussie.' });
});

router.post('/change-password', verifyToken, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        await authService.changePassword(
            req.user.id, currentPassword, newPassword,
            req.ip || 'unknown',
            (req.headers['user-agent'] as string) || 'unknown'
        );
        res.json({ message: 'Mot de passe modifié avec succès.' });
    } catch (error) {
        sendAuthError(res, error);
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        await authService.forgotPassword(
            email,
            req.ip || 'unknown',
            (req.headers['user-agent'] as string) || 'unknown'
        );
        res.status(200).json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    } catch (error) {
        sendAuthError(res, error);
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        await authService.resetPassword(
            token, newPassword,
            req.ip || 'unknown',
            (req.headers['user-agent'] as string) || 'unknown'
        );
        res.status(200).json({ message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
        sendAuthError(res, error);
    }
});

router.get('/validate-reset-token/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const result = await authService.validateResetToken(token);
        res.status(200).json(result);
    } catch (error) {
        sendAuthError(res, error);
    }
});

// ── Profile ───────────────────────────────────────────────────────────────────

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
        const nameParts = (user.nom || '').split(' ');
        const lastName  = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || '';

        let permissions: any = {};

        if (user.role === 'admin') {
            permissions = {
                biens_read: true,  biens_write: true,
                locataires_read: true, locataires_write: true,
                owners_read: true, owners_write: true,
                finance_read: true, finance_write: true, finance_validate: true,
                contrats_read: true, contrats_write: true,
                documents_read: true, documents_write: true,
                users_read: true, users_write: true,
                can_delete: true,
            };
        } else if (['proprietaire', 'gestionnaire'].includes(user.role)) {
            const matrixResult = await pool.query(
                `SELECT module, can_read, can_write, can_validate, can_delete FROM permission_matrix WHERE role = $1`,
                [user.role]
            );

            if (matrixResult.rows.length > 0) {
                permissions = {
                    biens_read: false, biens_write: false,
                    locataires_read: false, locataires_write: false,
                    owners_read: false, owners_write: false,
                    finance_read: false, finance_write: false, finance_validate: false,
                    contrats_read: false, contrats_write: false,
                    documents_read: false, documents_write: false,
                    users_read: false, users_write: false,
                    can_delete: false,
                };

                for (const row of matrixResult.rows) {
                    const mod = row.module.toLowerCase();
                    if (mod === 'biens')      { permissions.biens_read = row.can_read; permissions.biens_write = row.can_write; }
                    if (mod === 'locataires') { permissions.locataires_read = row.can_read; permissions.locataires_write = row.can_write; }
                    if (mod === 'owners')     { permissions.owners_read = row.can_read; permissions.owners_write = row.can_write; }
                    if (mod === 'finance')    { permissions.finance_read = row.can_read; permissions.finance_write = row.can_write; permissions.finance_validate = row.can_validate; }
                    if (mod === 'contrats')   { permissions.contrats_read = row.can_read; permissions.contrats_write = row.can_write; }
                    if (mod === 'documents')  { permissions.documents_read = row.can_read; permissions.documents_write = row.can_write; }
                    if (mod === 'users')      { permissions.users_read = row.can_read; permissions.users_write = row.can_write; }
                    if (row.can_delete) permissions.can_delete = true;
                }
            } else {
                permissions = {
                    biens_read: true, biens_write: true,
                    locataires_read: true, locataires_write: true,
                    owners_read: true, owners_write: true,
                    finance_read: true, finance_write: true, finance_validate: true,
                    contrats_read: true, contrats_write: true,
                    documents_read: true, documents_write: true,
                    users_read: true, users_write: true,
                    can_delete: true,
                };
            }
        } else {
            const delegationResult = await pool.query(
                `SELECT can_view_finances, can_edit_properties, can_manage_tenants,
                        can_manage_contracts, can_validate_payments, can_manage_users, can_delete_data
                 FROM owner_user
                 WHERE user_id = $1 AND is_active = true
                 LIMIT 1`,
                [userId]
            );

            if (delegationResult.rows.length > 0) {
                const d = delegationResult.rows[0];
                permissions = {
                    biens_read: d.can_edit_properties, biens_write: d.can_edit_properties,
                    locataires_read: d.can_manage_tenants, locataires_write: d.can_manage_tenants,
                    owners_read: d.can_manage_users, owners_write: d.can_manage_users,
                    finance_read: d.can_view_finances, finance_write: d.can_validate_payments, finance_validate: d.can_validate_payments,
                    contrats_read: d.can_manage_contracts, contrats_write: d.can_manage_contracts,
                    documents_read: d.can_view_finances || d.can_manage_contracts,
                    documents_write: d.can_manage_contracts,
                    users_read: d.can_manage_users, users_write: d.can_manage_users,
                    can_delete: d.can_delete_data,
                };
            } else {
                const matrixResult = await pool.query(
                    `SELECT module, can_read, can_write, can_validate, can_delete FROM permission_matrix WHERE role = $1`,
                    [user.role]
                );

                permissions = {
                    biens_read: false, biens_write: false,
                    locataires_read: false, locataires_write: false,
                    owners_read: false, owners_write: false,
                    finance_read: false, finance_write: false, finance_validate: false,
                    contrats_read: false, contrats_write: false,
                    documents_read: false, documents_write: false,
                    users_read: false, users_write: false,
                    can_delete: false,
                };

                for (const row of matrixResult.rows) {
                    const mod = row.module.toLowerCase();
                    if (mod === 'biens')      { permissions.biens_read = row.can_read; permissions.biens_write = row.can_write; }
                    if (mod === 'locataires') { permissions.locataires_read = row.can_read; permissions.locataires_write = row.can_write; }
                    if (mod === 'owners')     { permissions.owners_read = row.can_read; permissions.owners_write = row.can_write; }
                    if (mod === 'finance')    { permissions.finance_read = row.can_read; permissions.finance_write = row.can_write; permissions.finance_validate = row.can_validate; }
                    if (mod === 'contrats')   { permissions.contrats_read = row.can_read; permissions.contrats_write = row.can_write; }
                    if (mod === 'documents')  { permissions.documents_read = row.can_read; permissions.documents_write = row.can_write; }
                    if (mod === 'users')      { permissions.users_read = row.can_read; permissions.users_write = row.can_write; }
                    if (row.can_delete) permissions.can_delete = true;
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
                permissions,
            },
        });

    } catch (error) {
        console.error('Erreur récupération profil:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

router.put('/profile', verifyToken, async (req: any, res) => {
    const { nom, prenom, email, telephone, preferences, photo_url } = req.body;
    const userId = req.user.id;

    try {
        if (!email) return res.status(400).json({ message: 'Email requis.' });

        const fullName = `${nom} ${prenom}`.trim();

        await pool.query(
            `UPDATE users
             SET nom = $1, email = $2, telephone = $3, preferences = $4, photo_url = $5
             WHERE id = $6`,
            [fullName, email, telephone, JSON.stringify(preferences), photo_url, userId]
        );

        await AuditService.log({
            userId: userId.toString(), action: 'UPDATE_PROFILE', entityType: 'USER', entityId: userId.toString(),
            details: { updatedFields: Object.keys(req.body) },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });

        res.json({ message: 'Profil mis à jour avec succès.' });

    } catch (error) {
        console.error('Erreur mise à jour profil:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

// ── Admin utilities ───────────────────────────────────────────────────────────

router.get('/test-email', protect, async (req: Request, res: Response) => {
    if (!['admin', 'super_admin'].includes((req as any).userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }
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
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
        });

        await transporter.verify();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Hope Gestion" <noreply@hopegestion.com>',
            to: process.env.EMAIL_USER,
            subject: 'Test SMTP Hope Gestion',
            text: 'Ceci est un test. Si vous lisez ceci, le SMTP fonctionne !',
        });

        res.json({ success: true, message: 'Email envoyé avec succès !', config });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur SMTP', error: error.message, code: error.code, config });
    }
});

// ── User invitation ───────────────────────────────────────────────────────────

router.post('/invite-user', verifyToken, async (req: any, res) => {
    const { email, nom, prenom, telephone, role, access_scope } = req.body;
    const issuerId = req.user.id;

    try {
        if (!telephone || !nom || !role) {
            return res.status(400).json({ message: 'Nom, Téléphone et Rôle sont requis.' });
        }

        const userEmail = email || `invite_${telephone.replace(/[^0-9]/g, '')}@hopegestion.local`;
        const tempHash  = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

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

            const token    = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

            await client.query(
                `INSERT INTO user_invitations (token, email, role, issuer_id, permissions, expires_at, user_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [token, userEmail, role, issuerId, JSON.stringify({}), expiresAt, userId]
            );

            await client.query('COMMIT');

            const link = `${req.headers.origin || 'http://localhost:5173'}/accept-invite?token=${token}`;
            res.status(201).json({ message: 'Utilisateur invité avec succès.', link, token, userId });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error: any) {
        console.error('Erreur invitation:', error.message);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

router.post('/accept-invite', async (req, res) => {
    const { token, password, nom, prenom } = req.body;

    try {
        if (!token || !password) return res.status(400).json({ message: 'Token et mot de passe requis.' });

        const inviteRes = await pool.query(
            `SELECT * FROM user_invitations WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
            [token]
        );

        if (inviteRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invitation invalide ou expirée.' });
        }

        const invite       = inviteRes.rows[0];
        const targetUserId = invite.user_id || invite.permissions?.userId;

        if (!targetUserId) {
            return res.status(500).json({ message: 'Erreur intégrité invitation (User ID manquant).' });
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `UPDATE users
                 SET password_hash = $1, statut = 'actif',
                     nom = COALESCE(NULLIF($3, ''), nom)
                 WHERE id = $2`,
                [password_hash, targetUserId, nom ? `${nom} ${prenom || ''}`.trim() : '']
            );

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

// ── Guest access ──────────────────────────────────────────────────────────────

router.post('/create-guest', verifyToken, async (req: any, res) => {
    const { nom, prenom, telephone, durationDays, permissions, role } = req.body;
    const issuerId = req.user.id;

    try {
        if (!nom)       return res.status(400).json({ message: 'Le nom est requis.' });
        if (!telephone) return res.status(400).json({ message: 'Le numéro de téléphone est requis.' });

        const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
        const rawKey     = `GUEST-${randomPart}`;
        const hashedKey  = crypto.createHash('sha256').update(rawKey).digest('hex');

        const days      = durationDays || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);

        const dummyEmail = `${rawKey}@guest.local`;
        const dummyHash  = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const duplicateCheck = await client.query(
                'SELECT id FROM users WHERE telephone = $1 OR email = $2',
                [telephone, dummyEmail]
            );

            if (duplicateCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(409).json({
                    message: `Un utilisateur existe déjà avec ce numéro de téléphone (${telephone}). Chaque accès invité doit avoir un numéro unique.`,
                });
            }

            const issuerRes = await client.query('SELECT agency_id FROM users WHERE id = $1', [issuerId]);
            const agencyId  = issuerRes.rows[0]?.agency_id;
            const guestRole = role || 'viewer';

            const insertRes = await client.query(
                `INSERT INTO users (email, password_hash, nom, user_type, role, telephone, statut, access_key, access_key_expires_at, is_guest, agency_id)
                 VALUES ($1, $2, TRIM($3 || ' ' || $4), 'guest', $5, $6, 'actif', $7, $8, true, $9)
                 RETURNING id`,
                [dummyEmail, dummyHash, nom, prenom || '', guestRole, telephone, hashedKey, expiresAt, agencyId]
            );
            const guestId = insertRes.rows[0].id;

            const issuerAssignmentRes = await client.query(
                `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = true LIMIT 1`,
                [issuerId]
            );

            if (issuerAssignmentRes.rows.length === 0) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({
                    message: "Aucun propriétaire assigné. Vous devez être assigné à un propriétaire pour créer un accès invité.",
                });
            }

            const targetOwnerId = issuerAssignmentRes.rows[0].owner_id;

            let userPermissions = permissions || null;

            if (role && !permissions) {
                const permMatrixRes = await client.query(
                    `SELECT module, can_read, can_write, can_delete, can_validate
                     FROM permission_matrix
                     WHERE role = $1`,
                    [role]
                );

                if (permMatrixRes.rows.length === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    return res.status(400).json({
                        message: `Aucune permission définie pour le rôle "${role}" dans la matrice de permissions. Veuillez configurer ce rôle dans l'onglet Permissions.`,
                    });
                }

                userPermissions = {
                    can_view_finances: false, can_edit_properties: false,
                    can_manage_tenants: false, can_manage_contracts: false,
                    can_validate_payments: false, can_manage_users: false, can_delete_data: false,
                };

                for (const row of permMatrixRes.rows) {
                    const mod = row.module.toLowerCase();
                    if (mod === 'finance')    { if (row.can_read) userPermissions.can_view_finances = true; if (row.can_validate) userPermissions.can_validate_payments = true; }
                    if (mod === 'biens')      { if (row.can_write) userPermissions.can_edit_properties = true; }
                    if (mod === 'locataires') { if (row.can_write) userPermissions.can_manage_tenants = true; }
                    if (mod === 'owners' || mod === 'contrats') { if (row.can_write) userPermissions.can_manage_contracts = true; }
                    if (mod === 'users')      { if (row.can_write) userPermissions.can_manage_users = true; }
                    if (row.can_delete) userPermissions.can_delete_data = true;
                }
            }

            if (!userPermissions) {
                await client.query('ROLLBACK');
                client.release();
                return res.status(400).json({
                    message: 'Vous devez spécifier soit un rôle, soit des permissions explicites pour créer un accès invité.',
                });
            }

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
                userPermissions.can_view_finances, userPermissions.can_edit_properties,
                userPermissions.can_manage_tenants, userPermissions.can_manage_contracts,
                userPermissions.can_validate_payments, userPermissions.can_manage_users,
                userPermissions.can_delete_data,
            ]);

            await client.query('COMMIT');

            await AuditService.log({
                userId: issuerId.toString(), action: 'CREATE_GUEST', entityType: 'USER', entityId: guestId.toString(),
                details: { accessKeyHash: hashedKey.substring(0, 8) + '...', expiresAt, agencyId, role: guestRole },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown',
            });

            res.status(201).json({ message: 'Accès invité créé', accessKey: rawKey, expiresAt, guestId, role: guestRole });

        } catch (err: any) {
            await client.query('ROLLBACK');
            console.error('ERROR in /create-guest:', err);
            res.status(500).json({
                message: "Erreur serveur lors de la création de l'accès invité.",
                error: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            });
        } finally {
            client.release();
        }
    } catch (err: any) {
        console.error('OUTER ERROR in /create-guest:', err);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

router.post('/login-with-key', async (req, res) => {
    const { accessKey } = req.body;

    try {
        if (!accessKey) return res.status(400).json({ message: "Clé d'accès requise." });

        const hashedInputKey = crypto.createHash('sha256').update(accessKey).digest('hex');
        const userResult = await pool.query(
            `SELECT id, nom, role, access_key_expires_at, is_guest, statut
             FROM users
             WHERE access_key = $1`,
            [hashedInputKey]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Clé d'accès invalide." });
        }

        const guestUser = userResult.rows[0];

        if (new Date() > new Date(guestUser.access_key_expires_at)) {
            return res.status(401).json({ message: "Cette clé d'accès a expiré." });
        }

        if (guestUser.statut !== 'actif') {
            return res.status(401).json({ message: 'Compte désactivé.' });
        }

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

        const assignment   = assignmentResult.rows[0];
        const guestPerms   = {
            can_view_finances: assignment.can_view_finances,
            can_edit_properties: assignment.can_edit_properties,
            can_manage_tenants: assignment.can_manage_tenants,
            can_manage_contracts: assignment.can_manage_contracts,
            can_validate_payments: assignment.can_validate_payments,
            can_manage_users: assignment.can_manage_users,
            can_delete_data: assignment.can_delete_data,
        };

        const token = jwt.sign(
            { id: guestUser.id, issuerId: assignment.owner_id, role: 'guest', isGuest: true, permissions: guestPerms },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        await AuditService.log({
            userId: guestUser.id.toString(), action: 'LOGIN_KEY', entityType: 'USER', entityId: guestUser.id.toString(),
            details: { isGuest: true, issuerId: assignment.owner_id, issuerName: assignment.issuer_name },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown',
        });

        res.json({
            token, userId: guestUser.id, issuerId: assignment.owner_id,
            issuerName: assignment.issuer_name, role: 'guest', isGuest: true,
            permissions: guestPerms, expiresAt: guestUser.access_key_expires_at,
        });

    } catch (error) {
        console.error('Erreur login clé:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

export default router;
