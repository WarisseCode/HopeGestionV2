/**
 * Tests — POST /api/upload : un refus de multer doit répondre 400, pas 500.
 * (Constat relevé pendant la vérification de la mise à jour des dépendances, T-090.)
 */

import request from 'supertest';
import express from 'express';

jest.mock('../../services/spacesUploadService', () => ({ uploadToSpaces: jest.fn() }));
jest.mock('fs-extra', () => ({ ensureDir: jest.fn(), writeFile: jest.fn() }));

import uploadRoutes from '../../routes/uploadRoutes';

const app = express();
app.use('/api/upload', uploadRoutes);

const PNG_1PX = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

describe('POST /api/upload', () => {
    it('fichier de plus de 10 Mo → 400 avec un message clair', async () => {
        const res = await request(app)
            .post('/api/upload')
            .attach('file', Buffer.alloc(11 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/10 Mo/);
    });

    it('format refusé (Word) → 400', async () => {
        const res = await request(app)
            .post('/api/upload')
            .attach('file', Buffer.from('x'), { filename: 'a.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        expect(res.status).toBe(400);
    });

    it('vrai PNG → 200 (comportement inchangé)', async () => {
        const res = await request(app)
            .post('/api/upload')
            .field('type', 'property')
            .attach('file', PNG_1PX, { filename: 'pixel.png', contentType: 'image/png' });

        expect(res.status).toBe(200);
        expect(res.body.files[0].path).toMatch(/^\/uploads\/properties\/.+\.png$/);
    });
});
