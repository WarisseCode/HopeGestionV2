// backend/routes/authRoutes.ts - Password Reset Endpoints
// Append this code to the end of authRoutes.ts before export default router;

import EmailService from '../services/EmailService';

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
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                message: 'Le mot de passe doit contenir au moins 8 caractères.' 
            });
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumber = /\d/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            return res.status(400).json({ 
                message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.' 
            });
        }

        const weakPasswords = ['password123', '12345678', 'azerty123', 'qwerty123', 'admin123'];
        if (weakPasswords.includes(newPassword.toLowerCase())) {
            return res.status(400).json({ 
                message: 'Ce mot de passe est trop commun. Choisissez un mot de passe plus sécurisé.' 
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
