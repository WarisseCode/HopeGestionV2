// backend/routes/deployRoutes.ts
// Webhook de déploiement : GitHub Actions appelle cet endpoint via HTTPS
// Le serveur exécute ensuite le script deploy.sh de façon totalement indépendante

import express, { Request, Response } from 'express';
import { spawn } from 'child_process';

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
    const token = req.headers['x-deploy-token'];

    if (!process.env.DEPLOY_TOKEN || token !== process.env.DEPLOY_TOKEN) {
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
