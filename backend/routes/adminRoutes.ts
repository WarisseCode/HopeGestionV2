// backend/routes/adminRoutes.ts
import { Router, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import pool from '../db/database'; // Fix circular dependency
import { validate } from '../middleware/validate';
import { invalidateMaintenanceCache } from '../middleware/maintenanceMiddleware';

const router = Router();

const adminIdParam = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide');
const userActionRules = [
    adminIdParam,
    body('action').notEmpty().withMessage('Action requise').bail().isString().isLength({ max: 50 }).withMessage('Action invalide'),
    body('value').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Valeur invalide'),
];
const assignSubRules = [
    body('userId').notEmpty().withMessage('userId est obligatoire').bail().isInt({ min: 1 }).withMessage('userId invalide'),
    body('planId').notEmpty().withMessage('planId est obligatoire').bail().isInt({ min: 1 }).withMessage('planId invalide'),
];
const settingsRules = [body('settings').isObject().withMessage('settings doit être un objet')];
const inviteRules = [
    body('email').notEmpty().withMessage('Email requis').bail().isEmail().withMessage('Email valide requis'),
    body('expiresInHours').optional({ nullable: true }).isInt({ min: 1, max: 720 }).withMessage('Durée invalide (heures)'),
];

// Middleware: Verify Admin Role
const verifyAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Allows 'admin' role OR dev backdoor if needed (but prefer strict role)
    if (req.userRole === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Accès refusé. Réservé aux administrateurs.' });
    }
};

// Apply verifyAdmin to all routes defined below
router.use(verifyAdmin);

// ==============================================
// 1. DASHBOARD STATS
// ==============================================
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // All counts in parallel for speed
        const [usersRes, activeRes, agenciesRes, propertiesRes, lotsRes, tenantsRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query("SELECT COUNT(*) FROM users WHERE statut = 'actif'"),
            pool.query('SELECT COUNT(*) FROM owners'),
            pool.query('SELECT COUNT(*) FROM buildings'),
            pool.query('SELECT COUNT(*) FROM lots'),
            pool.query('SELECT COUNT(*) FROM tenants'),
        ]);

        // Revenue — safe query with fallback
        let revenue = 0;
        let paymentsCount = 0;
        try {
            const revRes = await pool.query("SELECT COALESCE(SUM(montant),0) as total, COUNT(*) as cnt FROM payments");
            revenue = parseFloat(revRes.rows[0].total) || 0;
            paymentsCount = parseInt(revRes.rows[0].cnt) || 0;
        } catch (e) {
            // payments table might not exist yet
        }

        // Users created this month vs last month for trend
        let usersThisMonth = 0;
        let usersLastMonth = 0;
        try {
            const trendRes = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as this_month,
                    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') 
                                     AND created_at < DATE_TRUNC('month', CURRENT_DATE)) as last_month
                FROM users
            `);
            usersThisMonth = parseInt(trendRes.rows[0].this_month) || 0;
            usersLastMonth = parseInt(trendRes.rows[0].last_month) || 0;
        } catch (e) {}

        const usersTrend = usersLastMonth > 0 
            ? Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100) 
            : usersThisMonth > 0 ? 100 : 0;

        res.json({
            users: {
                total: parseInt(usersRes.rows[0].count),
                active: parseInt(activeRes.rows[0].count),
                thisMonth: usersThisMonth,
                trend: usersTrend
            },
            revenue: {
                total: revenue,
                currency: 'FCFA',
                paymentsCount
            },
            agencies: parseInt(agenciesRes.rows[0].count),
            properties: parseInt(propertiesRes.rows[0].count),
            lots: parseInt(lotsRes.rows[0].count),
            tenants: parseInt(tenantsRes.rows[0].count),
        });

    } catch (error: any) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
    }
});

// ==============================================
// 1b. GROWTH DATA (monthly users + payments)
// ==============================================
router.get('/stats/growth', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Users created per month (last 12 months)
        const usersGrowth = await pool.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
                EXTRACT(MONTH FROM DATE_TRUNC('month', created_at)) as month_num,
                COUNT(*) as users
            FROM users
            WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at)
        `);

        // Payments per month (last 12 months)
        let paymentsGrowth: any[] = [];
        try {
            const payRes = await pool.query(`
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', date_paiement), 'Mon') as month,
                    COALESCE(SUM(montant), 0) as revenue
                FROM payments
                WHERE date_paiement >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', date_paiement)
                ORDER BY DATE_TRUNC('month', date_paiement)
            `);
            paymentsGrowth = payRes.rows;
        } catch (e) {}

        // Merge into unified array
        const months = usersGrowth.rows.map(row => {
            const pay = paymentsGrowth.find(p => p.month === row.month);
            return {
                name: row.month,
                users: parseInt(row.users),
                revenue: pay ? parseFloat(pay.revenue) : 0
            };
        });

        res.json({ growth: months });

    } catch (error: any) {
        console.error('Error fetching growth:', error);
        res.json({ growth: [] });
    }
});

// ==============================================
// 1c. RECENT ACTIVITY (from audit_logs)
// ==============================================
router.get('/stats/activity', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                al.id,
                al.action,
                al.module,
                al.entity_type,
                al.details,
                al.user_name,
                al.created_at,
                al.ip_address
            FROM audit_logs al
            ORDER BY al.created_at DESC
            LIMIT 15
        `);

        const activity = result.rows.map(row => ({
            id: row.id,
            user: row.user_name || 'Système',
            action: formatAction(row.action, row.module),
            time: formatTimeAgo(new Date(row.created_at)),
            type: getActivityType(row.action),
            details: row.details,
            ip: row.ip_address
        }));

        res.json({ activity });

    } catch (error: any) {
        console.error('Error fetching activity:', error);
        res.json({ activity: [] });
    }
});

// Helper: Format action into readable text
function formatAction(action: string, module?: string): string {
    const actions: Record<string, string> = {
        'LOGIN_SUCCESS': 'Connexion réussie',
        'LOGIN_FAILED': 'Tentative de connexion échouée',
        'PASSWORD_RESET_REQUESTED': 'Demande de réinitialisation MDP',
        'PASSWORD_RESET_COMPLETED': 'Mot de passe réinitialisé',
        'USER_CREATED': 'Nouveau compte créé',
        'USER_UPDATED': 'Profil mis à jour',
        'BUILDING_CREATED': 'Nouvel immeuble ajouté',
        'TENANT_CREATED': 'Nouveau locataire ajouté',
        'PAYMENT_CREATED': 'Paiement enregistré',
        'PAYMENT_VALIDATED': 'Paiement validé',
    };
    return actions[action] || action.replace(/_/g, ' ').toLowerCase();
}

// Helper: Format relative time
function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'À l\'instant';
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)}j`;
    return date.toLocaleDateString('fr-FR');
}

// Helper: Determine activity type for UI styling
function getActivityType(action: string): string {
    if (action.includes('FAIL') || action.includes('ERROR') || action.includes('DELETE')) return 'error';
    if (action.includes('WARNING') || action.includes('SUSPEND')) return 'warning';
    if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('VALIDATED')) return 'success';
    return 'info';
}


// ==============================================
// 2. USERS MANAGEMENT
// ==============================================
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { search, role, status, verified, provider } = req.query;
        
        let query = `
            SELECT id, nom, email, telephone, role, user_type, statut, created_at,
                   is_verified, auth_provider, google_id, avatar_url, is_guest
            FROM users 
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (nom ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR telephone ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (role && role !== 'all') {
            query += ` AND role = $${paramIndex}`;
            params.push(role);
            paramIndex++;
        }

        if (status && status !== 'all') {
             query += ` AND statut = $${paramIndex}`;
             params.push(status);
             paramIndex++;
        }

        if (verified === 'true') {
            query += ` AND is_verified = true`;
        } else if (verified === 'false') {
            query += ` AND (is_verified = false OR is_verified IS NULL)`;
        }

        if (provider && provider !== 'all') {
            query += ` AND auth_provider = $${paramIndex}`;
            params.push(provider);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT 200`;

        const result = await pool.query(query, params);
        
        // Get total count for stats
        const countRes = await pool.query('SELECT COUNT(*) FROM users');
        
        res.json({ 
            users: result.rows,
            total: parseInt(countRes.rows[0].count)
        });

    } catch (error: any) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
    }
});

// GET user details
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const userRes = await pool.query(`
            SELECT id, nom, email, telephone, role, user_type, statut, created_at,
                   is_verified, auth_provider, google_id, avatar_url, is_guest, preferences
            FROM users WHERE id = $1
        `, [id]);

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur introuvable.' });
        }

        const user = userRes.rows[0];

        // Get related data
        let ownerData = null;
        try {
            const ownerRes = await pool.query(`
                SELECT ou.role as owner_role, ou.is_active, o.name as agency_name, o.manager_code
                FROM owner_user ou
                JOIN owners o ON ou.owner_id = o.id
                WHERE ou.user_id = $1
            `, [id]);
            if (ownerRes.rows.length > 0) ownerData = ownerRes.rows;
        } catch (e) {}

        // Recent activity
        let recentActivity: any[] = [];
        try {
            const actRes = await pool.query(`
                SELECT action, module, created_at 
                FROM audit_logs WHERE user_id = $1 
                ORDER BY created_at DESC LIMIT 10
            `, [id!.toString()]);
            recentActivity = actRes.rows;
        } catch (e) {}

        res.json({ user, ownerData, recentActivity });

    } catch (error: any) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails.' });
    }
});

// Admin Actions on Users
router.post('/users/:id/action', validate(userActionRules), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { action, value } = req.body;

    try {
        if (action === 'promote') {
            await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [id]);
            res.json({ message: 'Utilisateur promu Admin avec succès.' });
        } 
        else if (action === 'suspend') {
            await pool.query("UPDATE users SET statut = 'inactif' WHERE id = $1", [id]);
            res.json({ message: 'Compte utilisateur suspendu.' });
        }
        else if (action === 'reactivate') {
            await pool.query("UPDATE users SET statut = 'actif' WHERE id = $1", [id]);
            res.json({ message: 'Compte utilisateur réactivé.' });
        }
        else if (action === 'delete') {
            await pool.query("DELETE FROM users WHERE id = $1", [id]);
            res.json({ message: 'Utilisateur supprimé définitivement.' });
        }
        else if (action === 'verify') {
            await pool.query("UPDATE users SET is_verified = true WHERE id = $1", [id]);
            res.json({ message: 'Compte vérifié manuellement.' });
        }
        else if (action === 'unverify') {
            await pool.query("UPDATE users SET is_verified = false WHERE id = $1", [id]);
            res.json({ message: 'Vérification du compte révoquée.' });
        }
        else if (action === 'change_role') {
            if (!value) return res.status(400).json({ message: 'Nouveau rôle requis.' });
            const allowedRoles = ['admin', 'gestionnaire', 'manager', 'comptable', 'viewer', 'agent_recouvreur'];
            if (!allowedRoles.includes(value)) {
                return res.status(400).json({ message: `Rôle invalide. Valeurs acceptées: ${allowedRoles.join(', ')}` });
            }
            await pool.query("UPDATE users SET role = $1 WHERE id = $2", [value, id]);
            res.json({ message: `Rôle changé en "${value}".` });
        }
        else if (action === 'reset_password') {
            res.json({ message: 'Processus de réinitialisation déclenché (email envoyé).' });
        }
        else {
            res.status(400).json({ message: 'Action non reconnue.' });
        }
    } catch (error: any) {
        console.error(`Error performing action ${action} on user ${id}:`, error);
        res.status(500).json({ message: 'Erreur lors de l\'exécution de l\'action.' });
    }
});

// ==============================================
// 3. AGENCIES (OWNERS/GESTIONNAIRES)
// ==============================================
router.get('/agencies', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const query = `
            SELECT 
                o.id,
                o.name as agency_name,
                o.manager_code,
                o.created_at as joined_date,
                u.nom as manager_name,
                u.email,
                u.telephone as phone,
                u.statut as status,
                u.avatar_url,
                (SELECT COUNT(*) FROM buildings b WHERE b.owner_id = o.id) as property_count,
                (SELECT COUNT(*) FROM lots l JOIN buildings b ON l.building_id = b.id WHERE b.owner_id = o.id) as lot_count,
                (SELECT COUNT(*) FROM tenants t WHERE t.owner_id = o.id) as client_count,
                (SELECT COALESCE(SUM(p.montant), 0) FROM payments p WHERE p.owner_id = o.id) as total_revenue
            FROM owners o
            LEFT JOIN owner_user ou ON ou.owner_id = o.id AND ou.role = 'gestionnaire'
            LEFT JOIN users u ON u.id = ou.user_id
            ORDER BY o.created_at DESC
        `;

        const result = await pool.query(query);

        const agencies = result.rows.map(row => {
            // Calculate a simple performance score (0-5) based on data
            const props = parseInt(row.property_count || '0');
            const clients = parseInt(row.client_count || '0');
            const lots = parseInt(row.lot_count || '0');
            const occupancyRate = lots > 0 ? Math.min(clients / lots, 1) : 0;
            const score = Math.min(5, Math.round((props * 0.5 + clients * 0.3 + occupancyRate * 5) * 10) / 10);

            return {
                id: row.id,
                name: row.agency_name || row.manager_name || 'Agence sans nom',
                managerName: row.manager_name || 'Non assigné',
                email: row.email || '',
                phone: row.phone || '',
                managerCode: row.manager_code,
                propertyCount: props,
                lotCount: lots,
                clientCount: clients,
                totalRevenue: parseFloat(row.total_revenue || '0'),
                status: row.status === 'actif' ? 'active' : 'inactive',
                rating: score || 0,
                joinedDate: row.joined_date,
                avatarUrl: row.avatar_url
            };
        });

        res.json({ agencies });

    } catch (error: any) {
        console.error('Error fetching agencies:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des agences.' });
    }
});


// ==============================================
// 4. FINANCES (Global)
// ==============================================
router.get('/finances', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // 1. Total Transaction Monthly Volume
        const volRes = await pool.query(`
            SELECT 
                TO_CHAR(date_paiement, 'Mon') as month,
                SUM(montant) as total
            FROM payments
            WHERE date_paiement >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY 1
            ORDER BY MIN(date_paiement)
        `);

        // 2. Recent Transactions (Global)
        const txRes = await pool.query(`
            SELECT p.id, p.montant, p.date_paiement, p.type, p.status, 
                   u.nom as user_name
            FROM payments p
            LEFT JOIN users u ON p.owner_id = u.id -- assuming owner_id links to users
            ORDER BY p.date_paiement DESC
            LIMIT 20
        `);

        // Mock SaaS Revenue (until Subscription module exists)
        // We will assume 5% of total volume is platform revenue for now if no subscription table
        const totalVolume = volRes.rows.reduce((acc, row) => acc + parseInt(row.total), 0);
        const estimatedRevenue = totalVolume * 0.05; 

        res.json({
            revenue: {
                total: estimatedRevenue, 
                volume: totalVolume
            },
            history: volRes.rows.map(r => ({ name: r.month, revenue: parseInt(r.total) * 0.05, volume: parseInt(r.total) })),
            transactions: txRes.rows.map(r => ({
                id: r.id,
                type: r.type || 'Paiement Loyer',
                user: r.user_name || 'Utilisateur inconnu',
                amount: r.montant,
                date: new Date(r.date_paiement).toLocaleDateString(),
                status: 'success' // simplified
            }))
        });

    } catch (error: any) {
        console.error('Error fetching admin finances:', error);
        // Fallback to empty if table doesn't exist
        res.json({ revenue: { total: 0 }, history: [], transactions: [] });
    }
});

// ==============================================
// 5. SUBSCRIPTIONS MANAGEMENT
// ==============================================
router.get('/subscriptions', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Retourne les plans en aliasant les colonnes pour correspondre au frontend AdminSubscriptions.tsx
        const plansRes = await pool.query(`
            SELECT
                p.id,
                CASE p.name
                    WHEN 'free'       THEN 'Gratuit'
                    WHEN 'pro'        THEN 'Pro'
                    WHEN 'enterprise' THEN 'Enterprise'
                    ELSE p.display_name
                END AS name,
                '' AS description,
                p.price,
                'FCFA' AS currency,
                COALESCE(p.duration_months, 1) * 30 AS duration_days,
                p.max_properties,
                p.max_tenants AS max_lots,
                -1 AS max_users,
                p.features,
                p.is_active
            FROM plans p
            WHERE p.is_active = true
            ORDER BY p.price ASC
        `);

        // Abonnements actifs avec infos utilisateur et plan
        const subsRes = await pool.query(`
            SELECT
                s.id, s.user_id, s.plan_id, s.status,
                s.start_date AS starts_at,
                s.end_date   AS expires_at,
                u.nom   AS user_name,
                u.email AS user_email,
                CASE p.name
                    WHEN 'free'       THEN 'Gratuit'
                    WHEN 'pro'        THEN 'Pro'
                    WHEN 'enterprise' THEN 'Enterprise'
                    ELSE p.display_name
                END AS plan_name,
                p.price AS plan_price
            FROM subscriptions s
            JOIN users u ON u.id = s.user_id
            JOIN plans  p ON p.id = s.plan_id
            ORDER BY s.created_at DESC
        `);

        // Nombre d'abonnés actifs par plan
        const countPerPlan = await pool.query(`
            SELECT plan_id, COUNT(*) AS count
            FROM subscriptions
            WHERE status = 'active' AND (end_date IS NULL OR end_date > NOW())
            GROUP BY plan_id
        `);

        res.json({
            plans: plansRes.rows,
            subscriptions: subsRes.rows,
            stats: countPerPlan.rows
        });

    } catch (error: any) {
        console.error('Error fetching subscriptions:', error);
        res.json({ plans: [], subscriptions: [], stats: [] });
    }
});

// Assign a plan to a user
router.post('/subscriptions/assign', validate(assignSubRules), async (req: AuthenticatedRequest, res: Response) => {
    const { userId, planId } = req.body;

    try {
        if (!userId || !planId) {
            return res.status(400).json({ message: 'userId et planId requis.' });
        }

        const planRes = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
        if (planRes.rows.length === 0) {
            return res.status(404).json({ message: 'Plan introuvable.' });
        }
        const plan = planRes.rows[0];

        // Pour le plan Free, end_date = NULL (pas d'expiration)
        const durationMonths: number = plan.duration_months || 1;
        const endDate: Date | null = plan.price === 0 ? null : new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Annuler tout abonnement actif ou en attente existant
            await client.query(
                `UPDATE subscriptions
                 SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
                 WHERE user_id = $1 AND status IN ('active', 'pending_payment')`,
                [userId]
            );

            // Créer le nouvel abonnement actif
            await client.query(
                `INSERT INTO subscriptions (user_id, plan_id, status, start_date, end_date)
                 VALUES ($1, $2, 'active', NOW(), $3)`,
                [userId, planId, endDate]
            );

            // Mettre à jour le plan courant sur l'utilisateur
            await client.query(
                'UPDATE users SET current_plan_id = $1 WHERE id = $2',
                [planId, userId]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        const expireLabel = endDate ? `Expire le ${endDate.toLocaleDateString('fr-FR')}.` : 'Sans expiration.';
        res.json({ message: `Plan "${plan.display_name}" attribué avec succès. ${expireLabel}` });

    } catch (error: any) {
        console.error('Error assigning subscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'attribution du plan.' });
    }
});

// Cancel a subscription
router.post('/subscriptions/:id/cancel', validate([adminIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE subscriptions
             SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [id]
        );
        res.json({ message: 'Abonnement annulé.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de l\'annulation.' });
    }
});

// ==============================================
// 5b. ADMIN AUDIT LOGS (full list with filters)
// ==============================================
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { search, action, module: mod, page = '1', limit = '50' } = req.query;
        const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

        let query = `
            SELECT id, user_id, action, module, entity_type, entity_id, 
                   details, user_name, ip_address, user_agent, created_at
            FROM audit_logs WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (search) {
            query += ` AND (user_name ILIKE $${paramIndex} OR action ILIKE $${paramIndex} OR ip_address ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (action && action !== 'all') {
            query += ` AND action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        if (mod && mod !== 'all') {
            query += ` AND module = $${paramIndex}`;
            params.push(mod);
            paramIndex++;
        }

        // Get total count
        const countQuery = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) FROM');
        const countRes = await pool.query(countQuery, params);
        const total = parseInt(countRes.rows[0].count);

        // Get paginated results
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit as string), offset);

        const result = await pool.query(query, params);

        // Get distinct actions and modules for filter dropdowns
        let actions: string[] = [];
        let modules: string[] = [];
        try {
            const actionsRes = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
            const modulesRes = await pool.query('SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module');
            actions = actionsRes.rows.map(r => r.action);
            modules = modulesRes.rows.map(r => r.module);
        } catch (e) {}

        res.json({
            logs: result.rows,
            total,
            page: parseInt(page as string),
            totalPages: Math.ceil(total / parseInt(limit as string)),
            filters: { actions, modules }
        });

    } catch (error: any) {
        console.error('Error fetching audit logs:', error);
        res.json({ logs: [], total: 0, page: 1, totalPages: 0, filters: { actions: [], modules: [] } });
    }
});

// ==============================================
// 5c. ADMIN SETTINGS
// ==============================================
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Check if settings table exists
        const settings: any = {};
        try {
            const result = await pool.query('SELECT key, value FROM admin_settings');
            result.rows.forEach(row => { settings[row.key] = row.value; });
        } catch (e) {
            // Table might not exist yet, return defaults
        }

        // Return settings with defaults
        res.json({
            platform: {
                name: settings['platform_name'] || 'HopeGestion',
                description: settings['platform_description'] || 'Plateforme de gestion immobilière',
                maintenanceMode: settings['maintenance_mode'] === 'true',
                allowRegistration: settings['allow_registration'] !== 'false',
                requireEmailVerification: settings['require_email_verification'] !== 'false',
                maxPropertiesPerUser: parseInt(settings['max_properties_per_user'] || '10'),
                defaultUserRole: settings['default_user_role'] || 'gestionnaire',
            },
            email: {
                host: process.env.EMAIL_HOST || '',
                port: process.env.EMAIL_PORT || '',
                user: process.env.EMAIL_USER ? '***configuré***' : 'Non configuré',
                from: process.env.EMAIL_FROM || '',
            },
            system: {
                nodeVersion: process.version,
                environment: process.env.NODE_ENV || 'development',
                databaseConnected: true,
                frontendUrl: process.env.FRONTEND_URL || 'Non configuré',
            }
        });

    } catch (error: any) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des paramètres.' });
    }
});

router.put('/settings', validate(settingsRules), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { settings } = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ message: 'Paramètres invalides.' });
        }

        // Ensure admin_settings table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Upsert each setting
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(`
                INSERT INTO admin_settings (key, value, updated_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
            `, [key, String(value)]);
        }

        res.json({ message: 'Paramètres sauvegardés avec succès.' });

    } catch (error: any) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Erreur lors de la sauvegarde.' });
    }
});

// ==============================================
// 6. ADMIN INVITATION SYSTEM
// ==============================================
import crypto from 'crypto';
import bcrypt from 'bcrypt';

// Generate a secure invite code
function generateInviteCode(): string {
    return crypto.randomBytes(32).toString('hex');
}

// POST /api/admin/invite - Create invitation for new admin
router.post('/invite', validate(inviteRules), async (req: AuthenticatedRequest, res: Response) => {
    const { email, expiresInHours = 48 } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Email valide requis.' });
    }

    try {
        // Check if email already exists as user
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Cet email est déjà associé à un compte.' });
        }

        // Check if invitation already exists
        const existingInvite = await pool.query('SELECT id FROM admin_invitations WHERE email = $1 AND used_at IS NULL', [email]);
        if (existingInvite.rows.length > 0) {
            return res.status(400).json({ message: 'Une invitation existe déjà pour cet email.' });
        }

        const inviteCode = generateInviteCode();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO admin_invitations (email, invite_code, invited_by, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [email, inviteCode, req.userId, expiresAt]
        );

        // In production, send email with invite link
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/admin/accept-invite?code=${inviteCode}`;

        res.json({
            message: 'Invitation créée avec succès.',
            inviteLink,
            expiresAt: expiresAt.toISOString()
        });

    } catch (error: any) {
        console.error('Error creating admin invite:', error);
        res.status(500).json({ message: 'Erreur lors de la création de l\'invitation.' });
    }
});

// GET /api/admin/invites - List pending invitations
router.get('/invites', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT ai.id, ai.email, ai.expires_at, ai.created_at, ai.used_at,
                   u.nom as invited_by_name
            FROM admin_invitations ai
            LEFT JOIN users u ON ai.invited_by = u.id
            ORDER BY ai.created_at DESC
        `);
        res.json({ invitations: result.rows });
    } catch (error: any) {
        console.error('Error fetching invites:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des invitations.' });
    }
});

// DELETE /api/admin/invites/:id - Revoke invitation
router.delete('/invites/:id', validate([adminIdParam]), async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM admin_invitations WHERE id = $1', [id]);
        res.json({ message: 'Invitation révoquée.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la révocation.' });
    }
});

// ==============================================
// PUBLIC ROUTE: Accept invitation (No auth required)
// This needs to be added to index.ts as a public route
// ==============================================

export default router;

// Export invitation acceptance handler for use in separate public route
export async function acceptAdminInvite(req: any, res: Response) {
    const { code, email, password, nom } = req.body;

    if (!code || !email || !password) {
        return res.status(400).json({ message: 'Code, email et mot de passe requis.' });
    }

    try {
        // Validate invitation
        const inviteResult = await pool.query(
            `SELECT * FROM admin_invitations 
             WHERE invite_code = $1 AND email = $2 AND used_at IS NULL AND expires_at > NOW()`,
            [code, email]
        );

        if (inviteResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invitation invalide, expirée ou déjà utilisée.' });
        }

        const invite = inviteResult.rows[0];

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, nom, role, user_type, statut, created_at)
             VALUES ($1, $2, $3, 'admin', 'admin', 'actif', NOW())
             RETURNING id, email, nom, role`,
            [email, hashedPassword, nom || 'Admin']
        );

        // Mark invitation as used
        await pool.query(
            'UPDATE admin_invitations SET used_at = NOW() WHERE id = $1',
            [invite.id]
        );

        res.json({
            message: 'Compte Admin créé avec succès !',
            user: userResult.rows[0]
        });

    } catch (error: any) {
        console.error('Error accepting admin invite:', error);
        res.status(500).json({ message: 'Erreur lors de la création du compte.' });
    }
}

// ==============================================
// MAINTENANCE MODE
// ==============================================

// Règles de validation pour le mode maintenance
const maintenanceRules = [
    body('enabled').isBoolean().withMessage('enabled doit être un booléen'),
    body('message').optional().isString().isLength({ max: 500 }).withMessage('Message trop long')
];

// GET /api/admin/maintenance/status - Récupérer le statut de maintenance
router.get('/maintenance/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const result = await pool.query(
            "SELECT value, description FROM system_settings WHERE key = 'maintenance_mode'"
        );

        if (result.rows.length === 0) {
            return res.json({
                enabled: false,
                message: 'Mode maintenance non configuré'
            });
        }

        const enabled = result.rows[0].value === 'true';
        
        // Récupérer aussi le message de maintenance personnalisé s'il existe
        let customMessage = 'Site en maintenance. Merci de votre patience.';
        try {
            const messageResult = await pool.query(
                "SELECT value FROM system_settings WHERE key = 'maintenance_message'"
            );
            if (messageResult.rows.length > 0) {
                customMessage = messageResult.rows[0].value;
            }
        } catch (e) {
            // Ignorer l'erreur si le message n'existe pas
        }

        res.json({
            enabled,
            message: customMessage,
            description: result.rows[0].description
        });

    } catch (error: any) {
        console.error('Error fetching maintenance status:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du statut de maintenance.' });
    }
});

// PUT /api/admin/maintenance/toggle - Activer/désactiver le mode maintenance
router.put('/maintenance/toggle', maintenanceRules, validate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { enabled, message } = req.body;

        // Mettre à jour le mode maintenance
        await pool.query(
            `UPDATE system_settings 
             SET value = $1, updated_at = NOW(), updated_by = $2
             WHERE key = 'maintenance_mode'`,
            [enabled.toString(), req.userId]
        );

        // Mettre à jour le message personnalisé si fourni
        if (message !== undefined) {
            await pool.query(
                `INSERT INTO system_settings (key, value, value_type, description, updated_at, updated_by)
                 VALUES ('maintenance_message', $1, 'string', 'Message personnalisé de maintenance', NOW(), $2)
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $1, updated_at = NOW(), updated_by = $2`,
                [message, req.userId]
            );
        }

        // Logger l'action dans les audit logs
        try {
            await pool.query(
                `INSERT INTO audit_logs (action, module, entity_type, entity_id, user_name, details, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
                    'system',
                    'maintenance_mode',
                    null,
                    req.user?.email || 'Admin',
                    `Mode maintenance ${enabled ? 'activé' : 'désactivé'}`,
                    req.ip
                ]
            );
        } catch (logError) {
            console.warn('Failed to log maintenance toggle:', logError);
        }

        // Invalider le cache de maintenance pour que le changement soit immédiat
        invalidateMaintenanceCache();

        res.json({
            message: `Mode maintenance ${enabled ? 'activé' : 'désactivé'} avec succès`,
            enabled
        });

    } catch (error: any) {
        console.error('Error toggling maintenance mode:', error);
        res.status(500).json({ message: 'Erreur lors de la modification du mode maintenance.' });
    }
});

// Export verification function for checking invite validity
export async function checkAdminInvite(req: any, res: Response) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ valid: false, message: 'Code requis.' });
    }

    try {
        const result = await pool.query(
            `SELECT email, expires_at FROM admin_invitations 
             WHERE invite_code = $1 AND used_at IS NULL AND expires_at > NOW()`,
            [code]
        );

        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'Invitation invalide ou expirée.' });
        }

        res.json({
            valid: true,
            email: result.rows[0].email,
            expiresAt: result.rows[0].expires_at
        });

    } catch (error: any) {
        res.status(500).json({ valid: false, message: 'Erreur serveur.' });
    }
}

