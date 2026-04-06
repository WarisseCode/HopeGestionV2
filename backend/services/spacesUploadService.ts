// backend/services/spacesUploadService.ts
// Utilise AWS SDK v3 (@aws-sdk/client-s3) — modulaire, allégé, maintenu activement.
// Compatible Digital Ocean Spaces (endpoint S3-compatible).

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import multer from 'multer';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET_NAME = process.env.SPACES_BUCKET  || 'hopegestion-uploads';
const ENDPOINT    = process.env.SPACES_ENDPOINT || 'fra1.digitaloceanspaces.com';
const REGION      = process.env.SPACES_REGION   || 'fra1';
const CDN_BASE    = process.env.SPACES_CDN_URL  || `https://${BUCKET_NAME}.${ENDPOINT}`;

const s3 = new S3Client({
    endpoint:        `https://${ENDPOINT}`,
    region:          REGION,
    credentials: {
        accessKeyId:     process.env.SPACES_KEY    || '',
        secretAccessKey: process.env.SPACES_SECRET || '',
    },
    forcePathStyle: false,
});

/**
 * Upload un fichier vers Digital Ocean Spaces (S3-compatible).
 * @param file   — Objet Multer (memoryStorage)
 * @param folder — Sous-dossier dans le bucket (ex: 'documents', 'avatars')
 * @returns URL publique du fichier
 */
export const uploadToSpaces = async (
    file: Express.Multer.File,
    folder: string = 'uploads'
): Promise<string> => {
    const ext      = path.extname(file.originalname);
    const key      = `${folder}/${uuidv4()}${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket:       BUCKET_NAME,
        Key:          key,
        Body:         file.buffer,
        ACL:          'public-read',
        ContentType:  file.mimetype,
        CacheControl: 'max-age=31536000',
    }));

    return `${CDN_BASE}/${key}`;
};

/**
 * Supprime un fichier depuis Spaces à partir de son URL complète.
 */
export const deleteFromSpaces = async (fileUrl: string): Promise<boolean> => {
    try {
        const url = new URL(fileUrl);
        const key = url.pathname.replace(/^\//, '');

        await s3.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key:    key,
        }));
        return true;
    } catch (error) {
        console.error('Erreur suppression Spaces:', error);
        return false;
    }
};

/**
 * Génère une URL signée (accès temporaire à un fichier privé).
 * @param fileKey  — Clé du fichier dans le bucket
 * @param expiresIn — Durée de validité en secondes (défaut : 1h)
 */
export const getSignedUrl = async (fileKey: string, expiresIn = 3600): Promise<string> => {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey });
    return awsGetSignedUrl(s3, command, { expiresIn });
};

/**
 * Upload plusieurs fichiers en parallèle.
 */
export const uploadMultipleToSpaces = async (
    files: Express.Multer.File[],
    folder: string = 'uploads'
): Promise<string[]> => {
    return Promise.all(files.map(file => uploadToSpaces(file, folder)));
};

/**
 * Multer configuré en mémoire (requis pour l'upload vers Spaces).
 * Réexporté pour compatibilité avec le code existant.
 */
export const multerMemoryStorage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10 MB
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const allowed = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Type de fichier non autorisé : ${file.mimetype}`));
        }
    },
});

export default {
    uploadToSpaces,
    deleteFromSpaces,
    getSignedUrl,
    multerMemoryStorage,
    uploadMultipleToSpaces,
};
