// backend/routes/invitationRoutes.ts
import { Router, Request, Response } from 'express';
import pool from '../db/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/authMiddleware';
import { validatePassword } from '../utils/passwordUtils';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── POST /api/invitations ─────────────────────────────────────────────────
// Génère un lien d'invitation — aucun formulaire requis côté gestionnaire.
// L'entité (owner ou tenant) est créée à l'acceptation par le destinataire.
router.post('/', protect, async (req: Request, res: Response) => {
  const { type } = req.body;
  const gestionnaire_id = (req as any).user?.id;

  if (!gestionnaire_id) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!type || !['owner', 'tenant'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide. Valeurs acceptées : owner, tenant' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO invitations (type, gestionnaire_id)
       VALUES ($1, $2)
       RETURNING token, expires_at`,
      [type, gestionnaire_id]
    );

    const { token, expires_at } = result.rows[0];
    const link = `${FRONTEND_URL}/invitation/${token}`;

    return res.status(201).json({ token, link, expires_at });
  } catch (err) {
    console.error('Erreur création invitation:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── GET /api/invitations/validate/:token ─────────────────────────────────
// Route publique — valide le token et retourne le contexte pour InvitationPage
router.get('/validate/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT i.id, i.type, i.expires_at, i.accepted_at,
              u.nom AS gestionnaire_nom
       FROM invitations i
       JOIN users u ON i.gestionnaire_id = u.id
       WHERE i.token = $1`,
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Invitation introuvable' });
    }

    const inv = result.rows[0];

    if (inv.accepted_at) {
      return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' });
    }
    if (new Date(inv.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Cette invitation a expiré' });
    }

    return res.json({
      type: inv.type,
      gestionnaire_nom: inv.gestionnaire_nom,
      expires_at: inv.expires_at
    });
  } catch (err) {
    console.error('Erreur validation invitation:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/invitations/:token/accept ──────────────────────────────────
// Route publique — le destinataire remplit le formulaire complet.
// Crée l'entité (owner ou tenant) + le compte utilisateur en une transaction.
router.post('/:token/accept', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { nom, prenoms, telephone, email, adresse, ville, type_proprietaire, password } = req.body;

  if (!nom || !telephone || !password) {
    return res.status(400).json({ error: 'Nom, téléphone et mot de passe sont requis' });
  }
  const pwdCheck = validatePassword(password);
  if (!pwdCheck.isValid) {
    return res.status(400).json({ error: pwdCheck.message });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invResult = await client.query(
      `SELECT i.*, u.id AS gest_user_id FROM invitations i
       JOIN users u ON i.gestionnaire_id = u.id
       WHERE i.token = $1 FOR UPDATE`,
      [token]
    );

    if (invResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invitation introuvable' });
    }

    const inv = invResult.rows[0];

    if (inv.accepted_at) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Cette invitation a déjà été utilisée' });
    }
    if (new Date(inv.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ error: 'Cette invitation a expiré' });
    }

    const role = inv.type === 'owner' ? 'proprietaire' : 'locataire';
    const password_hash = await bcrypt.hash(password, 10);
    const fullName = `${nom}${prenoms ? ' ' + prenoms : ''}`;

    // Créer le compte utilisateur
    const userResult = await client.query(
      `INSERT INTO users (nom, email, telephone, password_hash, user_type, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $5, true)
       RETURNING id, nom, email, telephone, role`,
      [fullName, email || null, telephone, password_hash, role]
    );
    const newUser = userResult.rows[0];

    if (inv.type === 'owner') {
      // Créer l'owner avec toutes les informations fournies
      const ownerResult = await client.query(
        `INSERT INTO owners (name, first_name, phone, email, address, city, type, management_mode, manager_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'delegated', 'AG-' || upper(substring(md5(random()::text), 1, 6)))
         RETURNING id`,
        [
          nom,
          prenoms || null,
          telephone,
          email || null,
          adresse || null,
          ville || null,
          type_proprietaire || 'individual'
        ]
      );
      const owner_id = ownerResult.rows[0].id;

      // Lier le nouvel utilisateur à l'owner (rôle owner)
      await client.query(
        `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
         VALUES ($1, $2, 'owner', CURRENT_DATE, true)
         ON CONFLICT (owner_id, user_id) DO NOTHING`,
        [owner_id, newUser.id]
      );

      // Lier le gestionnaire à l'owner (rôle gestionnaire)
      await client.query(
        `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
         VALUES ($1, $2, 'gestionnaire', CURRENT_DATE, true)
         ON CONFLICT (owner_id, user_id) DO NOTHING`,
        [owner_id, inv.gestionnaire_id]
      );

      // Mettre à jour l'invitation avec l'owner créé
      await client.query(
        `UPDATE invitations SET owner_id = $1 WHERE id = $2`,
        [owner_id, inv.id]
      );
    }

    if (inv.type === 'tenant') {
      // Trouver le premier owner du gestionnaire
      const ownerRes = await client.query(
        `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [inv.gestionnaire_id]
      );
      const tenant_owner_id = ownerRes.rows[0]?.owner_id || null;

      // Définir le contexte RLS requis par les politiques de sécurité
      await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [inv.gestionnaire_id.toString()]);
      if (tenant_owner_id) {
        await client.query(`SELECT set_config('app.current_owner_id', $1, true)`, [tenant_owner_id.toString()]);
      }

      const tenantCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await client.query(
        `INSERT INTO tenants (nom, prenoms, email, telephone_principal, adresse_actuelle, owner_id, user_id, invitation_code, statut, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Actif', 'Locataire')`,
        [nom, prenoms || null, email || null, telephone, adresse || null, tenant_owner_id, newUser.id, tenantCode]
      );
    }

    await client.query(`UPDATE invitations SET accepted_at = NOW() WHERE id = $1`, [inv.id]);
    await client.query('COMMIT');

    const accessToken = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: newUser.id, nom: newUser.nom, email: newUser.email, telephone: newUser.telephone, role: newUser.role }
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un compte avec cet email ou téléphone existe déjà' });
    }
    console.error('Erreur acceptation invitation:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

export default router;
