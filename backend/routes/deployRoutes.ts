// backend/routes/deployRoutes.ts
// Webhook de déploiement : GitHub Actions appelle cet endpoint via HTTPS
// Le serveur exécute ensuite le script deploy.sh de façon totalement indépendante

import express, { Request, Response } from 'express';
import { spawn } from 'child_process';
import crypto from 'crypto';

const router = express.Router();

// Comparaison à temps constant : une comparaison `!==` classique fuit la position
// du premier caractère différent via le timing, ce qui compte pour un secret qui
// déclenche l'exécution de code serveur.
function safeTokenCompare(received: string, expected: string): boolean {
    const receivedBuf = Buffer.from(received);
    const expectedBuf = Buffer.from(expected);
    if (receivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

router.post('/', (req: Request, res: Response) => {
    const token = req.headers['x-deploy-token'];
    const expectedToken = process.env.DEPLOY_TOKEN;

    if (!expectedToken || typeof token !== 'string' || !safeTokenCompare(token, expectedToken)) {
        return res.status(403).json({ error: 'Token invalide' });
    }

    // Répondre immédiatement avant que PM2 redémarre le process
    res.json({ message: 'Déploiement lancé', timestamp: new Date().toISOString() });

    // detached + unref = le child process survit au redémarrage PM2
    const child = spawn('/bin/bash', ['/var/www/hopegestion/deploy.sh'], {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env }
    });
    child.unref();
});

export default router;
