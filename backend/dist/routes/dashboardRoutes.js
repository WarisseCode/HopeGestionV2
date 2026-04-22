"use strict";
// backend/routes/dashboardRoutes.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dotenv = __importStar(require("dotenv"));
const tenantGuard_1 = require("../middleware/tenantGuard");
dotenv.config();
const router = (0, express_1.Router)();
// GET /api/dashboard/stats/gestionnaire : Stats globales pour le gestionnaire
router.get('/stats/gestionnaire', tenantGuard_1.tenantGuard, async (req, res) => {
    if (!['gestionnaire', 'admin', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, lotsOccupes: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0, locatairesActifs: 0 }
            });
        }
        const ownerFilter = isAdmin ? '1=1' : `owner_id IN (${validOwnerIds.join(',')})`;
        const leaseFilter = isAdmin ? '1=1' : `l.owner_id IN (${validOwnerIds.join(',')})`;
        const [buildingsResult, lotsResult, occupiedResult, revenusResult, impayesResult, tenantsResult] = await Promise.all([
            dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'occupe' AND ${ownerFilter}`),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total
                FROM payments
                WHERE ${ownerFilter}
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            `),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
                FROM leases l
                WHERE ${leaseFilter} AND l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p
                    WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                )
            `),
            dbClient.query(`SELECT COUNT(DISTINCT tenant_id) FROM leases WHERE statut = 'actif' AND ${ownerFilter}`)
        ]);
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);
        const totalLots = parseInt(lotsResult.rows[0].count, 10);
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const revenusMois = parseFloat(revenusResult.rows[0].total) || 0;
        const impayesEnCours = parseFloat(impayesResult.rows[0].total) || 0;
        const locatairesActifs = parseInt(tenantsResult.rows[0].count, 10);
        res.status(200).json({
            stats: { totalBiens, totalLots, lotsOccupes, tauxOccupation, revenusMois, impayesEnCours, locatairesActifs }
        });
    }
    catch (error) {
        console.error('Erreur récupération stats gestionnaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/stats/manager : Stats filtrées par propriétaires assignés
router.get('/stats/manager', tenantGuard_1.tenantGuard, async (req, res) => {
    if (!['gestionnaire', 'admin', 'manager'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, lotsOccupes: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0, locatairesActifs: 0 }
            });
        }
        const ownerFilter = isAdmin ? '1=1' : `owner_id IN (${validOwnerIds.join(',')})`;
        const leaseFilter = isAdmin ? '1=1' : `l.owner_id IN (${validOwnerIds.join(',')})`;
        const [buildingsResult, lotsResult, occupiedResult, revenusResult, impayesResult, tenantsResult] = await Promise.all([
            dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'occupe' AND ${ownerFilter}`),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total
                FROM payments
                WHERE ${ownerFilter}
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            `),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
                FROM leases l
                WHERE ${leaseFilter} AND l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p
                    WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                    AND EXTRACT(YEAR FROM p.date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                )
            `),
            dbClient.query(`SELECT COUNT(DISTINCT tenant_id) FROM leases WHERE statut = 'actif' AND ${ownerFilter}`)
        ]);
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);
        const totalLots = parseInt(lotsResult.rows[0].count, 10);
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const revenusMois = parseFloat(revenusResult.rows[0].total) || 0;
        const impayesEnCours = parseFloat(impayesResult.rows[0].total) || 0;
        const locatairesActifs = parseInt(tenantsResult.rows[0].count, 10);
        res.status(200).json({
            stats: { totalBiens, totalLots, lotsOccupes, tauxOccupation, revenusMois, impayesEnCours, locatairesActifs }
        });
    }
    catch (error) {
        console.error('Erreur récupération stats manager:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/stats/proprietaire : Stats filtrées par owner_id
router.get('/stats/proprietaire', tenantGuard_1.tenantGuard, async (req, res) => {
    if (!['proprietaire', 'gestionnaire', 'admin'].includes(req.userRole || '')) {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    try {
        if (validOwnerIds.length === 0) {
            return res.status(200).json({
                stats: { totalBiens: 0, totalLots: 0, tauxOccupation: 0, revenusMois: 0, impayesEnCours: 0 }
            });
        }
        const ownerId = validOwnerIds[0];
        const [buildingsResult, lotsResult, occupiedResult, revenusResult, impayesResult] = await Promise.all([
            dbClient.query('SELECT COUNT(*) FROM buildings WHERE owner_id = $1', [ownerId]),
            dbClient.query('SELECT COUNT(*) FROM lots WHERE owner_id = $1', [ownerId]),
            dbClient.query("SELECT COUNT(*) FROM lots WHERE owner_id = $1 AND statut = 'occupe'", [ownerId]),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total
                FROM payments
                WHERE owner_id = $1
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
            `, [ownerId]),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
                FROM leases l
                WHERE l.owner_id = $1 AND l.statut = 'actif'
                AND NOT EXISTS (
                    SELECT 1 FROM payments p
                    WHERE p.lease_id = l.id
                    AND EXTRACT(MONTH FROM p.date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                )
            `, [ownerId])
        ]);
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);
        const totalLots = parseInt(lotsResult.rows[0].count, 10);
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const revenusMois = parseFloat(revenusResult.rows[0].total) || 0;
        const impayesEnCours = parseFloat(impayesResult.rows[0].total) || 0;
        res.status(200).json({
            stats: { totalBiens, totalLots, lotsOccupes, tauxOccupation, revenusMois, impayesEnCours }
        });
    }
    catch (error) {
        console.error('Erreur récupération stats propriétaire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/stats/locataire : Stats pour un locataire (support multi-dossiers)
router.get('/stats/locataire', tenantGuard_1.tenantGuard, async (req, res) => {
    if (req.userRole !== 'locataire') {
        return res.status(403).json({ message: 'Accès refusé.' });
    }
    const dbClient = req.dbClient;
    const userId = req.userId;
    try {
        // Trouver TOUS les tenants associés à cet utilisateur
        const tenantResult = await dbClient.query(`
            SELECT t.id, t.nom, t.prenoms
            FROM tenants t
            WHERE t.user_id = $1
        `, [userId]);
        let tenants = tenantResult.rows;
        // Liaison auto par email/tel si pas de lien direct
        if (tenants.length === 0) {
            const userResult = await dbClient.query('SELECT email, telephone FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
                const { email, telephone } = userResult.rows[0];
                const fallbackTenant = await dbClient.query(`
                    SELECT id, nom, prenoms FROM tenants
                    WHERE email = $1 OR telephone_principal = $2
                `, [email, telephone]);
                if (fallbackTenant.rows.length > 0) {
                    tenants = fallbackTenant.rows;
                }
            }
        }
        if (tenants.length === 0) {
            return res.status(200).json({
                stats: { nomLogement: 'Aucun logement', loyerMensuel: 0, prochainPaiement: null, statutContrat: 'inactif' }
            });
        }
        const tenantIds = tenants.map((t) => t.id);
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
            return res.status(200).json({
                stats: { nomLogement: 'Aucun bail actif', loyerMensuel: 0, prochainPaiement: null, statutContrat: 'inactif' }
            });
        }
        let totalLoyerMensuel = 0;
        let nextPaymentDate = null;
        let logementsNames = [];
        let leaseIds = [];
        for (const lease of leaseResult.rows) {
            totalLoyerMensuel += parseFloat(lease.loyer_actuel) || 0;
            logementsNames.push(`${lease.ref_lot} (${lease.nom_immeuble})`);
            leaseIds.push(lease.id);
            const today = new Date();
            const jourEcheance = lease.jour_echeance || 5;
            let np = new Date(today.getFullYear(), today.getMonth(), jourEcheance);
            if (np < today)
                np = new Date(today.getFullYear(), today.getMonth() + 1, jourEcheance);
            if (!nextPaymentDate || np < nextPaymentDate)
                nextPaymentDate = np;
        }
        const paymentsResult = await dbClient.query(`
            SELECT id, montant, date_paiement, type, method, status
            FROM payments
            WHERE lease_id = ANY($1)
            ORDER BY date_paiement DESC
            LIMIT 10
        `, [leaseIds]);
        const combinedPayments = paymentsResult.rows.map((p) => ({
            id: p.id,
            amount: parseFloat(p.montant),
            date: p.date_paiement,
            status: 'paid',
            month: new Date(p.date_paiement).toLocaleString('fr-FR', { month: 'long' })
        }));
        const nomLogementDisplay = logementsNames.length > 1
            ? `${logementsNames.length} Logements actifs`
            : logementsNames[0];
        return res.status(200).json({
            stats: {
                nomLogement: nomLogementDisplay,
                loyerMensuel: totalLoyerMensuel,
                prochainPaiement: nextPaymentDate ? nextPaymentDate.toISOString().split('T')[0] : null,
                statutContrat: 'actif',
                dateDebut: leaseResult.rows[0].date_debut,
                dateFin: leaseResult.rows[0].date_fin,
                recentPayments: combinedPayments
            }
        });
    }
    catch (error) {
        console.error('Erreur récupération stats locataire:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/kpi : KPIs complets avec statuts dynamiques
router.get('/kpi', tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.status(200).json({
                kpis: [],
                summary: {
                    totalBiens: 0, totalLots: 0, lotsOccupes: 0, lotsLibres: 0,
                    tauxOccupation: 0, loyersEncaisses: 0, loyersImpayes: 0,
                    contratsActifs: 0, plaintesOuvertes: 0, reservationsEnAttente: 0,
                    montantARecouvrer: 0, echelonementsEnRetard: 0
                }
            });
        }
        const ownerFilter = isAdmin ? '1=1' : `owner_id IN (${validOwnerIds.join(',')})`;
        const leaseFilter = isAdmin ? '1=1' : `l.owner_id IN (${validOwnerIds.join(',')})`;
        const lotFilter = isAdmin ? 'TRUE' : `l.owner_id IN (${validOwnerIds.join(',')})`;
        const [buildingsResult, lotsResult, occupiedResult, freeResult, reservedResult, loyersEncaissesResult, loyersAttendusResult, contratsResult, plaintesResult, recouvrementResult] = await Promise.all([
            dbClient.query(`SELECT COUNT(*) FROM buildings WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'occupe' AND ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'disponible' AND ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM lots WHERE statut = 'reserve' AND ${ownerFilter}`),
            dbClient.query(`
                SELECT COALESCE(SUM(montant), 0) as total
                FROM payments
                WHERE type = 'Loyer' AND ${ownerFilter}
                AND EXTRACT(MONTH FROM date_paiement) = EXTRACT(MONTH FROM CURRENT_DATE)
                AND EXTRACT(YEAR FROM date_paiement) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND statut = 'valide'
            `),
            dbClient.query(`SELECT COALESCE(SUM(loyer_actuel), 0) as total FROM leases WHERE statut = 'actif' AND ${ownerFilter}`),
            dbClient.query(`SELECT COUNT(*) FROM leases WHERE statut = 'actif' AND ${ownerFilter}`),
            dbClient.query(`
                SELECT COUNT(*) FROM tickets t
                JOIN lots l ON t.lot_id = l.id
                WHERE t.statut = 'ouvert' AND ${lotFilter}
            `),
            dbClient.query(`
                SELECT COALESCE(SUM(l.loyer_actuel), 0) as total
                FROM leases l
                WHERE l.statut = 'actif' AND ${leaseFilter}
                AND NOT EXISTS (
                    SELECT 1 FROM payments p
                    WHERE p.lease_id = l.id AND p.type = 'Loyer' AND p.statut = 'valide'
                    AND p.date_paiement >= DATE_TRUNC('month', CURRENT_DATE)
                )
            `)
        ]);
        const totalBiens = parseInt(buildingsResult.rows[0].count, 10);
        const totalLots = parseInt(lotsResult.rows[0].count, 10);
        const lotsOccupes = parseInt(occupiedResult.rows[0].count, 10);
        const lotsLibres = parseInt(freeResult.rows[0].count, 10);
        const reservationsEnAttente = parseInt(reservedResult.rows[0].count, 10);
        const tauxOccupation = totalLots > 0 ? Math.round((lotsOccupes / totalLots) * 100) : 0;
        const loyersEncaisses = parseFloat(loyersEncaissesResult.rows[0].total) || 0;
        const loyersAttendus = parseFloat(loyersAttendusResult.rows[0].total) || 0;
        const loyersImpayes = Math.max(0, loyersAttendus - loyersEncaisses);
        const contratsActifs = parseInt(contratsResult.rows[0].count, 10);
        const plaintesOuvertes = parseInt(plaintesResult.rows[0].count, 10);
        const montantARecouvrer = parseFloat(recouvrementResult.rows[0].total) || 0;
        const echelonementsEnRetard = 0;
        const getStatus = (type, value, total) => {
            switch (type) {
                case 'occupation':
                    if (value >= 80)
                        return 'success';
                    if (value >= 50)
                        return 'warning';
                    return 'danger';
                case 'impayes':
                case 'recouvrement':
                    if (value === 0)
                        return 'success';
                    if (value < (total || 100000))
                        return 'warning';
                    return 'danger';
                case 'plaintes':
                    if (value === 0)
                        return 'success';
                    if (value <= 3)
                        return 'warning';
                    return 'danger';
                case 'echelonements':
                    if (value === 0)
                        return 'success';
                    if (value <= 2)
                        return 'warning';
                    return 'danger';
                default:
                    return 'success';
            }
        };
        res.status(200).json({
            kpis: [
                { id: 'total_biens', label: 'Nombre total de biens', value: totalBiens, status: 'success', icon: 'Building2', modulePath: '/biens' },
                { id: 'lots_occupation', label: 'Lots occupés / libres', value: `${lotsOccupes} / ${lotsLibres}`, status: getStatus('occupation', tauxOccupation), icon: 'Home', modulePath: '/biens' },
                { id: 'loyers_encaisses', label: 'Loyers encaissés (mois)', value: loyersEncaisses, status: loyersEncaisses >= loyersAttendus * 0.8 ? 'success' : loyersEncaisses >= loyersAttendus * 0.5 ? 'warning' : 'danger', icon: 'Wallet', modulePath: '/paiements' },
                { id: 'loyers_impayes', label: 'Loyers impayés', value: loyersImpayes, status: getStatus('impayes', loyersImpayes, loyersAttendus * 0.2), icon: 'AlertTriangle', modulePath: '/paiements' },
                { id: 'taux_occupation', label: "Taux d'occupation", value: `${tauxOccupation}%`, status: getStatus('occupation', tauxOccupation), icon: 'Percent', modulePath: '/biens' },
                { id: 'contrats_actifs', label: 'Contrats actifs', value: contratsActifs, status: 'success', icon: 'FileText', modulePath: '/locataires' },
                { id: 'plaintes_ouvertes', label: 'Plaintes ouvertes', value: plaintesOuvertes, status: getStatus('plaintes', plaintesOuvertes), icon: 'MessageCircle', modulePath: '/alertes' },
                { id: 'reservations', label: 'Réservations en attente', value: reservationsEnAttente, status: reservationsEnAttente > 0 ? 'warning' : 'success', icon: 'Calendar', modulePath: '/biens' },
                { id: 'recouvrement', label: 'Montant à recouvrer', value: montantARecouvrer, status: getStatus('recouvrement', montantARecouvrer, loyersAttendus * 0.3), icon: 'DollarSign', modulePath: '/paiements' },
                { id: 'echelonements_retard', label: 'Échelonnements en retard', value: echelonementsEnRetard, status: getStatus('echelonements', echelonementsEnRetard), icon: 'Clock', modulePath: '/paiements' }
            ],
            summary: {
                totalBiens, totalLots, lotsOccupes, lotsLibres, tauxOccupation,
                loyersEncaisses, loyersImpayes, contratsActifs, plaintesOuvertes,
                reservationsEnAttente, montantARecouvrer, echelonementsEnRetard
            }
        });
    }
    catch (error) {
        console.error('Erreur récupération KPIs:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des KPIs.' });
    }
});
// GET /api/dashboard/chart-data : Données pour les graphiques (revenus/dépenses par mois)
router.get('/chart-data', tenantGuard_1.tenantGuard, async (req, res) => {
    const period = req.query.period || '6m';
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        let interval;
        switch (period) {
            case '7d':
                interval = '7 days';
                break;
            case '30d':
                interval = '30 days';
                break;
            case '90d':
                interval = '90 days';
                break;
            case '1y':
                interval = '1 year';
                break;
            default: interval = '6 months';
        }
        const ownerFilter = isAdmin ? '1=1' : (validOwnerIds.length > 0 ? `owner_id IN (${validOwnerIds.join(',')})` : '1=0');
        const revenusResult = await dbClient.query(`
            SELECT
                TO_CHAR(date_paiement, 'Mon') as name,
                EXTRACT(MONTH FROM date_paiement) as month_num,
                COALESCE(SUM(montant), 0) as revenus
            FROM payments
            WHERE date_paiement >= CURRENT_DATE - INTERVAL '${interval}'
            AND statut = 'valide' AND ${ownerFilter}
            GROUP BY TO_CHAR(date_paiement, 'Mon'), EXTRACT(MONTH FROM date_paiement)
            ORDER BY month_num
        `);
        const depensesResult = await dbClient.query(`
            SELECT
                TO_CHAR(date_expense, 'Mon') as name,
                EXTRACT(MONTH FROM date_expense) as month_num,
                COALESCE(SUM(amount), 0) as depenses
            FROM expenses
            WHERE date_expense >= CURRENT_DATE - INTERVAL '${interval}'
            AND ${ownerFilter}
            GROUP BY TO_CHAR(date_expense, 'Mon'), EXTRACT(MONTH FROM date_expense)
            ORDER BY month_num
        `);
        const monthNames = {
            1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
            7: 'Juil', 8: 'Août', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc'
        };
        const dataMap = new Map();
        revenusResult.rows.forEach((row) => {
            const monthNum = parseInt(row.month_num);
            dataMap.set(monthNum, { name: monthNames[monthNum] || row.name, revenus: parseFloat(row.revenus) || 0, depenses: 0 });
        });
        depensesResult.rows.forEach((row) => {
            const monthNum = parseInt(row.month_num);
            const existing = dataMap.get(monthNum);
            if (existing) {
                existing.depenses = parseFloat(row.depenses) || 0;
            }
            else {
                dataMap.set(monthNum, { name: monthNames[monthNum] || row.name, revenus: 0, depenses: parseFloat(row.depenses) || 0 });
            }
        });
        const chartData = Array.from(dataMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([_, data]) => data);
        if (chartData.length === 0) {
            const now = new Date();
            const emptyData = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                emptyData.push({ name: monthNames[d.getMonth() + 1] || 'N/A', revenus: 0, depenses: 0 });
            }
            return res.json({ chartData: emptyData, period });
        }
        res.json({ chartData, period });
    }
    catch (error) {
        console.error('Erreur récupération chart-data:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/activity : Fil d'actualité (Paiements, Baux, Tickets)
router.get('/activity', tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        let paymentWhere = '1=1';
        let leaseWhere = '1=1';
        let ticketWhere = '1=1';
        if (req.userRole === 'locataire') {
            const userResult = await dbClient.query('SELECT email FROM users WHERE id = $1', [req.userId]);
            if (userResult.rows.length === 0)
                return res.json({ activities: [] });
            const tenantResult = await dbClient.query('SELECT id FROM tenants WHERE email = $1', [userResult.rows[0].email]);
            if (tenantResult.rows.length === 0)
                return res.json({ activities: [] });
            const tenantId = tenantResult.rows[0].id;
            const leaseResult = await dbClient.query('SELECT id FROM leases WHERE tenant_id = $1', [tenantId]);
            if (leaseResult.rows.length === 0)
                return res.json({ activities: [] });
            const leaseIds = leaseResult.rows.map((r) => r.id);
            paymentWhere = `p.lease_id IN (${leaseIds.join(',')})`;
            leaseWhere = `l.id IN (${leaseIds.join(',')})`;
            ticketWhere = `l.id IN (${leaseIds.join(',')})`;
        }
        else if (!isAdmin) {
            if (validOwnerIds.length === 0)
                return res.json({ activities: [] });
            const ownerList = validOwnerIds.join(',');
            paymentWhere = `p.owner_id IN (${ownerList})`;
            leaseWhere = `l.owner_id IN (${ownerList})`;
            ticketWhere = `l.owner_id IN (${ownerList})`;
        }
        const [payments, leases, tickets] = await Promise.all([
            dbClient.query(`
                SELECT p.id, 'payment' as type, 'Paiement reçu' as title,
                    CONCAT(t.prenoms, ' ', t.nom, ' - ', p.type) as description,
                    p.created_at as created_at
                FROM payments p
                JOIN leases l ON p.lease_id = l.id
                JOIN tenants t ON l.tenant_id = t.id
                WHERE ${paymentWhere}
                ORDER BY p.created_at DESC LIMIT 5
            `),
            dbClient.query(`
                SELECT l.id, 'contract' as type, 'Nouveau bail' as title,
                    CONCAT(lo.ref_lot, ' - ', t.prenoms, ' ', t.nom) as description,
                    l.created_at as created_at
                FROM leases l
                JOIN tenants t ON l.tenant_id = t.id
                JOIN lots lo ON l.lot_id = lo.id
                WHERE ${leaseWhere}
                ORDER BY l.created_at DESC LIMIT 5
            `),
            dbClient.query(`
                SELECT t.id, 'intervention' as type, CONCAT('Ticket: ', t.titre) as title,
                    t.description as description, t.created_at as created_at
                FROM tickets t
                JOIN leases l ON t.lease_id = l.id
                WHERE ${ticketWhere}
                ORDER BY t.created_at DESC LIMIT 5
            `).catch(() => ({ rows: [] }))
        ]);
        const allActivities = [...payments.rows, ...leases.rows, ...tickets.rows]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);
        res.json({ activities: allActivities });
    }
    catch (error) {
        console.error('Error fetching dashboard activity:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// GET /api/dashboard/featured-properties : Biens en vedette
router.get('/featured-properties', tenantGuard_1.tenantGuard, async (req, res) => {
    const dbClient = req.dbClient;
    const validOwnerIds = req.validOwnerIds || [];
    const isAdmin = req.userRole === 'admin';
    try {
        if (!isAdmin && validOwnerIds.length === 0) {
            return res.json({ properties: [] });
        }
        const whereClause = isAdmin ? '1=1' : `b.owner_id IN (${validOwnerIds.join(',')})`;
        const result = await dbClient.query(`
            SELECT
                b.id, b.nom, b.ville, b.quartier,
                COUNT(l.id) as total_units,
                SUM(CASE WHEN l.statut = 'occupe' THEN 1 ELSE 0 END) as occupied_units,
                (NULLIF(b.photos, '[]')::jsonb->0) as main_photo
            FROM buildings b
            LEFT JOIN lots l ON b.id = l.building_id
            WHERE ${whereClause}
            GROUP BY b.id
            ORDER BY occupied_units DESC, total_units DESC
            LIMIT 4
        `);
        const properties = result.rows.map((row) => ({
            id: row.id,
            name: row.nom,
            location: `${row.quartier || ''}, ${row.ville || ''}`,
            units: parseInt(row.total_units) || 0,
            occupancy: row.total_units > 0 ? Math.round((parseInt(row.occupied_units) / parseInt(row.total_units)) * 100) : 0,
            image: row.main_photo ? row.main_photo.replace(/"/g, '') : null,
            status: 'Actif'
        }));
        res.json({ properties });
    }
    catch (error) {
        console.error('Error fetching featured properties:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
