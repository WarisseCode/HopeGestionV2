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
// Gestionnaire génère un lien d'invitation pour un propriétaire ou locataire
// Requiert: protect middleware (req.user doit exister)
router.post('/', protect, async (req: Request, res: Response) => {
  const { type, owner_id, tenant_id, email, telephone, nom, prenom } = req.body;
  const gestionnaire_id = (req as any).user?.id;

  if (!gestionnaire_id) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  if (!type || !['owner', 'tenant'].includes(type)) {
    return res.status(400).json({ error: 'Type invalide. Valeurs acceptées : owner, tenant' });
  }

  if (type === 'tenant' && !tenant_id) {
    return res.status(400).json({ error: 'tenant_id requis pour une invitation locataire' });
  }

  if (type === 'owner' && !owner_id) {
    return res.status(400).json({ error: 'owner_id requis pour une invitation propriétaire' });
  }

  try {
    // Vérifier que le tenant/owner appartient bien au gestionnaire
    if (type === 'tenant') {
      const check = await pool.query(
        `SELECT t.id FROM tenants t
         JOIN owners o ON t.owner_id = o.id
         JOIN owner_user ou ON o.id = ou.owner_id
         WHERE t.id = $1 AND ou.user_id = $2`,
        [tenant_id, gestionnaire_id]
      );
      if (check.rowCount === 0) {
        return res.status(403).json({ error: 'Locataire introuvable ou non autorisé' });
      }

      // Invalider les invitations précédentes non utilisées pour ce locataire
      await pool.query(
        `UPDATE invitations SET expires_at = NOW()
         WHERE tenant_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [tenant_id]
      );
    }

    if (type === 'owner') {
      const check = await pool.query(
        `SELECT o.id FROM owners o
         JOIN owner_user ou ON o.id = ou.owner_id
         WHERE o.id = $1 AND ou.user_id = $2`,
        [owner_id, gestionnaire_id]
      );
      if (check.rowCount === 0) {
        return res.status(403).json({ error: 'Propriétaire introuvable ou non autorisé' });
      }

      // Invalider les invitations précédentes non utilisées pour ce propriétaire
      await pool.query(
        `UPDATE invitations SET expires_at = NOW()
         WHERE owner_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
        [owner_id]
      );
    }

    const result = await pool.query(
      `INSERT INTO invitations
         (type, gestionnaire_id, owner_id, tenant_id, email, telephone, nom, prenom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING token, expires_at`,
      [type, gestionnaire_id, owner_id || null, tenant_id || null, email || null, telephone || null, nom || null, prenom || null]
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
// Route publique — valide le token et retourne le contexte pour afficher le formulaire
router.get('/validate/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const result = await pool.query(
      `SELECT
         i.id, i.type, i.expires_at, i.accepted_at,
         i.nom, i.prenom, i.email, i.telephone,
         u.nom AS gestionnaire_nom,
         o.name AS owner_name, o.first_name AS owner_first_name,
         t.nom AS tenant_nom, t.prenoms AS tenant_prenoms,
         t.telephone_principal AS tenant_telephone, t.email AS tenant_email
       FROM invitations i
       JOIN users u ON i.gestionnaire_id = u.id
       LEFT JOIN owners o ON i.owner_id = o.id
       LEFT JOIN tenants t ON i.tenant_id = t.id
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
      nom: inv.type === 'tenant' ? inv.tenant_nom : (inv.nom || inv.owner_name),
      prenom: inv.type === 'tenant' ? inv.tenant_prenoms : (inv.prenom || inv.owner_first_name),
      email: inv.type === 'tenant' ? inv.tenant_email : inv.email,
      telephone: inv.type === 'tenant' ? inv.tenant_telephone : inv.telephone,
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

    // Récupérer et verrouiller l'invitation
    const invResult = await client.query(
      `SELECT * FROM invitations WHERE token = $1 FOR UPDATE`,
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

    // Lier au tenant ou à l'owner
    if (inv.type === 'tenant' && inv.tenant_id) {
      await client.query(
        `UPDATE tenants SET user_id = $1, nom = $2, prenoms = $3,
         email = COALESCE($4, email), telephone_principal = COALESCE($5, telephone_principal)
         WHERE id = $6`,
        [newUser.id, nom, prenoms || null, email || null, telephone || null, inv.tenant_id]
      );
    }

    if (inv.type === 'owner' && inv.owner_id) {
      // Lier via owner_user (table de jonction)
      await client.query(
        `INSERT INTO owner_user (owner_id, user_id, role, start_date, is_active)
         VALUES ($1, $2, 'owner', CURRENT_DATE, true)
         ON CONFLICT (owner_id, user_id) DO NOTHING`,
        [inv.owner_id, newUser.id]
      );
      // Mettre à jour les infos de l'owner
      await client.query(
        `UPDATE owners SET email = COALESCE($1, email), phone = COALESCE($2, phone)
         WHERE id = $3`,
        [email || null, telephone || null, inv.owner_id]
      );
    }

    // Marquer l'invitation comme acceptée
    await client.query(
      `UPDATE invitations SET accepted_at = NOW() WHERE id = $1`,
      [inv.id]
    );

    await client.query('COMMIT');

    // Générer les tokens JWT
    const accessToken = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        nom: newUser.nom,
        email: newUser.email,
        telephone: newUser.telephone,
        role: newUser.role
      }
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
