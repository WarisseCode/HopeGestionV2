// backend/services/DashboardService.ts
// Logique métier dashboard — découplée du cycle HTTP.
// Chaque méthode reçoit un dbClient (fourni par tenantGuard, RLS actif) + paramètres métier.

import { PoolClient } from 'pg';
import { cache, TTL } from '../utils/cache';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerStats {
    totalBiens: number;
    totalLots: number;
    lotsOccupes: number;
    tauxOccupation: number;
    revenusMois: number;
    impayesEnCours: number;
    locatairesActifs: number;
}

export interface ProprietaireStats {
    totalBiens: number;
    totalLots: number;
    lotsOccupes: number;
    tauxOccupation: number;
    revenusMois: number;
    impayesEnCours: number;
}

export interface LocataireStats {
    nomLogement: string;
    loyerMensuel: number;
    prochainPaiement: string | null;
    statutContrat: string;
    dateDebut?: string;
    dateFin?: string;
    recentPayments?: Record<string, unknown>[];
}

export type KPIStatus = 'success' | 'warning' | 'danger';

export interface KPIItem {
    id: string;
    label: string;
    value: number | string;
    status: KPIStatus;
    icon: string;
    modulePath: string;
}

export interface KPIData {
    kpis: KPIItem[];
    summary: {
        totalBiens: number; totalLots: number; lotsOccupes: number; lotsLibres: number;
        tauxOccupation: number; loyersEncaisses: number; loyersImpayes: number;
        contratsActifs: number; plaintesOuvertes: number; reservationsEnAttente: number;
        montantARecouvrer: number; echelonementsEnRetard: number;
    };
}

export interface ChartPoint { name: string; revenus: number; depenses: number; }

export interface ActivityItem {
    id: number; type: string; title: string; description: string; created_at: string;
}

export interface FeaturedProperty {
    id: number; name: string; location: string;
    units: number; occupancy: number; image: string | null; status: string;
}

// ── Helper interne ────────────────────────────────────────────────────────────

// Construit owner_filter + params pour ANY($1::int[]). Toutes les queries d'un même
// appel partagent le même tableau params, donc $1 est cohérent partout.
function buildOwnerFilter(validOwnerIds: number[], isAdmin: boolean) {
    const filter     = isAdmin ? 'TRUE'            : 'owner_id = ANY($1::int[])';
    const leaseFilter = isAdmin ? 'TRUE'            : 'l.owner_id = ANY($1::int[])';
    const params     = isAdmin ? [] as number[][] : [validOwnerIds];
    return { filter, leaseFilter, params };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class DashboardService {

    /**
     * Stats globales gestionnaire / manager.
     * Les deux routes étaient copiées-collées à l'identique — on factorise avec cacheVariant.
     */
    static async getOwnerStats(
        dbClient: PoolClient,
        validOwnerIds: number[],
        isAdmin: boolean,
        cacheVariant: 'gestionnaire' | 'manager'
    ): Promise<OwnerStats> {
        const cacheKey = `dashboard:${cacheVariant}:${isAdmin ? 'admin' : validOwnerIds.slice().sort().join(',')}`;
        const cached = cache.get<OwnerStats>(cacheKey);
        if (cached) return cached;

        const { filter: ownerFilter, leaseFilter, params } = buildOwnerFilter(validOwnerIds, isAdmin);

        const [buildingsRes, lotsRes, occupiedRes, revenusRes, impayesRes, tenantsRes] = await Promise.all([
            dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${ownerFilter}`, params),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE ${ownerFilter}`, params),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'occupe' AND ${ownerFilter}`, params),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total FROM payments
                WHERE ${ownerFilter}
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, params),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total FROM leases l
                WHERE ${leaseFilter} AND l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                )
            `, params),
            dbClient.query(`SELECT COUNT(DISTINCT tenant_id) FROM leases WHERE statut = 'actif' AND ${ownerFilter}`, params),
        ]);

        const totalBiens      = parseInt(buildingsRes.rows[0].count, 10);
        const totalLots       = parseInt(lotsRes.rows[0].count, 10);
        const lotsOccupes     = parseInt(occupiedRes.rows[0].count, 10);
        const tauxOccupation  = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const revenusMois     = parseFloat(revenusRes.rows[0].total) || 0;
        const impayesEnCours  = parseFloat(impayesRes.rows[0].total) || 0;
        const locatairesActifs = parseInt(tenantsRes.rows[0].count, 10);

        const stats: OwnerStats = { totalBiens, totalLots, lotsOccupes, tauxOccupation, revenusMois, impayesEnCours, locatairesActifs };
        cache.set(cacheKey, stats, TTL.DASHBOARD);
        return stats;
    }

    static async getProprietaireStats(dbClient: PoolClient, ownerId: number): Promise<ProprietaireStats> {
        const cacheKey = `dashboard:proprietaire:${ownerId}`;
        const cached = cache.get<ProprietaireStats>(cacheKey);
        if (cached) return cached;

        const [buildingsRes, lotsRes, occupiedRes, revenusRes, impayesRes] = await Promise.all([
            dbClient.query('SELECT COUNT(*) FROM buildings WHERE owner_id = $1', [ownerId]),
            dbClient.query('SELECT COUNT(*) FROM lots WHERE owner_id = $1', [ownerId]),
            dbClient.query("SELECT COUNT(*) FROM lots WHERE owner_id = $1 AND statut = 'occupe'", [ownerId]),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total FROM payments
                WHERE owner_id = $1
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, [ownerId]),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total FROM leases l
                WHERE l.owner_id = $1 AND l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                )
            `, [ownerId]),
        ]);

        const totalBiens     = parseInt(buildingsRes.rows[0].count, 10);
        const totalLots      = parseInt(lotsRes.rows[0].count, 10);
        const lotsOccupes    = parseInt(occupiedRes.rows[0].count, 10);
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const revenusMois    = parseFloat(revenusRes.rows[0].total) || 0;
        const impayesEnCours = parseFloat(impayesRes.rows[0].total) || 0;

        const stats: ProprietaireStats = { totalBiens, totalLots, lotsOccupes, tauxOccupation, revenusMois, impayesEnCours };
        cache.set(cacheKey, stats, TTL.DASHBOARD);
        return stats;
    }

    static async getLocataireStats(dbClient: PoolClient, userId: number): Promise<LocataireStats> {
        const tenantResult = await dbClient.query(
            'SELECT t.id, t.nom, t.prenoms FROM tenants t WHERE t.user_id = $1',
            [userId]
        );
        let tenants = tenantResult.rows;

        // Liaison auto par email/tel si pas de lien direct user_id → tenant
        if (tenants.length === 0) {
            const userResult = await dbClient.query('SELECT email, telephone FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
                const { email, telephone } = userResult.rows[0];
                const fallback = await dbClient.query(`
                    SELECT id, nom, prenoms FROM tenants
                    WHERE email = $1 OR telephone_principal = $2
                `, [email, telephone]);
                if (fallback.rows.length > 0) tenants = fallback.rows;
            }
        }

        if (tenants.length === 0) {
            return { nomLogement: 'Aucun logement', loyerMensuel: 0, prochainPaiement: null, statutContrat: 'inactif' };
        }

        const tenantIds = tenants.map((t: any) => t.id);
        const leaseResult = await dbClient.query(`
            SELECT l.id, l.loyer_actuel, l.jour_echeance, l.statut, l.date_debut, l.date_fin,
                   lo.ref_lot, b.nom as nom_immeuble
            FROM leases l
            JOIN lots lo ON l.lot_id = lo.id
            JOIN buildings b ON lo.building_id = b.id
            WHERE l.tenant_id = ANY($1) AND l.statut = 'actif'
            ORDER BY l.date_debut DESC
        `, [tenantIds]);

        if (leaseResult.rows.length === 0) {
            return { nomLogement: 'Aucun bail actif', loyerMensuel: 0, prochainPaiement: null, statutContrat: 'inactif' };
        }

        let totalLoyer = 0;
        let nextPaymentDate: Date | null = null;
        const logementsNames: string[] = [];
        const leaseIds: number[] = [];

        for (const lease of leaseResult.rows) {
            totalLoyer += parseFloat(lease.loyer_actuel) || 0;
            logementsNames.push(`${lease.ref_lot} (${lease.nom_immeuble})`);
            leaseIds.push(lease.id);

            const today = new Date();
            const jour = lease.jour_echeance || 5;
            let np = new Date(today.getFullYear(), today.getMonth(), jour);
            if (np < today) np = new Date(today.getFullYear(), today.getMonth() + 1, jour);
            if (!nextPaymentDate || np < nextPaymentDate) nextPaymentDate = np;
        }

        const paymentsResult = await dbClient.query(`
            SELECT id, montant, date_paiement FROM payments
            WHERE lease_id = ANY($1) ORDER BY date_paiement DESC LIMIT 10
        `, [leaseIds]);

        const recentPayments = paymentsResult.rows.map((p: any) => ({
            id: p.id,
            amount: parseFloat(p.montant),
            date: p.date_paiement,
            status: 'paid',
            month: new Date(p.date_paiement).toLocaleString('fr-FR', { month: 'long' })
        }));

        return {
            nomLogement: logementsNames.length > 1 ? `${logementsNames.length} Logements actifs` : logementsNames[0]!,
            loyerMensuel: totalLoyer,
            prochainPaiement: nextPaymentDate ? nextPaymentDate.toISOString().slice(0, 10) : null,
            statutContrat: 'actif',
            dateDebut: leaseResult.rows[0].date_debut,
            dateFin: leaseResult.rows[0].date_fin,
            recentPayments,
        };
    }

    static async getKPIs(dbClient: PoolClient, validOwnerIds: number[], isAdmin: boolean): Promise<KPIData> {
        const { filter: wO, leaseFilter: wOL, params: p } = buildOwnerFilter(validOwnerIds, isAdmin);

        const [
            buildingsRes, lotsRes, occupiedRes, freeRes, reservedRes,
            encaissesRes, attendusRes, contratsRes, plaintesRes, recouvrementRes,
        ] = await Promise.all([
            dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${wO}`, p),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE ${wO}`, p),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'occupe' AND ${wO}`, p),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'disponible' AND ${wO}`, p),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'reserve' AND ${wO}`, p),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total FROM payments
                WHERE type = 'Loyer' AND ${wO}
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND statut = 'valide'
            `, p),
            dbClient.query(`SELECT COALESCE(SUM(loyer_actuel), 0) as total FROM leases WHERE statut = 'actif' AND ${wO}`, p),
            dbClient.query(`SELECT COUNT(*) FROM leases WHERE statut = 'actif' AND ${wO}`, p),
            dbClient.query(`
                SELECT COUNT(*) FROM tickets t JOIN lots l ON t.lot_id = l.id
                WHERE t.statut = 'ouvert' AND ${wOL}
            `, p),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total FROM leases l
                WHERE l.statut = 'actif' AND ${wOL}
                AND NOT EXISTS (
                    SELECT 1 FROM payments p WHERE p.lease_id = l.id AND p.type = 'Loyer'
                    AND p.statut = 'valide' AND p.date_paiement >= DATE_TRUNC('month', CURRENT_DATE)
                )
            `, p),
        ]);

        const totalBiens          = parseInt(buildingsRes.rows[0].count, 10);
        const totalLots           = parseInt(lotsRes.rows[0].count, 10);
        const lotsOccupes         = parseInt(occupiedRes.rows[0].count, 10);
        const lotsLibres          = parseInt(freeRes.rows[0].count, 10);
        const reservationsEnAttente = parseInt(reservedRes.rows[0].count, 10);
        const tauxOccupation      = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const loyersEncaisses     = parseFloat(encaissesRes.rows[0].total) || 0;
        const loyersAttendus      = parseFloat(attendusRes.rows[0].total) || 0;
        const loyersImpayes       = Math.max(0, loyersAttendus - loyersEncaisses);
        const contratsActifs      = parseInt(contratsRes.rows[0].count, 10);
        const plaintesOuvertes    = parseInt(plaintesRes.rows[0].count, 10);
        const montantARecouvrer   = parseFloat(recouvrementRes.rows[0].total) || 0;
        const echelonementsEnRetard = 0;

        const getStatus = (type: string, value: number, total?: number): KPIStatus => {
            switch (type) {
                case 'occupation':   return value >= 80 ? 'success' : value >= 50 ? 'warning' : 'danger';
                case 'impayes':
                case 'recouvrement': return value === 0 ? 'success' : value < (total || 100000) ? 'warning' : 'danger';
                case 'plaintes':     return value === 0 ? 'success' : value <= 3 ? 'warning' : 'danger';
                case 'echelonements': return value === 0 ? 'success' : value <= 2 ? 'warning' : 'danger';
                default:             return 'success';
            }
        };

        return {
            kpis: [
                { id: 'total_biens',          label: 'Nombre total de biens',       value: totalBiens,         status: 'success',                                       icon: 'Building2',     modulePath: '/biens' },
                { id: 'lots_occupation',       label: 'Lots occupés (sur total)',    value: `${lotsOccupes} / ${totalLots}`, status: getStatus('occupation', tauxOccupation), icon: 'Home',          modulePath: '/biens' },
                { id: 'loyers_encaisses',      label: 'Loyers encaissés (mois)',     value: loyersEncaisses,    status: loyersEncaisses >= loyersAttendus * 0.8 ? 'success' : loyersEncaisses >= loyersAttendus * 0.5 ? 'warning' : 'danger', icon: 'Wallet', modulePath: '/paiements' },
                { id: 'loyers_impayes',        label: 'Loyers impayés',              value: loyersImpayes,      status: getStatus('impayes', loyersImpayes, loyersAttendus * 0.2),    icon: 'AlertTriangle', modulePath: '/paiements' },
                { id: 'taux_occupation',       label: "Taux d'occupation",           value: `${tauxOccupation}%`, status: getStatus('occupation', tauxOccupation),       icon: 'Percent',       modulePath: '/biens' },
                { id: 'contrats_actifs',       label: 'Contrats actifs',             value: contratsActifs,     status: 'success',                                       icon: 'FileText',      modulePath: '/locataires' },
                { id: 'plaintes_ouvertes',     label: 'Plaintes ouvertes',           value: plaintesOuvertes,   status: getStatus('plaintes', plaintesOuvertes),         icon: 'MessageCircle', modulePath: '/alertes' },
                { id: 'reservations',          label: 'Réservations en attente',     value: reservationsEnAttente, status: reservationsEnAttente > 0 ? 'warning' : 'success', icon: 'Calendar',   modulePath: '/biens' },
                { id: 'recouvrement',          label: 'Montant à recouvrer',         value: montantARecouvrer,  status: getStatus('recouvrement', montantARecouvrer, loyersAttendus * 0.3), icon: 'DollarSign', modulePath: '/paiements' },
                { id: 'echelonements_retard',  label: 'Échelonnements en retard',    value: echelonementsEnRetard, status: getStatus('echelonements', echelonementsEnRetard), icon: 'Clock',      modulePath: '/paiements' },
            ],
            summary: {
                totalBiens, totalLots, lotsOccupes, lotsLibres, tauxOccupation,
                loyersEncaisses, loyersImpayes, contratsActifs, plaintesOuvertes,
                reservationsEnAttente, montantARecouvrer, echelonementsEnRetard,
            },
        };
    }

    static async getChartData(
        dbClient: PoolClient,
        validOwnerIds: number[],
        isAdmin: boolean,
        period: string
    ): Promise<{ chartData: ChartPoint[]; period: string }> {
        let interval: string;
        switch (period) {
            case '7d':  interval = '7 days';   break;
            case '30d': interval = '30 days';  break;
            case '90d': interval = '90 days';  break;
            case '1y':  interval = '1 year';   break;
            default:    interval = '6 months';
        }

        const p = isAdmin || validOwnerIds.length === 0 ? [] as any[] : [validOwnerIds];
        const ownerFilter = isAdmin ? 'TRUE' : validOwnerIds.length > 0 ? 'owner_id = ANY($1::int[])' : 'FALSE';

        const [revenusRes, depensesRes] = await Promise.all([
            dbClient.query(`
                SELECT TO_CHAR(date_paiement, 'Mon') as name,
                       EXTRACT(MONTH FROM date_paiement) as month_num,
                       COALESCE(SUM(montant), 0) as revenus
                FROM payments
                WHERE date_paiement >= CURRENT_DATE - INTERVAL '${interval}'
                AND statut = 'valide' AND ${ownerFilter}
                GROUP BY TO_CHAR(date_paiement, 'Mon'), EXTRACT(MONTH FROM date_paiement)
                ORDER BY month_num
            `, p),
            dbClient.query(`
                SELECT TO_CHAR(date_expense, 'Mon') as name,
                       EXTRACT(MONTH FROM date_expense) as month_num,
                       COALESCE(SUM(amount), 0) as depenses
                FROM expenses
                WHERE date_expense >= CURRENT_DATE - INTERVAL '${interval}'
                AND ${ownerFilter}
                GROUP BY TO_CHAR(date_expense, 'Mon'), EXTRACT(MONTH FROM date_expense)
                ORDER BY month_num
            `, p),
        ]);

        const monthNames: Record<number, string> = {
            1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
            7: 'Juil', 8: 'Août', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc',
        };

        const dataMap = new Map<number, ChartPoint>();
        revenusRes.rows.forEach((row: any) => {
            const m = parseInt(row.month_num);
            dataMap.set(m, { name: monthNames[m] || row.name, revenus: parseFloat(row.revenus) || 0, depenses: 0 });
        });
        depensesRes.rows.forEach((row: any) => {
            const m = parseInt(row.month_num);
            const existing = dataMap.get(m);
            if (existing) existing.depenses = parseFloat(row.depenses) || 0;
            else dataMap.set(m, { name: monthNames[m] || row.name, revenus: 0, depenses: parseFloat(row.depenses) || 0 });
        });

        let chartData = Array.from(dataMap.entries()).sort((a, b) => a[0] - b[0]).map(([, d]) => d);

        if (chartData.length === 0) {
            const now = new Date();
            chartData = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                return { name: monthNames[d.getMonth() + 1] || 'N/A', revenus: 0, depenses: 0 };
            });
        }

        return { chartData, period };
    }

    static async getActivity(
        dbClient: PoolClient,
        validOwnerIds: number[],
        isAdmin: boolean,
        userRole: string,
        userId: number
    ): Promise<ActivityItem[]> {
        let paymentWhere = 'TRUE';
        let leaseWhere   = 'TRUE';
        let ticketWhere  = 'TRUE';
        let activityParams: any[] = [];

        if (userRole === 'locataire') {
            const userRes = await dbClient.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userRes.rows.length === 0) return [];

            const tenantRes = await dbClient.query('SELECT id FROM tenants WHERE email = $1', [userRes.rows[0].email]);
            if (tenantRes.rows.length === 0) return [];

            const leaseRes = await dbClient.query('SELECT id FROM leases WHERE tenant_id = $1', [tenantRes.rows[0].id]);
            if (leaseRes.rows.length === 0) return [];

            const leaseIds = leaseRes.rows.map((r: any) => r.id);
            paymentWhere = `p.lease_id = ANY($1::int[])`;
            leaseWhere   = `l.id = ANY($1::int[])`;
            ticketWhere  = `l.id = ANY($1::int[])`;
            activityParams = [leaseIds];
        } else if (!isAdmin) {
            if (validOwnerIds.length === 0) return [];
            paymentWhere = `p.owner_id = ANY($1::int[])`;
            leaseWhere   = `l.owner_id = ANY($1::int[])`;
            ticketWhere  = `l.owner_id = ANY($1::int[])`;
            activityParams = [validOwnerIds];
        }

        const [payments, leases, tickets] = await Promise.all([
            dbClient.query(`
                SELECT p.id, 'payment' as type, 'Paiement reçu' as title,
                       CONCAT(t.prenoms, ' ', t.nom, ' - ', p.type) as description, p.created_at
                FROM payments p JOIN leases l ON p.lease_id = l.id JOIN tenants t ON l.tenant_id = t.id
                WHERE ${paymentWhere} ORDER BY p.created_at DESC LIMIT 5
            `, activityParams),
            dbClient.query(`
                SELECT l.id, 'contract' as type, 'Nouveau bail' as title,
                       CONCAT(lo.ref_lot, ' - ', t.prenoms, ' ', t.nom) as description, l.created_at
                FROM leases l JOIN tenants t ON l.tenant_id = t.id JOIN lots lo ON l.lot_id = lo.id
                WHERE ${leaseWhere} ORDER BY l.created_at DESC LIMIT 5
            `, activityParams),
            dbClient.query(`
                SELECT t.id, 'intervention' as type, CONCAT('Ticket: ', t.titre) as title,
                       t.description, t.created_at
                FROM tickets t JOIN leases l ON t.lease_id = l.id
                WHERE ${ticketWhere} ORDER BY t.created_at DESC LIMIT 5
            `, activityParams).catch(() => ({ rows: [] as any[] })),
        ]);

        return [...payments.rows, ...leases.rows, ...tickets.rows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
    }

    static async getFeaturedProperties(
        dbClient: PoolClient,
        validOwnerIds: number[],
        isAdmin: boolean
    ): Promise<FeaturedProperty[]> {
        const fpParams    = isAdmin ? [] : [validOwnerIds];
        const whereClause = isAdmin ? 'TRUE' : 'b.owner_id = ANY($1::int[])';

        const result = await dbClient.query(`
            SELECT b.id, b.nom, b.ville, b.quartier,
                   COUNT(l.id) as total_units,
                   SUM(CASE WHEN l.statut = 'occupe' THEN 1 ELSE 0 END) as occupied_units,
                   (NULLIF(b.photos, '[]')::jsonb->0) as main_photo
            FROM buildings b LEFT JOIN lots l ON b.id = l.building_id
            WHERE ${whereClause}
            GROUP BY b.id
            ORDER BY occupied_units DESC, total_units DESC
            LIMIT 4
        `, fpParams);

        return result.rows.map((row: any) => ({
            id:        row.id,
            name:      row.nom,
            location:  `${row.quartier || ''}, ${row.ville || ''}`,
            units:     parseInt(row.total_units) || 0,
            occupancy: row.total_units > 0
                ? Math.round((parseInt(row.occupied_units) / parseInt(row.total_units)) * 100)
                : 0,
            image:  row.main_photo ? row.main_photo.replace(/"/g, '') : null,
            status: 'Actif',
        }));
    }
}
