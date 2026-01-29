// backend/routes/uploadRoutes.ts

import { Router, Request, Response } from 'express';
import { upload } from '../middleware/uploadMiddleware';
import path from 'path';

const router = Router();

/**
 * POST /api/upload
 * Acccepte un champ 'file' (unique) ou 'files' (multiple)
 */
router.post('/', upload.any(), (req: Request, res: Response) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ message: 'Aucun fichier uploadé.' });
        }

        const files = req.files as Express.Multer.File[];
        
        // Formater la réponse pour le frontend
        const uploadedFiles = files.map(file => {
            // Convertir le chemin absolu en URL relative accessible
            // Windows path separator needs to be replaced
            const parts = file.path.split('uploads');
            const relativePart = parts.length > 1 ? parts[1] : `/${file.filename}`;
            // Use fallback empty string if somehow undefined (though logic above prevents it)
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
