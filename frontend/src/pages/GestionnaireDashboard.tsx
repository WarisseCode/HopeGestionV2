// frontend/src/pages/GestionnaireDashboard.tsx
// Refonte T-056 (maquette T-055) : un seul niveau de chiffres clés (plus de bandeau qui répétait
// les KPI), une carte « Actions rapides » (T-057, à la place de « À traiter »), des flux revenus/dépenses en couleurs distinctes, des biens triés
// par besoin d'attention, et une mise en page pilotée par la largeur réelle du contenu (container queries).
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Wallet,
  FileText,
  Plus,
  RefreshCw,
  TrendingUp,
  Bell,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Wrench,
  AlertCircle,
  Home,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useUser } from '../contexts/UserContext';
import {
  PeriodFilter,
  DashboardSkeleton,
  ChartSkeleton
} from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { Period } from '../components/dashboard/PeriodFilter';
import Button from '../components/ui/Button';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';
import { getToken } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import { withCreateAction } from '../hooks/useCreateFromUrl';
import EmptyState from '../components/ui/EmptyState';
import LoadErrorState from '../components/ui/LoadErrorState';

// --- Types for API Data ---
interface KPIData {
    id: string;
    label: string;
    value: string | number;
    status: 'success' | 'warning' | 'danger';
    icon: string;
    modulePath: string;
}

// Agrégats renvoyés par /dashboard/kpi à côté de la liste (déjà présents côté API, inutilisés jusqu'ici)
interface KPISummary {
    totalBiens: number; totalLots: number; lotsOccupes: number; lotsLibres: number;
    tauxOccupation: number; loyersEncaisses: number; loyersImpayes: number;
    contratsActifs: number; plaintesOuvertes: number; reservationsEnAttente: number;
    montantARecouvrer: number;
}

// Élément brut de /dashboard/activity (DashboardService.getActivity)
interface RawActivity {
    id: number;
    type: Activity['type'];
    title: string;
    description: string;
    created_at: string;
    montant?: number | null;
}

interface WatchedProperty {
    id: number;
    name: string;
    location: string;
    units: number;
    occupancy: number;
    image: string | null;
}

// Graduations des axes : même teinte que text-base-content/70, suit le thème clair/sombre (T-054a)
const AXIS_TICK_FILL = 'color-mix(in oklab, var(--color-base-content) 70%, transparent)';

// Séries du graphique : bleu (secondary) et ambre (warning) diffèrent en teinte ET en clarté
// dans les deux thèmes (63 %/77 % en clair, 71 %/83 % en sombre) ; les deux bleus d'avant se confondaient.
const REVENUE_COLOR = 'var(--color-secondary)';
const EXPENSE_COLOR = 'var(--color-warning)';

const OUTLINE_BTN = 'whitespace-nowrap inline-flex items-center justify-center gap-1.5 min-h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm font-semibold text-base-content hover:bg-base-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

// L'ancien modulePath '/paiements' menait à une page inexistante (404) : les paiements sont dans Finances
const resolveModulePath = (modulePath: string) => {
    const path = modulePath.startsWith('/') ? modulePath : `/${modulePath}`;
    return path === '/paiements' ? '/finances' : path;
};

// « , Cotonou » quand le quartier est vide côté API : on retire les morceaux vides
const cleanLocation = (location: string) =>
    location.split(',').map(s => s.trim()).filter(Boolean).join(', ');

const activityStyle = (type: Activity['type']) => {
    switch (type) {
        case 'payment':      return { icon: Wallet, cls: 'bg-success text-success-content' };
        case 'reminder':     return { icon: Clock, cls: 'bg-warning text-warning-content' };
        case 'alert':        return { icon: AlertCircle, cls: 'bg-error text-error-content' };
        case 'contract':     return { icon: FileText, cls: 'bg-info text-info-content' };
        case 'property':     return { icon: Home, cls: 'bg-primary text-primary-content' };
        case 'intervention': return { icon: Wrench, cls: 'bg-secondary text-secondary-content' };
        default:             return { icon: AlertCircle, cls: 'bg-base-300 text-base-content' };
    }
};

// Carte d'indicateur : un vrai <button> (clavier, lecteur d'écran) qui mène au module concerné
const StatCard: React.FC<{
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ label, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        className="group w-full h-full text-left bg-base-100 rounded-2xl p-5 border border-base-300/70 hover:border-primary/40 hover:shadow-md transition-all flex flex-col gap-2.5 min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
        <span className="text-sm font-medium text-base-content/70">{label}</span>
        {children}
    </button>
);

const ProgressBar: React.FC<{ value: number; className: string }> = ({ value, className }) => (
    <span className="block h-1.5 rounded-full bg-base-200 dark:bg-base-300 overflow-hidden" aria-hidden="true">
        <span className={`block h-full rounded-full ${className}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
);

const GestionnaireDashboard: React.FC = () => {
  const { stats, loading: userLoading } = useUser();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // States
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // Échec du chargement des KPI, distinct d'un compte sans indicateur (200 + kpis: []) (T-047)
  const [kpiError, setKpiError] = useState<string | null>(null);
  // null = inconnu (chargement ou échec) : la ligne « Alertes » est alors masquée plutôt qu'à 0
  const [alertsCount, setAlertsCount] = useState<number | null>(null);

  const goToKpi = (id: string, fallback: string) => {
      if (id === 'lots_occupation') {
          navigate('/dashboard/biens?tab=lots');
          return;
      }
      const kpi = kpis.find(k => k.id === id);
      navigate(`/dashboard${resolveModulePath(kpi?.modulePath ?? fallback)}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Fetch KPIs. L'API calcule les KPI sur le mois en cours quelle que soit la période :
  // le filtre de période ne pilote donc que le graphique (il est placé dans sa carte).
  useEffect(() => {
    const fetchKPIs = async () => {
      setIsLoadingKpis(true);
      setKpiError(null);
      try {
        const data = await apiCall<{ kpis: KPIData[]; summary?: KPISummary }>(`${API_URL}/dashboard/kpi`);
        setKpis(data.kpis);
        setSummary(data.summary ?? null);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        setKpis([]);
        setSummary(null);
        // Chaîne vide => LoadErrorState affiche son message de repli traduit
        setKpiError((error as Error)?.message || '');
      } finally {
        setIsLoadingKpis(false);
      }
    };

    fetchKPIs();
  }, [stats, refreshKey]);

  // Nombre d'alertes (même source que le badge du menu, DashboardLayout)
  useEffect(() => {
    let cancelled = false;
    getAlerts()
      .then(({ alerts }) => { if (!cancelled) setAlertsCount(alerts.length); })
      .catch((error) => {
        console.error('Error fetching alerts count', error);
        if (!cancelled) setAlertsCount(null);
      });
    return () => { cancelled = true; };
  }, [refreshKey]);


  // Fetch chart data and other dashboard widgets
  const [chartData, setChartData] = useState<{ name: string; revenus: number; depenses: number }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [watchedProperties, setWatchedProperties] = useState<WatchedProperty[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  // Erreur par widget (null = pas d'erreur) : un 500 s'affichait comme un état vide
  // (« Pas encore assez de données », « Aucun bien en vedette »…) (T-047)
  const [widgetErrors, setWidgetErrors] = useState<{ chart: string | null; activity: string | null; properties: string | null }>({ chart: null, activity: null, properties: null });
  // Relance des widgets par « Réessayer », sans recharger la page (T-047)
  const [widgetsRetryKey, setWidgetsRetryKey] = useState(0);
  const retryWidgets = () => setWidgetsRetryKey(k => k + 1);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingChart(true);
      setLoadingWidgets(true);
      setWidgetErrors({ chart: null, activity: null, properties: null });
      const token = getToken();

      if (!token) {
        setChartData([{ name: 'N/A', revenus: 0, depenses: 0 }]);
        setIsLoadingChart(false);
        setLoadingWidgets(false);
        return;
      }

      // r.ok vérifié : sans cela, le corps d'un 500 ({ message }) passait pour une réponse vide (T-047)
      const fetchJson = (url: string) => fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(async r => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.message || '');
        return body;
      });
      const reason = (res: PromiseSettledResult<unknown>) =>
        res.status === 'rejected' ? ((res.reason as Error)?.message || '') : null;

      try {
        // allSettled : l'échec d'un widget n'empêche pas l'affichage des deux autres
        const [chartResult, activityResult, propertiesResult] = await Promise.allSettled([
            fetchJson(`${API_URL}/dashboard/chart-data?period=${period}`),
            fetchJson(`${API_URL}/dashboard/activity`),
            // sort=attention : moins occupés d'abord (T-056) ; une API plus ancienne ignore le paramètre,
            // le tri côté client ci-dessous garde alors l'ordre « à surveiller »
            fetchJson(`${API_URL}/dashboard/featured-properties?sort=attention`),
        ]);
        setWidgetErrors({ chart: reason(chartResult), activity: reason(activityResult), properties: reason(propertiesResult) });
        const chartRes = chartResult.status === 'fulfilled' ? chartResult.value : {};
        const activityRes = activityResult.status === 'fulfilled' ? activityResult.value : {};
        const propertiesRes = propertiesResult.status === 'fulfilled' ? propertiesResult.value : {};

        if (chartRes.chartData) setChartData(chartRes.chartData);
        if (activityRes.activities) {
             const mappedActivities = activityRes.activities.map((a: RawActivity) => ({
                 id: a.id,
                 type: a.type,
                 title: a.title,
                 // Le montant + l'heure précise permettent de distinguer deux entrées
                 // du même jour pour le même locataire (ex. paiements échelonnés).
                 description: a.montant != null
                     ? `${a.description} · ${fmt(a.montant)} FCFA`
                     : a.description,
                 time: new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                     + ', ' + new Date(a.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
             }));
             setActivities(mappedActivities);
        }
        if (propertiesRes.properties) {
            setWatchedProperties(
                (propertiesRes.properties as WatchedProperty[])
                    .filter(p => p.units > 0)
                    .sort((a, b) => a.occupancy - b.occupancy || b.units - a.units)
            );
        }

      } catch (error) {
        console.error('Error fetching dashboard widgets:', error);
      } finally {
        setIsLoadingChart(false);
        setLoadingWidgets(false);
      }
    };

    fetchDashboardData();
  }, [period, widgetsRetryKey]);

  const refreshAll = () => {
      setRefreshKey(k => k + 1);
      retryWidgets();
  };

  const periodLabel =
      period === '7d' ? t('dashboard.period7d') :
      period === '30d' ? t('dashboard.period30d') :
      period === '90d' ? t('dashboard.period90d') :
      period === '1y' ? t('dashboard.period1y') : t('dashboard.periodAll');

  // Totaux de la période affichée, calculés sur les points du graphique (mêmes données que les barres)
  const chartTotals = useMemo(() => {
      const revenus = chartData.reduce((s, d) => s + (Number(d.revenus) || 0), 0);
      const depenses = chartData.reduce((s, d) => s + (Number(d.depenses) || 0), 0);
      return { revenus, depenses, solde: revenus - depenses };
  }, [chartData]);

  // Recouvrement du mois. L'API ne renvoie pas les loyers attendus, mais impayés = max(0, attendus − encaissés) :
  // si impayés > 0, attendus = encaissés + impayés ; si impayés = 0, tout l'attendu est encaissé (100 %).
  const collection = useMemo(() => {
      if (!summary) return null;
      const encaisses = summary.loyersEncaisses;
      const impayes = summary.loyersImpayes;
      if (encaisses === 0 && impayes === 0) return { rate: null as number | null, remaining: 0 };
      const rate = impayes > 0 ? Math.round((encaisses / (encaisses + impayes)) * 100) : 100;
      return { rate, remaining: impayes };
  }, [summary]);

  // Actions rapides (T-057) : déplacées de l'en-tête vers la carte qui remplace « À traiter »
  const quickActions = [
      { key: 'payment', icon: Wallet, label: t('dashboard.actionRecordPayment'), hint: t('dashboard.actionRecordPaymentHint'), path: withCreateAction('/dashboard/finances'), primary: true },
      { key: 'property', icon: Plus, label: t('dashboard.actionNewProperty'), hint: t('dashboard.actionNewPropertyHint'), path: withCreateAction('/dashboard/biens'), primary: false },
      { key: 'tenant', icon: Users, label: t('dashboard.actionNewTenant'), hint: t('dashboard.actionNewTenantHint'), path: withCreateAction('/dashboard/locataires'), primary: false },
      { key: 'lease', icon: FileText, label: t('dashboard.actionNewLease'), hint: t('dashboard.actionNewLeaseHint'), path: withCreateAction('/dashboard/contrats'), primary: false },
  ];

  // Show full skeleton while user context loads
  if (userLoading) {
    return <DashboardSkeleton type="gestionnaire" />;
  }

  const todayRaw = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  return (
    <motion.div
      // @container : les colonnes suivent la largeur réelle du contenu (menu latéral ouvert ou replié),
      // pas celle de l'écran
      className="@container space-y-6 max-w-[1700px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête : titre, « Dashboard · date », alertes mises en avant ; les actions sont dans la carte « Actions rapides » */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Même clé que le menu et le fil d'Ariane (« Bureau » / « Dashboard ») (T-054b) */}
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            {t('nav.bureau')}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-1.5 text-base-content/70 font-medium">
            <span>{t('dashboard.subtitleLabel')} · {today}</span>
            {alertsCount !== null && (alertsCount > 0 ? (
              // Pastille cliquable : l'information urgente de l'en-tête doit se voir et mener aux alertes
              <button
                type="button"
                onClick={() => navigate('/dashboard/alertes')}
                className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full bg-error/15 ring-1 ring-error/50 text-sm font-semibold text-base-content hover:bg-error/25 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="relative flex w-2 h-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-error opacity-60 animate-ping motion-reduce:hidden" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-error" />
                </span>
                <Bell size={14} className="text-error" aria-hidden="true" />
                {t('dashboard.alertsPending', { count: alertsCount })}
              </button>
            ) : (
              <span>· {t('dashboard.nothingUrgent')}</span>
            ))}
          </div>
        </div>

        <button type="button" onClick={refreshAll} aria-label={t('common.refresh')} title={t('common.refresh')} className={`${OUTLINE_BTN} min-w-11 px-0 shrink-0`}>
            <RefreshCw size={16} aria-hidden="true" />
        </button>
      </motion.div>

      {/* KPI : 4 mesures distinctes, chacune avec son contexte (le bandeau qui les répétait est retiré) */}
      <motion.div variants={itemVariants}>
          {isLoadingKpis ? (
            <div role="status" aria-label="Chargement" className="grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-base-100 rounded-2xl p-5 border border-base-300/70 animate-pulse motion-reduce:animate-none!">
                  <div className="w-28 h-4 bg-base-300 rounded mb-3" />
                  <div className="w-36 h-8 bg-base-300 rounded mb-3" />
                  <div className="w-full h-1.5 bg-base-300 rounded mb-3" />
                  <div className="w-40 h-3 bg-base-300 rounded" />
                </div>
              ))}
            </div>
          ) : kpiError !== null ? (
            // Vrai échec : message et « Réessayer » qui relance la requête (plus de reload) (T-047)
            <div className="py-8">
              <LoadErrorState message={kpiError} onRetry={() => setRefreshKey(k => k + 1)} />
            </div>
          ) : kpis.length === 0 || !summary ? (
            // 200 sans indicateur (compte neuf) : accueil, pas « Données indisponibles » (T-047)
            <div className="py-8">
              <EmptyState
                icon={<Building2 size={48} />}
                title={t('dashboard.noKpisTitle')}
                description={t('dashboard.noKpisDesc')}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 @xl:grid-cols-2 @5xl:grid-cols-4 gap-4">
                <StatCard label={`${t('dashboard.rentsCollected')} · ${t('dashboard.thisMonth')}`} onClick={() => goToKpi('loyers_encaisses', '/finances')}>
                    <span className="text-2xl @7xl:text-3xl font-bold tracking-tight tabular-nums break-words">
                        {fmt(summary.loyersEncaisses)} <span className="text-sm font-semibold text-base-content/70">FCFA</span>
                    </span>
                    {collection?.rate != null && <ProgressBar value={collection.rate} className="bg-secondary" />}
                    <span className="text-sm text-base-content/70">
                        {collection?.rate == null
                            ? t('dashboard.noRentExpected')
                            : collection.remaining > 0
                                ? t('dashboard.collectedRate', { rate: collection.rate, remaining: fmt(collection.remaining) })
                                : t('dashboard.collectedAll')}
                    </span>
                </StatCard>

                <StatCard label={t('dashboard.occupancyTitle')} onClick={() => goToKpi('lots_occupation', '/biens')}>
                    <span className="text-2xl @7xl:text-3xl font-bold tracking-tight tabular-nums">{summary.tauxOccupation} %</span>
                    <ProgressBar value={summary.tauxOccupation} className="bg-primary" />
                    <span className="text-sm text-base-content/70 tabular-nums">
                        {t('dashboard.lotsOccupiedOf', { occupied: fmt(summary.lotsOccupes), total: fmt(summary.totalLots) })}
                        {' · '}{t('dashboard.lotsAvailable', { count: summary.lotsLibres })}
                    </span>
                </StatCard>

                <StatCard label={`${t('dashboard.unpaidTitle')} · ${t('dashboard.thisMonth')}`} onClick={() => goToKpi('loyers_impayes', '/finances')}>
                    <span className="text-2xl @7xl:text-3xl font-bold tracking-tight tabular-nums break-words">
                        {fmt(summary.loyersImpayes)} <span className="text-sm font-semibold text-base-content/70">FCFA</span>
                    </span>
                    {summary.loyersImpayes === 0 ? (
                        <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-base-content">
                            <CheckCircle2 size={14} className="text-success" aria-hidden="true" /> {t('dashboard.noUnpaid')}
                        </span>
                    ) : (
                        <span className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-error/15 text-base-content">
                            <AlertTriangle size={14} className="text-error" aria-hidden="true" /> {t('dashboard.unpaidToFollow')}
                        </span>
                    )}
                </StatCard>

                <StatCard label={t('dashboard.portfolio')} onClick={() => goToKpi('total_biens', '/biens')}>
                    <span className="text-2xl @7xl:text-3xl font-bold tracking-tight tabular-nums">
                        {fmt(summary.totalBiens)} <span className="text-sm font-semibold text-base-content/70">{t('dashboard.buildingsUnit')}</span>
                    </span>
                    <span className="text-sm text-base-content/70 tabular-nums">
                        {t('dashboard.portfolioDetail', { lots: fmt(summary.totalLots), leases: fmt(summary.contratsActifs) })}
                    </span>
                </StatCard>
            </div>
          )}
      </motion.div>

      {/* Ligne 2 : flux financiers (2/3) + À traiter (1/3), empilés quand le contenu est étroit */}
      <div className="grid grid-cols-1 @5xl:grid-cols-3 gap-6">
            <motion.section variants={itemVariants} aria-labelledby="flux-title" className="@5xl:col-span-2 min-w-0">
              {isLoadingChart ? (
                <ChartSkeleton height={350} />
              ) : (
                <div className="bg-base-100 rounded-2xl p-5 @xl:p-6 border border-base-300/70 h-full">
                    <div className="flex flex-col @xl:flex-row @xl:items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                            <h2 id="flux-title" className="text-lg font-bold text-base-content">{t('dashboard.financialFlows')}</h2>
                            <p className="text-sm text-base-content/70">{t('dashboard.revenueVsExpenses')} · {periodLabel}</p>
                        </div>
                        {/* Libellés courts (7j, 30j…) : la version longue est dans le sous-titre ci-dessus */}
                        <PeriodFilter value={period} onChange={setPeriod} compact showIcon={false} className="self-start" />
                    </div>
                    {widgetErrors.chart !== null ? (
                      <LoadErrorState message={widgetErrors.chart} onRetry={retryWidgets} className="border-none" />
                    ) : chartData.length < 2 ? (
                      <EmptyState
                        icon={<TrendingUp size={32} />}
                        title={t('dashboard.notEnoughDataTitle')}
                        description={t('dashboard.notEnoughDataDesc')}
                        className="border-none"
                      />
                    ) : (
                    <>
                    <div className="flex gap-4 text-sm text-base-content/80 mb-2" aria-hidden="true">
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: REVENUE_COLOR }} />{t('dashboard.revenue')}</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: EXPENSE_COLOR }} />{t('dashboard.expenses')}</span>
                    </div>
                    <div className="h-[260px] @xl:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" vertical={false} />
                            {/* Graduations : couleur de texte secondaire du thème (T-054a) ; minTickGap évite les dates qui se chevauchent */}
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} dy={8} minTickGap={12} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }} width={44} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                            <Tooltip
                                cursor={{ fill: 'color-mix(in oklab, var(--color-base-content) 6%, transparent)' }}
                                contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-base-300)', background: 'var(--color-base-100)', color: 'var(--color-base-content)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)' }}
                                formatter={(value, name) => [`${Number(value).toLocaleString('fr-FR')} FCFA`, name]}
                                labelStyle={{ color: 'var(--color-base-content)', marginBottom: '0.4rem', fontWeight: 600 }}
                                // Valeurs en couleur de texte : l'ambre des dépenses sur fond clair tombait sous 2:1
                                itemStyle={{ color: 'var(--color-base-content)' }}
                            />
                            <Bar dataKey="revenus"  name={t('dashboard.revenue')}  fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="depenses" name={t('dashboard.expenses')} fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <dl className="grid grid-cols-1 @md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-base-300/70">
                        <div><dt className="text-xs text-base-content/70">{t('dashboard.revenue')}</dt><dd className="font-bold tabular-nums">{fmt(chartTotals.revenus)} FCFA</dd></div>
                        <div><dt className="text-xs text-base-content/70">{t('dashboard.expenses')}</dt><dd className="font-bold tabular-nums">{fmt(chartTotals.depenses)} FCFA</dd></div>
                        <div><dt className="text-xs text-base-content/70">{t('dashboard.netBalance')}</dt><dd className="font-bold tabular-nums">{chartTotals.solde > 0 ? '+' : ''}{fmt(chartTotals.solde)} FCFA</dd></div>
                    </dl>
                    </>
                    )}
                </div>
              )}
            </motion.section>

            <motion.section variants={itemVariants} aria-labelledby="actions-title" className="bg-base-100 rounded-2xl p-5 @xl:p-6 border border-base-300/70 min-w-0 flex flex-col">
                <h2 id="actions-title" className="text-lg font-bold text-base-content mb-3">{t('dashboard.quickActionsTitle')}</h2>
                {/* 2×2 dans la colonne de droite ; sur une ligne de 4 quand la carte prend toute la largeur (contenu moyen) */}
                <ul className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4 @5xl:grid-cols-2 gap-3 flex-1 auto-rows-fr">
                    {quickActions.map(a => (
                        <li key={a.key} className="min-w-0">
                            <button
                                type="button"
                                onClick={() => navigate(a.path)}
                                className={`w-full h-full min-h-24 flex flex-col items-start justify-between gap-3 p-4 rounded-xl text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                    a.primary
                                        ? 'bg-primary text-primary-content hover:bg-primary/90'
                                        : 'bg-base-200/70 dark:bg-base-200 text-base-content hover:bg-base-200 dark:hover:bg-base-300'}`}
                            >
                                <span className={`w-10 h-10 rounded-lg inline-flex items-center justify-center ${a.primary ? 'bg-primary-content/15' : 'bg-base-100'}`} aria-hidden="true">
                                    <a.icon size={20} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold break-words">{a.label}</span>
                                    <span className={`block text-xs mt-0.5 break-words ${a.primary ? 'text-primary-content/90' : 'text-base-content/70'}`}>{a.hint}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </motion.section>
      </div>

      {/* Ligne 3 : biens à surveiller (2/3) + activité récente (1/3) */}
      <div className="grid grid-cols-1 @5xl:grid-cols-3 gap-6">
            <motion.section variants={itemVariants} aria-labelledby="watch-title" className="@5xl:col-span-2 bg-base-100 rounded-2xl p-5 @xl:p-6 border border-base-300/70 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                        <h2 id="watch-title" className="text-lg font-bold text-base-content">{t('dashboard.watchProperties')}</h2>
                        <p className="text-sm text-base-content/70">{t('dashboard.watchSubtitle')}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-primary gap-1 min-h-11" onClick={() => navigate('/dashboard/biens')}>
                        {t('dashboard.allProperties')} <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                </div>

                {loadingWidgets ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-base-300 rounded-xl animate-pulse motion-reduce:animate-none!" />)}
                    </div>
                ) : widgetErrors.properties !== null ? (
                    <LoadErrorState message={widgetErrors.properties} onRetry={retryWidgets} className="border-none" />
                ) : watchedProperties.length > 0 ? (
                    // Liste plutôt que tableau : pas de défilement horizontal sur mobile, noms jamais tronqués
                    <ul className="divide-y divide-base-300/70">
                        {watchedProperties.map(property => {
                            const barClass = property.occupancy >= 80 ? 'bg-success' : property.occupancy >= 50 ? 'bg-warning' : 'bg-error';
                            return (
                            <li key={property.id}>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/dashboard/biens?id=${property.id}`)}
                                    className="w-full grid grid-cols-[48px_minmax(0,1fr)] @lg:grid-cols-[48px_minmax(0,1fr)_minmax(140px,30%)] items-center gap-x-3 gap-y-2 py-3 text-left rounded-lg hover:bg-base-200/60 dark:hover:bg-base-200 px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    <span className="w-12 h-12 rounded-lg bg-base-300 overflow-hidden row-span-2 @lg:row-span-1 shrink-0">
                                        {property.image ? (
                                            <img src={property.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="w-full h-full flex items-center justify-center text-base-content/50"><Building2 size={20} aria-hidden="true" /></span>
                                        )}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-semibold text-base-content break-words">{property.name}</span>
                                        <span className="block text-xs text-base-content/70 break-words">
                                            {cleanLocation(property.location)}{cleanLocation(property.location) ? ' · ' : ''}{property.units} {t('dashboard.lots').toLowerCase()}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-2.5 col-start-2 @lg:col-start-3">
                                        {/* Texte masqué plutôt qu'aria-label : interdit sur un span sans rôle (axe aria-prohibited-attr, T-054a) */}
                                        <span className="sr-only">{t('dashboard.occupancyOf', { rate: property.occupancy })}</span>
                                        <span className="flex-1" aria-hidden="true"><ProgressBar value={property.occupancy} className={barClass} /></span>
                                        <span className="w-14 text-right text-sm font-semibold tabular-nums whitespace-nowrap text-base-content" aria-hidden="true">{property.occupancy} %</span>
                                    </span>
                                </button>
                            </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-base-content/70 bg-base-200 rounded-xl">{t('dashboard.noWatchProperties')}</p>
                )}
            </motion.section>

            <motion.section variants={itemVariants} aria-labelledby="activity-title" className="bg-base-100 rounded-2xl p-5 @xl:p-6 border border-base-300/70 min-w-0">
                <h2 id="activity-title" className="text-lg font-bold text-base-content mb-3">{t('dashboard.recentActivity')}</h2>
                {loadingWidgets ? (
                     <div className="space-y-3">
                         {[1, 2, 3].map(i => <div key={i} className="h-14 bg-base-300 rounded-xl animate-pulse motion-reduce:animate-none!" />)}
                     </div>
                ) : widgetErrors.activity !== null ? (
                    <LoadErrorState message={widgetErrors.activity} onRetry={retryWidgets} className="border-none" />
                ) : activities.length > 0 ? (
                    // Rendu local (et non ActivityFeed, partagé avec d'autres tableaux de bord) : textes renvoyés à la ligne au lieu d'être tronqués
                    <ul className="divide-y divide-base-300/70">
                        {activities.slice(0, 5).map(activity => {
                            const { icon: Icon, cls } = activityStyle(activity.type);
                            return (
                                <li key={`${activity.type}-${activity.id}`} className="flex gap-3 py-3">
                                    <span className={`shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center ${cls}`} aria-hidden="true">
                                        <Icon size={14} strokeWidth={2.5} />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                                            <span className="text-sm font-semibold text-base-content break-words">{activity.title}</span>
                                            <span className="text-xs text-base-content/70 whitespace-nowrap tabular-nums">{activity.time}</span>
                                        </span>
                                        <span className="block text-sm text-base-content/80 break-words">{activity.description}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-center text-base-content/70 py-4">{t('dashboard.noRecentActivity')}</p>
                )}
            </motion.section>
      </div>
    </motion.div>
  );
};

export default GestionnaireDashboard;
