/**
 * Tests — createMobileAuthCorsGate (backend/middleware/mobileAuthCorsGate.ts)
 * Vérifie que /api/auth/mobile/* n'est jamais soumis à la logique CORS, et que
 * toute requête y portant un en-tête Origin est rejetée en 403, sans en-tête
 * Access-Control-*. Le reste du trafic passe par un vrai middleware `cors`,
 * configuré comme en production (une origine autorisée de test).
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { createMobileAuthCorsGate } from '../../middleware/mobileAuthCorsGate';

const ALLOWED_ORIGIN = 'https://allowed.test';

const corsMiddleware = cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin === ALLOWED_ORIGIN) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
});

const app = express();
app.use(express.json());
app.use(createMobileAuthCorsGate(corsMiddleware));
app.post('/api/auth/login', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/mobile/login', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/mobile', (_req, res) => res.json({ ok: true }));
app.post('/api/auth/mobilex', (_req, res) => res.json({ ok: true }));
app.options('/api/auth/mobile/refresh', (_req, res) => res.status(204).end());
// Handler d'erreur CORS, identique dans l'esprit à celui d'index.ts
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS Error' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
});

function hasAnyAccessControlHeader(headers: Record<string, unknown>): boolean {
    return Object.keys(headers).some(h => h.toLowerCase().startsWith('access-control-'));
}

describe('createMobileAuthCorsGate', () => {
    it('POST /api/auth/login avec origine autorisée → Access-Control-Allow-Origin présent', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Origin', ALLOWED_ORIGIN)
            .send({});

        expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });

    it('POST /api/auth/mobile/login sans Origin → aucun en-tête Access-Control-*, handler atteint', async () => {
        const res = await request(app).post('/api/auth/mobile/login').send({});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect(hasAnyAccessControlHeader(res.headers)).toBe(false);
    });

    it('POST /api/auth/mobile/login avec origine autorisée → 403 { message: "Origine non autorisée." }', async () => {
        const res = await request(app)
            .post('/api/auth/mobile/login')
            .set('Origin', ALLOWED_ORIGIN)
            .send({});

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ message: 'Origine non autorisée.' });
        expect(hasAnyAccessControlHeader(res.headers)).toBe(false);
    });

    it('OPTIONS /API/AUTH/MOBILE/refresh avec Origin → 403, aucun en-tête Access-Control-*', async () => {
        const res = await request(app)
            .options('/API/AUTH/MOBILE/refresh')
            .set('Origin', ALLOWED_ORIGIN)
            .set('Access-Control-Request-Method', 'POST');

        expect(res.status).toBe(403);
        expect(hasAnyAccessControlHeader(res.headers)).toBe(false);
    });

    it('POST /api/auth/mobile (sans slash final) avec Origin → 403', async () => {
        const res = await request(app)
            .post('/api/auth/mobile')
            .set('Origin', ALLOWED_ORIGIN)
            .send({});

        expect(res.status).toBe(403);
        expect(res.body).toEqual({ message: 'Origine non autorisée.' });
    });

    it('POST /api/auth/mobilex avec origine autorisée → pas intercepté par la garde, CORS normal', async () => {
        const res = await request(app)
            .post('/api/auth/mobilex')
            .set('Origin', ALLOWED_ORIGIN)
            .send({});

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
        expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    });
});
