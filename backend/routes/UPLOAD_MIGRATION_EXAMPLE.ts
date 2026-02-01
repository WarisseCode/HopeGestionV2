/**
 * Example: How to update existing upload routes to use Digital Ocean Spaces
 * 
 * This file shows how to migrate from local file storage to Spaces
 */

import { Router } from 'express';
import { uploadToSpaces, deleteFromSpaces, multerMemoryStorage } from '../services/spacesUploadService';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// ============================================
// EXAMPLE 1: Single File Upload (Profile Photo)
// ============================================

// OLD CODE (Local Storage):
/*
import multer from 'multer';
const upload = multer({ dest: 'uploads/profiles/' });

router.post('/upload-profile-photo', protect, upload.single('photo'), async (req, res) => {
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    // Save photoUrl to database
});
*/

// NEW CODE (Spaces):
router.post('/upload-profile-photo', 
    protect,
    multerMemoryStorage.single('photo'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            // Upload to Spaces
            const photoUrl = await uploadToSpaces(req.file, 'profiles');
            
            // Save photoUrl to database
            // await pool.query('UPDATE users SET photo_url = $1 WHERE id = $2', [photoUrl, userId]);
            
            res.json({ 
                message: 'Photo uploaded successfully',
                url: photoUrl 
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
);

// ============================================
// EXAMPLE 2: Multiple Files Upload (Property Photos)
// ============================================

// NEW CODE (Spaces):
router.post('/upload-property-photos',
    protect,
    multerMemoryStorage.array('photos', 10), // Max 10 files
    async (req, res) => {
        try {
            if (!req.files || !Array.isArray(req.files)) {
                return res.status(400).json({ message: 'No files uploaded' });
            }

            // Upload all files to Spaces
            const uploadPromises = req.files.map(file => 
                uploadToSpaces(file, 'properties')
            );
            
            const photoUrls = await Promise.all(uploadPromises);
            
            // Save photoUrls to database
            // await pool.query('UPDATE buildings SET photos = $1 WHERE id = $2', [photoUrls, buildingId]);
            
            res.json({ 
                message: 'Photos uploaded successfully',
                urls: photoUrls 
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
);

// ============================================
// EXAMPLE 3: Delete File from Spaces
// ============================================

router.delete('/delete-photo', protect, async (req, res) => {
    try {
        const { photoUrl } = req.body;
        
        if (!photoUrl) {
            return res.status(400).json({ message: 'Photo URL required' });
        }

        // Delete from Spaces
        const deleted = await deleteFromSpaces(photoUrl);
        
        if (deleted) {
            // Remove from database
            // await pool.query('UPDATE users SET photo_url = NULL WHERE id = $1', [userId]);
            
            res.json({ message: 'Photo deleted successfully' });
        } else {
            res.status(500).json({ message: 'Failed to delete photo' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Delete failed' });
    }
});

// ============================================
// EXAMPLE 4: Document Upload (PDF, etc.)
// ============================================

router.post('/upload-document',
    protect,
    multerMemoryStorage.single('document'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No document uploaded' });
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(req.file.mimetype)) {
                return res.status(400).json({ message: 'Invalid file type' });
            }

            // Upload to Spaces
            const documentUrl = await uploadToSpaces(req.file, 'documents');
            
            res.json({ 
                message: 'Document uploaded successfully',
                url: documentUrl 
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ message: 'Upload failed' });
        }
    }
);

export default router;

// ============================================
// MIGRATION CHECKLIST
// ============================================

/*
Routes to update in your application:

1. User Profile Photos:
   - POST /api/auth/upload-photo
   - PUT /api/users/:id/photo

2. Property/Building Photos:
   - POST /api/biens/immeubles (with photos)
   - PUT /api/biens/immeubles/:id (update photos)
   - POST /api/biens/lots (with photos)

3. Tenant Documents:
   - POST /api/locataires (with ID documents)
   - PUT /api/locataires/:id (update documents)

4. Lease Documents:
   - POST /api/locations (with contract PDF)
   - Generated PDFs should be uploaded to Spaces

5. Payment Receipts:
   - POST /api/paiements (with receipt images)

Steps for each route:
1. Replace local multer storage with multerMemoryStorage
2. Replace file.path with uploadToSpaces(file, 'folder-name')
3. Update database to store Spaces URL instead of local path
4. Add error handling for upload failures
5. Test thoroughly before deploying
*/
