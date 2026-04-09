// backend/routes/googleAuthRoutes.ts

import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import pool from '../db/database';
import { AuditService } from '../services/AuditService';
import { JWT_SECRET } from '../config/config';

const router = Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Authenticate user with Google OAuth token
 */
router.post('/google', async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ message: 'Google credential requis.' });
    }

    try {
        // 1. Verify Google token
        if (!GOOGLE_CLIENT_ID) {
            return res.status(500).json({ 
                message: 'Google OAuth non configuré. Contactez l\'administrateur.' 
            });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(401).json({ message: 'Token Google invalide.' });
        }

        const {
            sub: googleId,        // Google unique ID
            email,
            name,
            given_name: prenom,
            family_name: nom,
            picture: photoUrl,
            email_verified
        } = payload;

        if (!email_verified) {
            return res.status(403).json({ 
                message: 'Email non vérifié par Google.' 
            });
        }

        // 2. Check if user exists
        const userResult = await pool.query(
            'SELECT id, email, nom, user_type, role, google_id, statut FROM users WHERE email = $1',
            [email]
        );

        let user;
        let isNewUser = false;

        if (userResult.rows.length > 0) {
            // 3a. Existing user
            user = userResult.rows[0];

            // Update google_id if not set (linking existing email account)
            if (!user.google_id) {
                await pool.query(
                    'UPDATE users SET google_id = $1, auth_provider = $2, avatar_url = $3 WHERE id = $4',
                    [googleId, 'google', photoUrl, user.id]
                );
                user.google_id = googleId;
            }

            // Log successful login
            await AuditService.log({
                userId: user.id.toString(),
                action: 'GOOGLE_LOGIN',
                entityType: 'USER',
                entityId: user.id.toString(),
                details: { email, provider: 'google' },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });

        } else {
            // 3b. New user - create with pending state
            isNewUser = true;
            
            const insertResult = await pool.query(
                `INSERT INTO users (email, nom, password_hash, telephone, google_id, auth_provider, avatar_url, user_type, role, statut, is_verified)
                 VALUES ($1, $2, $3, $4, $5, 'google', $6, 'pending', 'pending', 'actif', true)
                 RETURNING id, email, nom, user_type, role`,
                [email, name || `${prenom} ${nom}`, `google_oauth_${googleId}`, `google_${googleId}`, googleId, photoUrl]
            );

            user = insertResult.rows[0];

            // Log registration
            await AuditService.log({
                userId: user.id.toString(),
                action: 'GOOGLE_REGISTER',
                entityType: 'USER',
                entityId: user.id.toString(),
                details: { email, provider: 'google', name },
                ipAddress: req.ip || 'unknown',
                userAgent: (req.headers['user-agent'] as string) || 'unknown'
            });
        }

        // 4. Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role,
                userType: user.user_type
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 5. Return response
        console.log(`✅ Google OAuth ${isNewUser ? 'registration' : 'login'} for ${email} from IP: ${req.ip}`);

        res.json({
            message: isNewUser ? 'Compte créé avec succès.' : 'Connexion réussie.',
            token,
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                user_type: user.user_type,
                role: user.role
            },
            needsProfileCompletion: user.user_type === 'pending' // Flag for frontend
        });

    } catch (error: any) {
        console.error('❌ Error in Google OAuth:', error);
        
        if (error.message?.includes('Token used too late')) {
            return res.status(401).json({ 
                message: 'Token Google expiré. Réessayez.' 
            });
        }

        res.status(500).json({ 
            message: 'Erreur lors de l\'authentification Google.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * PATCH /api/auth/complete-profile
 * Complete user profile after Google OAuth
 */
router.patch('/complete-profile', async (req: Request, res: Response) => {
    const { userId, userType, telephone } = req.body;

    try {
        // 1. Validation
        if (!userId || !userType || !telephone) {
            return res.status(400).json({ 
                message: 'UserID, type de compte et téléphone requis.' 
            });
        }

        // Validate userType
        const validTypes = ['gestionnaire', 'proprietaire', 'locataire'];
        if (!validTypes.includes(userType)) {
            return res.status(400).json({ 
                message: 'Type de compte invalide.' 
            });
        }

        // Validate phone
        const cleanPhone = telephone.replace(/[^\d+]/g, '');
        const phoneRegex = /^(\+|00)?[1-9]\d{8,14}$/;
        if (!phoneRegex.test(cleanPhone)) {
            return res.status(400).json({ 
                message: 'Numéro de téléphone invalide.' 
            });
        }

        // 2. Update user
        const result = await pool.query(
            `UPDATE users 
             SET user_type = $1, role = $1, telephone = $2 
             WHERE id = $3 AND user_type = 'pending'
             RETURNING id, email, nom, user_type, role`,
            [userType, cleanPhone, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'Utilisateur non trouvé ou profil déjà complété.' 
            });
        }

        const user = result.rows[0];

        // 3. Generate new token with updated role
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.role,
                userType: user.user_type
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Audit log
        await AuditService.log({
            userId: user.id.toString(),
            action: 'PROFILE_COMPLETED',
            entityType: 'USER',
            entityId: user.id.toString(),
            details: { userType, telephone: cleanPhone },
            ipAddress: req.ip || 'unknown',
            userAgent: (req.headers['user-agent'] as string) || 'unknown'
        });

        console.log(`✅ Profile completed for user ${user.email}: ${userType}`);

        res.json({
            message: 'Profil complété avec succès.',
            token, // New token with correct role
            user: {
                id: user.id,
                email: user.email,
                nom: user.nom,
                user_type: user.user_type,
                role: user.role
            }
        });

    } catch (error: any) {
        console.error('❌ Error completing profile:', error);
        
        // Handle duplicate phone number
        if (error.code === '23505' && error.constraint === 'users_telephone_key') {
            return res.status(409).json({ 
                message: 'Ce numéro de téléphone est déjà utilisé par un autre compte.' 
            });
        }
        
        res.status(500).json({ 
            message: 'Erreur lors de la complétion du profil.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export default router;
