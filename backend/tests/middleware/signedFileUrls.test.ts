/**
 * Branchement des liens signés sur l'API (middleware/signedFileUrls.ts) — audit S7.
 */
import request from 'supertest';
import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import {
    signFileUrlsInResponses, stripFileUrlSignatures, serveUploadsWithSignature, uploadNotFound,
} from '../../middleware/signedFileUrls';

// Mini serveur : même ordre de montage que index.ts.
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-uploads-'));
fs.mkdirSync(path.join(uploadsDir, 'receipts'));
fs.mkdirSync(path.join(uploadsDir, 'properties'));
fs.writeFileSync(path.join(uploadsDir, 'receipts', 'q.pdf'), 'PDF');
fs.writeFileSync(path.join(uploadsDir, 'properties', 'lot.jpg'), 'JPG');

let received: unknown = null;
const app = express();
app.use(express.json());
app.use('/uploads', serveUploadsWithSignature, express.static(uploadsDir), uploadNotFound);
app.use('/api', stripFileUrlSignatures, signFileUrlsInResponses);
app.get('/api/locataire', (_req, res) => res.json({
    nom: 'AGOSSA',
    photo_piece_url: '/uploads/documents/id.jpg',
    photo_bien: '/uploads/properties/lot.jpg',
}));
app.post('/api/locataire', (req, res) => { received = req.body; res.json({ ok: true }); });
app.get('/api/statut', (_req, res) => res.status(404).json({ message: 'introuvable' }));

afterAll(() => fs.rmSync(uploadsDir, { recursive: true, force: true }));
afterEach(() => { delete process.env.FILE_URLS_ENFORCE; });

describe('réponses de l’API', () => {
    it('signe les liens privés, laisse les photos des biens et le reste', async () => {
        const res = await request(app).get('/api/locataire');

        expect(res.status).toBe(200);
        expect(res.body.nom).toBe('AGOSSA');
        expect(res.body.photo_piece_url).toMatch(/^\/uploads\/documents\/id\.jpg\?exp=\d+&sig=[\w-]{22}$/);
        expect(res.body.photo_bien).toBe('/uploads/properties/lot.jpg');
    });

    it('conserve le code HTTP des réponses d’erreur', async () => {
        const res = await request(app).get('/api/statut');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: 'introuvable' });
    });
});

describe('données reçues', () => {
    it('retire la signature d’un lien renvoyé par un formulaire avant enregistrement', async () => {
        const signed = (await request(app).get('/api/locataire')).body.photo_piece_url;
        await request(app).post('/api/locataire').send({ photo_piece_url: signed, nom: 'X', photos: [signed] });

        expect(received).toEqual({
            photo_piece_url: '/uploads/documents/id.jpg',
            nom: 'X',
            photos: ['/uploads/documents/id.jpg'],
        });
    });
});

describe('fichiers /uploads', () => {
    it('ÉTAPE 1 (vérification désactivée) : un lien non signé fonctionne toujours', async () => {
        const res = await request(app).get('/uploads/receipts/q.pdf');
        expect(res.status).toBe(200);
    });

    it('ÉTAPE 1 : un lien signé fonctionne aussi (le paramètre est simplement ignoré)', async () => {
        const signed = (await request(app).get('/api/locataire')).body.photo_piece_url as string;
        const q = signed.split('?')[1];
        const res = await request(app).get(`/uploads/receipts/q.pdf?${q}`);
        expect(res.status).toBe(200);
    });

    describe('ÉTAPE 3 (FILE_URLS_ENFORCE=true)', () => {
        beforeEach(() => { process.env.FILE_URLS_ENFORCE = 'true'; });

        it('refuse un fichier privé sans signature (403)', async () => {
            const res = await request(app).get('/uploads/receipts/q.pdf');
            expect(res.status).toBe(403);
        });

        it('sert un fichier privé avec une signature valide, sans cache partagé', async () => {
            const { signUploadPath } = await import('../../utils/signedFiles');
            const res = await request(app).get(signUploadPath('/uploads/receipts/q.pdf'));
            expect(res.status).toBe(200);
            expect(res.headers['cache-control']).toBe('private, max-age=3600');
        });

        it('refuse une signature d’un autre fichier', async () => {
            const { signUploadPath } = await import('../../utils/signedFiles');
            const q = signUploadPath('/uploads/receipts/autre.pdf').split('?')[1];
            const res = await request(app).get(`/uploads/receipts/q.pdf?${q}`);
            expect(res.status).toBe(403);
        });

        it('laisse les photos des biens publiques', async () => {
            const res = await request(app).get('/uploads/properties/lot.jpg');
            expect(res.status).toBe(200);
        });
    });
});

// Erreurs lisibles : un fichier ouvert dans un onglet ne doit plus afficher du JSON brut.
const BROWSER = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
describe('erreurs de /uploads', () => {
    it('fichier absent, navigateur : page HTML « Fichier introuvable » (404)', async () => {
        const res = await request(app).get('/uploads/receipts/perdu.pdf').set('Accept', BROWSER);
        expect(res.status).toBe(404);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('Fichier introuvable');
        expect(res.text).not.toContain('Route not found');
    });

    it('fichier absent, client d’API : JSON (404)', async () => {
        const res = await request(app).get('/uploads/receipts/perdu.pdf').set('Accept', 'application/json');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: 'Fichier introuvable.' });
    });

    it('photo de bien absente : même page 404 (le repli « image cassée » du site reste déclenché)', async () => {
        const res = await request(app).get('/uploads/properties/perdu.jpg').set('Accept', 'image/avif,image/webp,*/*');
        expect(res.status).toBe(404);
    });

    describe('lien refusé (FILE_URLS_ENFORCE=true)', () => {
        beforeEach(() => { process.env.FILE_URLS_ENFORCE = 'true'; });

        it('navigateur : page HTML « Ce lien a expiré » (403), sans cache', async () => {
            const res = await request(app).get('/uploads/receipts/q.pdf').set('Accept', BROWSER);
            expect(res.status).toBe(403);
            expect(res.text).toContain('Ce lien a expiré');
            expect(res.headers['cache-control']).toBe('no-store');
        });

        it('client d’API : JSON (403)', async () => {
            const res = await request(app).get('/uploads/receipts/q.pdf').set('Accept', 'application/json');
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Lien expiré ou invalide/);
        });

        it('le chemin demandé n’est jamais recopié dans la page', async () => {
            const res = await request(app).get('/uploads/receipts/%3Cscript%3Ealert(1)%3C%2Fscript%3E.pdf').set('Accept', BROWSER);
            expect(res.status).toBe(403);
            expect(res.text).not.toMatch(/<script>/i);
        });
    });
});
