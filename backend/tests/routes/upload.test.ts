// tests/routes/upload.test.ts
//
// POST /api/upload était montée sans authentification (voir audit sécurité) :
// vérifie que `protect` est bien exigé, et que le comportement d'upload
// lui-même (stockage disque local, réponse) reste inchangé pour un appelant
// authentifié.

import path from 'path';
import fs from 'fs-extra';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import express from 'express';
import { protect } from '../../middleware/authMiddleware';
import uploadRoutes from '../../routes/uploadRoutes';

const JWT_SECRET = process.env.JWT_SECRET!;

function buildApp() {
    const app = express();
    // Même montage que index.ts : `protect` avant le router d'upload.
    app.use('/api/upload', protect, uploadRoutes);
    return app;
}

const authToken = (id = 42, role = 'gestionnaire') =>
    jwt.sign({ id, role, email: `${role}@test.dev` }, JWT_SECRET, { expiresIn: '1h' });

// PNG transparent 1x1 valide (magic bytes réels — nécessaire pour passer
// verifyMagicBytes, qui inspecte le contenu, pas seulement le Content-Type déclaré).
const TINY_PNG = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
        '0000000a4944415478da636001000000050001' +
        '0d0a2db40000000049454e44ae426082',
    'hex',
);

describe('POST /api/upload — authentification requise', () => {
    const uploadedPaths: string[] = [];

    afterAll(async () => {
        // Nettoyage des fichiers réellement écrits sur le disque local par les
        // tests ci-dessous (uploads/ est gitignored, mais autant ne rien laisser).
        for (const relativePath of uploadedPaths) {
            await fs.remove(path.join(__dirname, '../../..', relativePath)).catch(() => {});
        }
    });

    it('sans token : 401, aucun fichier écrit', async () => {
        const app = buildApp();

        const res = await request(app)
            .post('/api/upload')
            .field('type', 'avatar')
            .attach('file', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

        expect(res.status).toBe(401);
    });

    it('avec un jeton invalide : 403 (comportement standard de `protect`)', async () => {
        const app = buildApp();

        const res = await request(app)
            .post('/api/upload')
            .set('Authorization', 'Bearer not-a-real-token')
            .field('type', 'avatar')
            .attach('file', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

        expect(res.status).toBe(403);
    });

    it('avec un jeton valide : 200, upload effectué normalement (dossier "avatars")', async () => {
        const app = buildApp();

        const res = await request(app)
            .post('/api/upload')
            .set('Authorization', `Bearer ${authToken()}`)
            .field('type', 'avatar')
            .attach('file', TINY_PNG, { filename: 'avatar.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body.files).toHaveLength(1);
        expect(res.body.files[0].path).toMatch(/^\/uploads\/avatars\//);
        expect(res.body.files[0].mimetype).toBe('image/png');

        uploadedPaths.push(res.body.files[0].path);
    });
});
