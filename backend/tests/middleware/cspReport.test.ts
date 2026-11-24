/**
 * POST /api/csp-report — réception des rapports CSP des pages du site (audit S8).
 */
import request from 'supertest';
import express from 'express';
import { cspReportRouter, resetCspReportMemory } from '../../middleware/cspReport';

const app = express();
app.use(express.json());
app.use('/api/csp-report', cspReportRouter);

const legacy = (blocked: string) => ({
    'csp-report': {
        'document-uri': 'https://hopegestion.com/dashboard/locations?id=3',
        'effective-directive': 'script-src-elem',
        'blocked-uri': blocked,
    },
});

describe('POST /api/csp-report', () => {
    let warn: jest.SpyInstance;
    beforeEach(() => {
        resetCspReportMemory();
        warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => warn.mockRestore());

    it('format « report-uri » (application/csp-report) : 204 et une ligne de journal lisible', async () => {
        const res = await request(app).post('/api/csp-report')
            .set('Content-Type', 'application/csp-report')
            .send(JSON.stringify(legacy('https://evil.example/x.js')));

        expect(res.status).toBe(204);
        expect(warn).toHaveBeenCalledTimes(1);
        const line = warn.mock.calls[0][0] as string;
        expect(line).toContain('[CSP]');
        expect(line).toContain('script-src-elem');
        expect(line).toContain('https://evil.example/x.js');
        expect(line).toContain('page=https://hopegestion.com/dashboard/locations');
        expect(line).not.toContain('id=3'); // paramètres de l'adresse retirés
    });

    it('format Reporting API (application/reports+json, tableau)', async () => {
        const res = await request(app).post('/api/csp-report')
            .set('Content-Type', 'application/reports+json')
            .send(JSON.stringify([{ type: 'csp-violation', body: { documentURL: 'https://hopegestion.com/', effectiveDirective: 'img-src', blockedURL: 'https://cdn.example/a.png' } }]));

        expect(res.status).toBe(204);
        expect(warn.mock.calls[0][0]).toContain('directive=img-src');
    });

    it('même infraction répétée : une seule ligne de journal (pas d’inondation)', async () => {
        for (let i = 0; i < 5; i++) {
            await request(app).post('/api/csp-report').set('Content-Type', 'application/csp-report').send(JSON.stringify(legacy('inline')));
        }
        expect(warn).toHaveBeenCalledTimes(1);
    });

    it('rapport vide ou mal formé : 204, rien de journalisé', async () => {
        const res = await request(app).post('/api/csp-report').set('Content-Type', 'application/csp-report').send('{}');
        expect(res.status).toBe(204);
        expect(warn).not.toHaveBeenCalled();
    });

    it('envoi de plus de 10 Ko refusé (413)', async () => {
        const res = await request(app).post('/api/csp-report')
            .set('Content-Type', 'application/csp-report')
            .send(JSON.stringify(legacy('x'.repeat(20_000))));
        expect(res.status).toBe(413);
        expect(warn).not.toHaveBeenCalled();
    });
});
