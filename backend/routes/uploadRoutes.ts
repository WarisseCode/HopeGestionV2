// backend/routes/uploadRoutes.ts
//
// Route d'upload centralisée.
// - Production (Spaces configuré) : les fichiers sont envoyés vers Digital Ocean Spaces (S3).
// - Développement (Spaces absent)  : les fichiers sont sauvegardés sur disque local en fallback.
//   Le disque local est éphémère sur Render — ne JAMAIS compter dessus en production.

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs-extra';
import { upload, verifyMagicBytes } from '../middleware/uploadMiddleware';
import { uploadToSpaces } from '../services/spacesUploadService';

const router = Router();

// Détecte si les credentials Spaces sont configurés
const spacesConfigured = !!(
    process.env.SPACES_KEY &&
    process.env.SPACES_SECRET &&
    process.env.SPACES_ENDPOINT &&
    process.env.SPACES_BUCKET
);

if (!spacesConfigured) {
    console.warn('⚠️  [UPLOAD] SPACES_KEY / SPACES_SECRET non configurés — fallback stockage disque local (dev uniquement).');
}

/**
 * Détermine le sous-dossier Spaces selon le type de fichier déclaré dans le body.
 */
const resolveFolder = (req: Request, file: Express.Multer.File): string => {
    const type = (req.body?.type as string) || '';
    const fieldname = file.fieldname;

    if (type === 'property'   || fieldname === 'propertyImages') return 'properties';
    if (type === 'avatar'     || fieldname === 'avatar')         return 'avatars';
    if (type === 'document'   || fieldname === 'document')       return 'documents';
    if (type === 'inventory'  || fieldname === 'inventory')      return 'inventories';
    if (type === 'expense'    || fieldname === 'proof')          return 'expenses';
    return 'others';
};

/**
 * POST /api/upload
 * Accepte un ou plusieurs fichiers dans n'importe quel champ (upload.any()).
 * Renvoie la liste des URLs accessibles.
 */
router.post('/', upload.any(), verifyMagicBytes, async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Aucun fichier uploadé.' });
        }

        const uploadedFiles: { originalName: string; filename: string; path: string; mimetype: string; size: number }[] = [];

        for (const file of files) {
            const folder = resolveFolder(req, file);

            if (spacesConfigured) {
                // ── Prod : upload vers Digital Ocean Spaces ──────────────────
                const url = await uploadToSpaces(file, folder);
                uploadedFiles.push({
                    originalName: file.originalname,
                    filename:     path.basename(url),
                    path:         url,
                    mimetype:     file.mimetype,
                    size:         file.size,
                });
            } else {
                // ── Dev : fallback disque local ───────────────────────────────
                const localDir = path.join(__dirname, '../../uploads', folder);
                await fs.ensureDir(localDir);

                const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${path.extname(file.originalname)}`;
                const localPath  = path.join(localDir, uniqueName);
                await fs.writeFile(localPath, file.buffer);

                uploadedFiles.push({
                    originalName: file.originalname,
                    filename:     uniqueName,
                    path:         `/uploads/${folder}/${uniqueName}`,
                    mimetype:     file.mimetype,
                    size:         file.size,
                });
            }
        }

        res.status(200).json({
            message: 'Upload réussi',
            files:   uploadedFiles,
        });

    } catch (error: any) {
        console.error('❌ Upload error:', error);
        res.status(500).json({
            message: 'Erreur lors de l\'upload',
            error:   error.message,
        });
    }
});

export default router;
