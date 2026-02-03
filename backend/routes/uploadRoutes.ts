// backend/routes/uploadRoutes.ts

import { Router, Request, Response } from 'express';
import { upload, isCloudStorage } from '../middleware/uploadMiddleware';
import { uploadToSpaces, uploadMultipleToSpaces } from '../services/spacesUploadService';
import path from 'path';

const router = Router();

/**
 * POST /api/upload
 * Accepte un champ 'file' (unique) ou 'files' (multiple)
 * En production: Upload vers Digital Ocean Spaces
 * En dev: Upload vers le disque local
 */
router.post('/', upload.any(), async (req: Request, res: Response) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ message: 'Aucun fichier uploadé.' });
        }

        const files = req.files as Express.Multer.File[];
        let uploadedFiles: any[] = [];

        if (isCloudStorage) {
            // Production: Upload to Digital Ocean Spaces
            console.log('📤 Uploading to cloud storage...');
            
            for (const file of files) {
                // Determine folder based on type
                let folder = 'others';
                if (req.body.type === 'property' || file.fieldname === 'propertyImages') {
                    folder = 'properties';
                } else if (req.body.type === 'avatar' || file.fieldname === 'avatar') {
                    folder = 'avatars';
                } else if (req.body.type === 'document') {
                    folder = 'documents';
                } else if (req.body.type === 'inventory') {
                    folder = 'inventories';
                }

                const cloudUrl = await uploadToSpaces(file, folder);
                uploadedFiles.push({
                    originalName: file.originalname,
                    filename: path.basename(cloudUrl),
                    path: cloudUrl,
                    mimetype: file.mimetype,
                    size: file.size
                });
            }
            console.log(`✅ Uploaded ${uploadedFiles.length} files to cloud`);
        } else {
            // Development: Files are already saved to disk by multer
            uploadedFiles = files.map(file => {
                const parts = file.path.split('uploads');
                const relativePart = parts.length > 1 ? parts[1] : `/${file.filename}`;
                const safeRelativePart = relativePart || `/${file.filename}`;
                const relativePath = safeRelativePart.replace(/\\/g, '/');
                return {
                    originalName: file.originalname,
                    filename: file.filename,
                    path: `/uploads${relativePath}`,
                    mimetype: file.mimetype,
                    size: file.size
                };
            });
        }

        res.status(200).json({
            message: 'Upload réussi',
            files: uploadedFiles
        });

    } catch (error: any) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ 
            message: 'Erreur lors de l\'upload', 
            error: error.message 
        });
    }
});

export default router;
