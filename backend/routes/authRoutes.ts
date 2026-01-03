// backend/routes/authRoutes.ts

import { Router } from 'express';
import { Pool } from 'pg'; 
import * as dotenv from 'dotenv';

// Outils de sécurité
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'; 

// Charger les variables d'environnement
dotenv.config();

import { AuditService } from '../services/AuditService';

const router = Router();

// Pour que les routes aient accès à la DB (Méthode simple pour le MVP)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
});
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
            `INSERT INTO users (email, password_hash, nom, user_type, telephone) 
             VALUES ($1, $2, TRIM($3 || ' ' || $4), $5, $6) RETURNING id`,
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

export default router;