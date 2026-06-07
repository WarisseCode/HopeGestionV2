// backend/services/AuthService.ts
// Business logic for authentication — login, register, OTP, token rotation, password reset.
// Routes are thin controllers that call these methods and handle HTTP concerns (cookies, status codes).

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../db/database';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES_IN } from '../config/config';
import { AuditService } from './AuditService';
import EmailService from './EmailService';
import { validatePassword } from '../utils/passwordUtils';

const SALT_ROUNDS = 10;
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

// Typed error so routes can distinguish auth failures from unexpected errors
export class AuthError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly data?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AuthError';
    }
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface LoginResult extends TokenPair {
    role: string;
    userId: number;
}

export interface RegisterInput {
    email: string;
    password: string;
    nom: string;
    prenoms: string;
    telephone: string;
    userType?: string;
    nomAgence?: string;
    invitationCode?: string;
}

class AuthService {
    // ── Token management ──────────────────────────────────────────────────────────

    async issueTokenPair(userId: number, role: string, userType: string): Promise<TokenPair> {
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

    // Atomically revokes old token and issues a new pair (rotation).
    async rotateRefreshToken(rawToken: string): Promise<TokenPair> {
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Single UPDATE … RETURNING is atomic in PostgreSQL — no explicit transaction needed.
        const result = await pool.query(
            `UPDATE refresh_tokens rt
             SET revoked_at = NOW()
             FROM users u
             WHERE u.id = rt.user_id
               AND rt.token_hash = $1
               AND rt.revoked_at IS NULL
               AND rt.expires_at > NOW()
             RETURNING rt.user_id, u.role, u.user_type`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            throw new AuthError(401, 'Refresh token invalide ou expiré.');
        }

        const stored = result.rows[0];
        return this.issueTokenPair(stored.user_id, stored.role, stored.user_type || 'gestionnaire');
    }

    async revokeRefreshToken(rawToken?: string): Promise<void> {
        if (!rawToken) return;
        try {
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            await pool.query(
                `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
                [tokenHash]
            );
        } catch (err) {
            console.error('Erreur révocation refresh token:', err);
        }
    }

    // ── Authentication ────────────────────────────────────────────────────────────

    async login(email: string, password: string, ipAddress: string, userAgent: string): Promise<LoginResult> {
        if (!email || !password) throw new AuthError(400, 'Email et mot de passe sont requis.');

        const sanitizedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(sanitizedEmail)) throw new AuthError(400, 'Veuillez fournir une adresse email valide.');
        if (password.length < 1) throw new AuthError(400, 'Le mot de passe ne peut pas être vide.');

        const result = await pool.query(
            'SELECT id, password_hash, role, user_type, statut, is_verified FROM users WHERE email = $1',
            [sanitizedEmail]
        );

        if (result.rows.length === 0) {
            console.warn(`🚨 SECURITY: Login attempt for non-existent email: ${sanitizedEmail} from IP: ${ipAddress}`);
            throw new AuthError(401, 'Email ou mot de passe incorrect.');
        }

        const user = result.rows[0];

        if (user.statut === 'inactif' || user.statut === 'suspendu') {
            throw new AuthError(401, "Votre compte est inactif ou suspendu. Veuillez contacter l'administrateur.");
        }

        if (user.is_verified === false) {
            throw new AuthError(403, 'Veuillez vérifier votre adresse email avec le code que nous vous avons envoyé.', { isVerified: false });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            await AuditService.log({
                userId: user.id.toString(), action: 'FAILED_LOGIN', entityType: 'USER', entityId: user.id.toString(),
                details: { email, reason: 'Invalid password' }, ipAddress, userAgent,
            });
            console.warn(`🚨 SECURITY: Failed login attempt for ${email} from IP: ${ipAddress}`);
            throw new AuthError(401, 'Email ou mot de passe incorrect.');
        }

        const tokens = await this.issueTokenPair(user.id, user.role, user.user_type || 'gestionnaire');

        await AuditService.log({
            userId: user.id.toString(), action: 'LOGIN', entityType: 'USER', entityId: user.id.toString(),
            details: { email }, ipAddress, userAgent,
        });

        console.log(`✅ Successful login for userId:${user.id} from IP: ${ipAddress}`);
        return { ...tokens, role: user.role, userId: user.id };
    }

    // ── Registration & OTP ────────────────────────────────────────────────────────

    async register(input: RegisterInput, ipAddress: string, userAgent: string): Promise<{ userId: number }> {
        const { email, password, nom, prenoms, telephone, userType, invitationCode } = input;

        if (!email || !password || !nom || !prenoms || !telephone) {
            throw new AuthError(400, 'Tous les champs sont requis : email, mot de passe, nom, prénoms et téléphone.');
        }

        const sanitizedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(sanitizedEmail)) throw new AuthError(400, 'Veuillez fournir une adresse email valide.');

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) throw new AuthError(400, passwordValidation.message ?? 'Mot de passe invalide.');

        const cleanPhone = telephone.replace(/[^\d+]/g, '');
        const phoneOk = /^(\+|00)?[1-9]\d{1,14}$/.test(cleanPhone) || /^(\+)?\d{8,15}$/.test(cleanPhone);
        if (!phoneOk) throw new AuthError(400, 'Veuillez fournir un numéro de téléphone valide.');

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const otp            = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt   = new Date(Date.now() + 15 * 60 * 1000);

        let userId: number;
        try {
            const result = await pool.query(
                `INSERT INTO users (email, password_hash, nom, user_type, role, telephone, is_verified, verification_otp, otp_expires_at)
                 VALUES ($1, $2, TRIM($3 || ' ' || $4), $5, $5, $6, false, $7, $8) RETURNING id`,
                [sanitizedEmail, password_hash, nom, prenoms, userType || 'gestionnaire', cleanPhone, otp, otpExpiresAt]
            );
            userId = result.rows[0].id;
        } catch (err: any) {
            if (err.code === '23505') throw new AuthError(409, 'Cet email est déjà utilisé par un autre compte.');
            if (err.code === '23502') throw new AuthError(400, "Un champ requis n'a pas été fourni correctement.");
            throw err;
        }

        // Send OTP email — non-blocking so a failing SMTP server doesn't block registration
        EmailService.sendEmail(
            sanitizedEmail,
            'Vérification de votre compte - Hope Gestion',
            `Bonjour ${prenoms},\n\nMerci de vous être inscrit sur Hope Gestion.\nVotre code de vérification est : ${otp}\nIl est valide pendant 15 minutes.\n\nL'équipe Hope Gestion.`,
            `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Code de vérification</h1>
                </div>
                <div style="padding: 20px; background-color: #f9f9f9; text-align: center;">
                    <p style="font-size: 16px; color: #333;">Bonjour <strong>${prenoms}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Utilisez le code ci-dessous pour vérifier votre compte :</p>
                    <div style="margin: 30px 0; padding: 15px; background-color: white; border-radius: 8px; border: 2px dashed #3498db; display: inline-block;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; margin-top: 20px; color: #666;">Ce code expire dans 15 minutes.</p>
                </div>
            </div>`
        ).catch(err => console.error('[Auth] Failed to send verification email:', err));

        await AuditService.log({
            userId: userId.toString(), action: 'REGISTER', entityType: 'USER', entityId: userId.toString(),
            details: { email: sanitizedEmail, userType: userType || 'gestionnaire' }, ipAddress, userAgent,
        });

        if (invitationCode) {
            this._processInvitationCode(invitationCode, userId, nom, sanitizedEmail, cleanPhone, prenoms)
                .catch(err => console.error('[Auth] Error processing invitation code:', err));
        }

        return { userId };
    }

    private async _processInvitationCode(
        code: string, userId: number, nom: string, email: string, phone: string, prenoms: string
    ): Promise<void> {
        const tenantRes = await pool.query(
            `SELECT id FROM tenants WHERE invitation_code = $1 AND user_id IS NULL`, [code]
        );

        if (tenantRes.rows.length > 0) {
            const tenantId = tenantRes.rows[0].id;
            await pool.query(
                `UPDATE tenants SET user_id = $1, nom = $2, email = $3, telephone_principal = $4, prenoms = $5 WHERE id = $6`,
                [userId, nom, email, phone, prenoms, tenantId]
            );
            await pool.query(`UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`, [userId]);
            console.log(`[Auth] User ${userId} linked to Tenant ${tenantId} via INDIVIDUAL code.`);
            return;
        }

        const ownerRes = await pool.query(`SELECT id FROM owners WHERE manager_code = $1`, [code]);
        if (ownerRes.rows.length > 0) {
            const ownerId = ownerRes.rows[0].id;
            const newTenantCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const newTenant = await pool.query(
                `INSERT INTO tenants (owner_id, nom, prenoms, email, telephone_principal, statut, type, invitation_code, user_id)
                 VALUES ($1, $2, $3, $4, $5, 'Nouveau', 'Locataire', $6, $7) RETURNING id`,
                [ownerId, nom, prenoms, email, phone, newTenantCode, userId]
            );
            await pool.query(`UPDATE users SET user_type = 'locataire', role = 'locataire' WHERE id = $1`, [userId]);
            console.log(`[Auth] User ${userId} → Tenant ${newTenant.rows[0].id} via MANAGER code ${ownerId}.`);
        } else {
            console.warn(`[Auth] Invalid invitation code: ${code} for user ${userId}`);
        }
    }

    async verifyEmail(email: string, otp: string): Promise<LoginResult> {
        if (!email || !otp) throw new AuthError(400, 'Email et code de vérification requis.');

        const sanitizedEmail = email.trim().toLowerCase();
        const result = await pool.query(
            'SELECT id, verification_otp, otp_expires_at, is_verified, role, user_type FROM users WHERE email = $1',
            [sanitizedEmail]
        );

        if (result.rows.length === 0) throw new AuthError(404, 'Utilisateur introuvable.');

        const user = result.rows[0];
        if (user.is_verified)                                   throw new AuthError(400, 'Cet email est déjà vérifié.');
        if (user.verification_otp !== otp.trim())               throw new AuthError(400, 'Code de vérification incorrect.');
        if (new Date(user.otp_expires_at) < new Date())         throw new AuthError(400, 'Ce code a expiré. Veuillez en demander un nouveau.');

        await pool.query(
            'UPDATE users SET is_verified = true, verification_otp = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        const tokens = await this.issueTokenPair(user.id, user.role, user.user_type || 'gestionnaire');
        return { ...tokens, role: user.role, userId: user.id };
    }

    async resendOtp(email: string): Promise<void> {
        if (!email) throw new AuthError(400, "L'email est requis pour renvoyer le code.");

        const sanitizedEmail = email.trim().toLowerCase();
        const result = await pool.query('SELECT id, nom, is_verified FROM users WHERE email = $1', [sanitizedEmail]);

        if (result.rows.length === 0) return; // Anti-enumeration: silent success

        const user = result.rows[0];
        if (user.is_verified) throw new AuthError(400, 'Cet email est déjà vérifié. Connectez-vous.');

        const newOtp       = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            'UPDATE users SET verification_otp = $1, otp_expires_at = $2 WHERE id = $3',
            [newOtp, newExpiresAt, user.id]
        );

        await EmailService.sendEmail(
            sanitizedEmail,
            'Nouveau code de vérification - Hope Gestion',
            `Bonjour ${user.nom},\n\nVotre nouveau code de vérification est : ${newOtp}\n\nL'équipe Hope Gestion.`,
            `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
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
            </div>`
        );
    }

    // ── Profile & password ────────────────────────────────────────────────────────

    async changePassword(
        userId: number, currentPassword: string, newPassword: string, ipAddress: string, userAgent: string
    ): Promise<void> {
        if (!currentPassword || !newPassword) {
            throw new AuthError(400, 'Veuillez fournir le mot de passe actuel et le nouveau.');
        }
        if (newPassword.length < 6) {
            throw new AuthError(400, 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
        }

        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) throw new AuthError(404, 'Utilisateur non trouvé.');

        const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!match) throw new AuthError(401, 'Mot de passe actuel incorrect.');

        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

        await AuditService.log({
            userId: userId.toString(), action: 'CHANGE_PASSWORD', entityType: 'USER', entityId: userId.toString(),
            details: {}, ipAddress, userAgent,
        });
    }

    // ── Password reset ────────────────────────────────────────────────────────────

    // Anti-enumeration: always returns silently even if email doesn't exist
    async forgotPassword(email: string, ipAddress: string, userAgent: string): Promise<void> {
        if (!email) throw new AuthError(400, 'Email requis.');

        const sanitizedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(sanitizedEmail)) throw new AuthError(400, 'Email invalide.');

        const userResult = await pool.query('SELECT id, nom, email FROM users WHERE email = $1', [sanitizedEmail]);

        if (userResult.rows.length === 0) {
            console.warn(`⚠️  Password reset for non-existent email: ${sanitizedEmail} from IP: ${ipAddress}`);
            // Fake delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            return;
        }

        const user = userResult.rows[0];

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash  = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt  = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, tokenHash, expiresAt, ipAddress, userAgent]
        );

        const emailSent = await EmailService.sendPasswordResetEmail(user.email, resetToken, user.nom, ipAddress);
        if (!emailSent) console.error(`❌ Failed to send password reset email to ${user.email}`);

        await AuditService.log({
            userId: user.id.toString(), action: 'PASSWORD_RESET_REQUESTED', entityType: 'USER', entityId: user.id.toString(),
            details: { email: user.email }, ipAddress, userAgent,
        });

        console.log(`✅ Password reset token generated for userId:${user.id} from IP: ${ipAddress}`);
    }

    async resetPassword(token: string, newPassword: string, ipAddress: string, userAgent: string): Promise<void> {
        if (!token || !newPassword) throw new AuthError(400, 'Token et nouveau mot de passe requis.');
        if (!/^[a-f0-9]{64}$/i.test(token)) throw new AuthError(400, 'Token invalide.');

        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.isValid) throw new AuthError(400, passwordValidation.message ?? 'Mot de passe invalide.');

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const tokenResult = await pool.query(
            `SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            console.warn(`⚠️  Invalid reset token attempted from IP: ${ipAddress}`);
            throw new AuthError(400, 'Token invalide ou expiré.');
        }

        const rec = tokenResult.rows[0];

        if (rec.used_at) {
            console.warn(`⚠️  Attempted reuse of password reset token from IP: ${ipAddress}`);
            throw new AuthError(400, 'Ce token a déjà été utilisé.');
        }
        if (new Date() > new Date(rec.expires_at)) {
            console.warn(`⚠️  Expired password reset token used from IP: ${ipAddress}`);
            throw new AuthError(400, 'Ce token a expiré. Veuillez faire une nouvelle demande.');
        }

        const userResult = await pool.query('SELECT id, email, nom FROM users WHERE id = $1', [rec.user_id]);
        if (userResult.rows.length === 0) throw new AuthError(404, 'Utilisateur introuvable.');

        const user = userResult.rows[0];
        const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
        await pool.query('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1', [tokenHash]);

        await EmailService.sendPasswordResetConfirmation(user.email, user.nom, ipAddress);

        await AuditService.log({
            userId: user.id.toString(), action: 'PASSWORD_RESET_COMPLETED', entityType: 'USER', entityId: user.id.toString(),
            details: { email: user.email }, ipAddress, userAgent,
        });

        console.log(`✅ Password successfully reset for userId:${user.id} from IP: ${ipAddress}`);
    }

    async validateResetToken(token: string): Promise<{ valid: boolean; message: string }> {
        if (!/^[a-f0-9]{64}$/i.test(token)) return { valid: false, message: 'Token invalide.' };

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const result = await pool.query(
            `SELECT expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1`,
            [tokenHash]
        );

        if (result.rows.length === 0) return { valid: false, message: 'Token invalide.' };

        const t = result.rows[0];
        if (t.used_at) return { valid: false, message: 'Token déjà utilisé.' };
        if (new Date() > new Date(t.expires_at)) return { valid: false, message: 'Token expiré.' };

        return { valid: true, message: 'Token valide.' };
    }
}

export const authService = new AuthService();
