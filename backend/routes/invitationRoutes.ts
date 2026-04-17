// backend/routes/invitationRoutes.ts
import { Router, Request, Response } from 'express';
import pool from '../db/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/authMiddleware';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── POST /api/invitations ─────────────────────────────────────────────────
// Crée l'entité (owner ou tenant) + génère le lien d'invitation en une seule étape
// Pour type=owner : crée l'owner, puis l'invitation liée
// Pour type=tenant : stocke juste les infos dans l'invitation (tenant créé à l'acceptation)
router.post('/', protect, async (req: Request, res: Response) => {
  const { type, nom, prenom, telephone, email } = req.body;
  const gestionnaire_id = (req as any).user?.id;

  if (!gestionnaire_id) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  if (!type || !['owner', 'tenant'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide. Valeurs acceptées : owner, tenant' });
  }
  if (!nom || !telephone) {
    return res.status(400).json({ error: 'Nom et téléphone requis' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let resolved_owner_id: number | null = null;

    if (type === 'owner') {
      // Créer l'owner directement
      const ownerResult = await client.query(
        `INSERT INTO owners (name, first_name, phone, email, management_mode, manager_code)
         VALUES ($1, $2, $3, $4, 'delegated', 'AG-' || upper(substring(md5(random()::text), 1, 6)))
         RETURNING id`,
        [nom, prenom || null, telephone, email || null]
      );
      resolved_owner_id = ownerResult.rows[0].id;

      // Lier l'owner au gestionnaire dans owner_user
      await client.query(
        `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
         VALUES ($1, $2, 'gestionnaire', CURRENT_DATE, true)
         ON CONFLICT DO NOTHING`,
        [resolved_owner_id, gestionnaire_id]
      );
    }

    // Invalider les invitations précédentes non utilisées pour ce owner si type=owner
    if (resolved_owner_id) {
      await client.query(
        `UPDATE invitations SET expires_at = NOW()
         WHERE owner_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [resolved_owner_id]
      );
    }

    const result = await client.query(
      `INSERT INTO invitations (type, gestionnaire_id, owner_id, tenant_id, nom, prenom, telephone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING token, expires_at`,
      [type, gestionnaire_id, resolved_owner_id, null, nom, prenom || null, telephone, email || null]
    );

    await client.query('COMMIT');

    const { token, expires_at } = result.rows[0];
    const link = `${FRONTEND_URL}/invitation/${token}`;

    return res.status(201).json({ token, link, expires_at });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Un propriétaire avec ce numéro existe déjà' });
    }
    console.error('Erreur création invitation:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ─── GET /api/invitations/validate/:token ─────────────────────────────────
// Route publique — valide le token et retourne le contexte
router.get('/validate/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         i.id, i.type, i.expires_at, i.accepted_at,
         i.nom, i.prenom, i.email, i.telephone,
         u.nom AS gestionnaire_nom,
         o.name AS owner_name, o.first_name AS owner_first_name
       FROM invitations i
       JOIN users u ON i.gestionnaire_id = u.id
       LEFT JOIN owners o ON i.owner_id = o.id
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
      nom: inv.nom || inv.owner_name,
      prenom: inv.prenom || inv.owner_first_name,
      email: inv.email,
      telephone: inv.telephone,
      expires_at: inv.expires_at
    });
  } catch (err) {
    console.error('Erreur validation invitation:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── POST /api/invitations/:token/accept ──────────────────────────────────
// Route publique — crée le compte utilisateur et lie au tenant/owner
router.post('/:token/accept', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { nom, prenoms, email, telephone, password } = req.body;

  if (!nom || !password) {
    return res.status(400).json({ error: 'Nom et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
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
    const fullName = `${nom} ${prenoms || ''}`.trim();

    // Créer le compte utilisateur
    const userResult = await client.query(
      `INSERT INTO users (nom, email, telephone, password_hash, user_type, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $5, true)
       RETURNING id, nom, email, telephone, role`,
      [fullName, email || null, telephone || null, password_hash, role]
    );
    const newUser = userResult.rows[0];

    if (inv.type === 'owner' && inv.owner_id) {
      // Lier le nouvel utilisateur à l'owner déjà créé
      await client.query(
        `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
         VALUES ($1, $2, 'owner', CURRENT_DATE, true)
         ON CONFLICT (owner_id, user_id) DO NOTHING`,
        [inv.owner_id, newUser.id]
      );
      await client.query(
        `UPDATE owners SET email = COALESCE($1, email), phone = COALESCE($2, phone),
         first_name = COALESCE($3, first_name), name = COALESCE($4, name)
         WHERE id = $5`,
        [email || null, telephone || null, prenoms || null, nom, inv.owner_id]
      );
    }

    if (inv.type === 'tenant') {
      // Récupérer le premier owner du gestionnaire pour l'associer au tenant
      const ownerRes = await client.query(
        `SELECT owner_id FROM owner_user WHERE user_id = $1 AND is_active = true LIMIT 1`,
        [inv.gestionnaire_id]
      );
      const tenant_owner_id = ownerRes.rows[0]?.owner_id || null;

      // Créer le tenant maintenant
      const tenantCode = 'LOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await client.query(
        `INSERT INTO tenants (nom, prenoms, email, telephone_principal, owner_id, user_id, invitation_code, statut, type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Actif', 'Locataire')`,
        [nom, prenoms || null, email || null, telephone || null, tenant_owner_id, newUser.id, tenantCode]
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
