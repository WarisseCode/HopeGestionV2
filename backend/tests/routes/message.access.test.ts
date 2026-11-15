/**
 * Tests — messagerie de tâche (audit 2026-11-14, constat S5).
 *
 * Avant : tout compte connecté pouvait envoyer un e-mail/WhatsApp au nom de Hope à
 * n'importe quel recipient_id, contenu HTML non échappé ; et la lecture filtrait sur
 * sender/recipient, si bien que l'autre participant ne voyait jamais les messages.
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../db/database', () => ({
    __esModule: true,
    default: { query: jest.fn(), connect: jest.fn() },
}));
jest.mock('../../services/WhatsAppService', () => ({ WhatsAppService: { send: jest.fn() } }));
jest.mock('../../services/EmailService', () => ({ __esModule: true, default: { sendEmail: jest.fn() } }));

import pool from '../../db/database';
import EmailService from '../../services/EmailService';
import { WhatsAppService } from '../../services/WhatsAppService';
import messageRoutes from '../../routes/messageRoutes';

const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

const JWT_SECRET = process.env.JWT_SECRET!;
const token = (id: number, role = 'gestionnaire') => jwt.sign({ id, role, userType: role }, JWT_SECRET, { expiresIn: '1h' });
const q = pool.query as jest.Mock;
const mockAuth = () => q.mockResolvedValueOnce({ rows: [{ email: 'x@y.z' }] });
// Tâche 5 : créée par 1, assignée à 2
const mockTask = (rows: any[] = [{ created_by: 1, assigned_to: 2 }]) => q.mockResolvedValueOnce({ rows });

const post = (userId: number, body: any, role = 'gestionnaire') =>
    request(app).post('/api/messages').set('Authorization', `Bearer ${token(userId, role)}`).send(body);
const get = (userId: number, qs: string, role = 'gestionnaire') =>
    request(app).get(`/api/messages${qs}`).set('Authorization', `Bearer ${token(userId, role)}`);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/messages', () => {
    it('participant (assigné) : message enregistré', async () => {
        mockAuth(); mockTask();
        q.mockResolvedValueOnce({ rows: [{ id: 99 }] });

        const res = await post(2, { context_type: 'task', context_id: 5, content: 'Fait' });

        expect(res.status).toBe(201);
        const [sql, params] = q.mock.calls[2];
        expect(sql).toContain('INSERT INTO messages');
        expect(params.slice(0, 5)).toEqual([2, null, 'task', 5, 'internal']);
    });

    it('non-participant (ex. locataire quelconque) : 403, rien enregistré ni envoyé', async () => {
        mockAuth(); mockTask();

        const res = await post(7, { context_type: 'task', context_id: 5, recipient_id: 1, channel: 'email', content: 'Payez ici' }, 'locataire');

        expect(res.status).toBe(403);
        expect(q.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO messages'))).toBe(false);
        expect(EmailService.sendEmail).not.toHaveBeenCalled();
    });

    it('destinataire hors tâche : 403, aucun e-mail envoyé', async () => {
        mockAuth(); mockTask();

        const res = await post(1, { context_type: 'task', context_id: 5, recipient_id: 42, channel: 'email', content: 'x' });

        expect(res.status).toBe(403);
        expect(EmailService.sendEmail).not.toHaveBeenCalled();
    });

    it("e-mail à l'autre participant : contenu HTML échappé", async () => {
        mockAuth(); mockTask();
        q.mockResolvedValueOnce({ rows: [{ id: 99 }] });                                  // INSERT
        q.mockResolvedValueOnce({ rows: [{ id: 2, email: 'b@x.y', telephone: null }] }); // destinataire

        const res = await post(1, { context_type: 'task', context_id: 5, recipient_id: 2, channel: 'email', content: '<a href="http://x">clic</a>\nok' });

        expect(res.status).toBe(201);
        const html = (EmailService.sendEmail as jest.Mock).mock.calls[0][3];
        expect(html).toBe('<p>&lt;a href=&quot;http://x&quot;&gt;clic&lt;/a&gt;<br/>ok</p>');
    });

    it('tâche inexistante : 404', async () => {
        mockAuth(); mockTask([]);

        const res = await post(1, { context_type: 'task', context_id: 5, content: 'x' });

        expect(res.status).toBe(404);
    });

    it('contexte non pris en charge ou absent : 400', async () => {
        mockAuth();
        const res1 = await post(1, { context_type: 'general', context_id: 5, content: 'x' });
        mockAuth();
        const res2 = await post(1, { content: 'x', recipient_id: 2, channel: 'whatsapp' });

        expect(res1.status).toBe(400);
        expect(res2.status).toBe(400);
        expect(WhatsAppService.send).not.toHaveBeenCalled();
    });

    it('admin : peut écrire dans une tâche dont il ne participe pas', async () => {
        mockAuth(); mockTask();
        q.mockResolvedValueOnce({ rows: [{ id: 99 }] });

        const res = await post(100, { context_type: 'task', context_id: 5, content: 'x' }, 'admin');

        expect(res.status).toBe(201);
    });
});

describe('GET /api/messages', () => {
    it('participant : toute la conversation (plus de filtre sender/recipient)', async () => {
        mockAuth(); mockTask();
        q.mockResolvedValueOnce({ rows: [{ id: 1, sender_id: 1 }, { id: 2, sender_id: 2 }] });

        const res = await get(2, '?context_type=task&context_id=5');

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        const [sql, params] = q.mock.calls[2];
        expect(sql).not.toContain('sender_id = $3');
        expect(params).toEqual(['task', '5']);
    });

    it('non-participant : 403', async () => {
        mockAuth(); mockTask();

        const res = await get(7, '?context_type=task&context_id=5');

        expect(res.status).toBe(403);
    });

    it('paramètres manquants ou invalides : 400', async () => {
        mockAuth();
        const r1 = await get(1, '?context_type=task');
        mockAuth();
        const r2 = await get(1, '?context_type=task&context_id=abc');

        expect(r1.status).toBe(400);
        expect(r2.status).toBe(400);
    });
});
