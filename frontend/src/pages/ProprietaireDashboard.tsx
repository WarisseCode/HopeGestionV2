// frontend/src/pages/ProprietaireDashboard.tsx
// Portail propriétaire — mode observateur lecture seule.
// Le propriétaire visualise la gestion de ses biens menée par le gestionnaire.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Wallet, AlertCircle, Users,
    TrendingUp, TrendingDown, Eye, ArrowRight,
    RefreshCw, Calendar, CheckCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useUser } from '../contexts/UserContext';
import { getToken } from '../api/authApi';
import { API_URL } from '../config';
import { DashboardSkeleton, KPICard, PeriodFilter, UpcomingEvents } from '../components/dashboard';
import type { Period } from '../components/dashboard/PeriodFilter';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const ProprietaireDashboard: React.FC = () => {
    const { user, stats, loading } = useUser();
    const navigate = useNavigate();
    const [period, setPeriod] = useState<Period>('30d');
    const [chartData, setChartData] = useState<{ name: string; revenus: number; depenses: number }[]>([]);
    const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
    const [loadingWidgets, setLoadingWidgets] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    React.useEffect(() => {
        const fetchData = async () => {
            setLoadingWidgets(true);
            const token = getToken();
            if (!token) { setLoadingWidgets(false); return; }
            try {
                const [chartRes, propsRes] = await Promise.all([
                    fetch(`${API_URL}/dashboard/chart-data?period=${period}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(r => r.json()),
                    fetch(`${API_URL}/dashboard/featured-properties`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(r => r.json())
                ]);
                if (chartRes.chartData) setChartData(chartRes.chartData);
                if (propsRes.properties) setFeaturedProperties(propsRes.properties);
                setLastRefresh(new Date());
            } catch (e) {
                console.error('Error fetching dashboard data:', e);
            } finally {
                setLoadingWidgets(false);
            }
        };
        fetchData();
    }, [period]);

    const occupationData = useMemo(() => [
        { name: 'Occupé', value: stats?.tauxOccupation || 0, color: '#0d9488' },
        { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 0), color: '#e2e8f0' },
    ], [stats]);

    const upcomingEvents: UpcomingEvent[] = [
        { id: 1, type: 'rent', title: 'Prochaine facturation', description: 'Cycle mensuel des loyers', date: '05 du mois', daysUntil: 5 },
    ];

    if (loading) return <DashboardSkeleton type="proprietaire" />;

    const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
    const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.3 } } };

    return (
        <motion.div className="space-y-6 max-w-[1400px] mx-auto" variants={container} initial="hidden" animate="visible">

            {/* ── Header ── */}
            <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-base-content tracking-tight">
                        Bonjour, {user?.nom || 'Propriétaire'} 👋
                    </h1>
                    <p className="text-sm text-base-content/50 mt-0.5 flex items-center gap-1.5">
                        <Eye size={13} />
                        Vue en lecture seule — gestion assurée par votre gestionnaire
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <PeriodFilter value={period} onChange={setPeriod} compact />
                    <button
                        onClick={() => setPeriod(p => p)}
                        className="btn btn-ghost btn-sm btn-circle"
                        title="Actualiser"
                    >
                        <RefreshCw size={15} className={loadingWidgets ? 'animate-spin' : ''} />
                    </button>
                    <span className="hidden sm:block text-xs text-base-content/30">
                        {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </motion.div>

            {/* ── Bannière financière ── */}
            <motion.div variants={item}>
                <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 rounded-2xl p-6 text-white shadow-xl overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white rounded-full" />
                        <div className="absolute -bottom-12 -left-8 w-48 h-48 bg-white rounded-full" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Revenus encaissés ce mois</p>
                            <p className="text-4xl font-extrabold tracking-tight">{formatCurrency(stats?.revenusMois || 0)}</p>
                            <div className="flex items-center gap-1.5 mt-2">
                                <CheckCircle size={13} className="text-green-300" />
                                <span className="text-white/60 text-sm">Loyers validés par votre gestionnaire</span>
                            </div>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            {[
                                { label: 'Biens',      value: stats?.totalBiens || 0,                          unit: 'actifs',    warn: false },
                                { label: 'Occupation', value: `${stats?.tauxOccupation || 0}%`,                unit: 'des lots',  warn: false },
                                { label: 'Impayés',    value: formatCurrency(stats?.impayesEnCours || 0),      unit: 'en attente', warn: true },
                            ].map(({ label, value, unit, warn }) => (
                                <div key={label} className={`px-4 py-3 rounded-xl text-center min-w-[100px] ${warn ? 'bg-orange-400/20 border border-orange-300/30' : 'bg-white/10'}`}>
                                    <p className="text-white/60 text-[11px] uppercase tracking-wide">{label}</p>
                                    <p className={`text-lg font-bold ${warn ? 'text-orange-200' : 'text-white'}`}>{value}</p>
                                    <p className="text-white/40 text-[10px]">{unit}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── KPIs ── */}
            <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard icon={Building2}   label="Biens sous gestion" value={stats?.totalBiens || 0}                     color="blue" />
                <KPICard icon={Users}       label="Taux d'occupation"  value={`${stats?.tauxOccupation || 0}%`}           color="green" />
                <KPICard icon={Wallet}      label="Revenus du mois"    value={formatCurrency(stats?.revenusMois || 0)}    color="teal" />
                <KPICard icon={AlertCircle} label="Impayés en cours"   value={formatCurrency(stats?.impayesEnCours || 0)} color="orange" />
            </motion.div>

            {/* ── Contenu principal ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Colonne gauche 2/3 */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Graphique revenus */}
                    <motion.div variants={item}>
                        <Card className="border-none shadow-lg bg-base-100">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="font-bold text-base-content">Performance Financière</h3>
                                    <p className="text-xs text-base-content/50 mt-0.5">Évolution des revenus locatifs</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-base-content/40">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-teal-500 rounded-full inline-block" />Revenus</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-orange-400 rounded-full inline-block" />Dépenses</span>
                                </div>
                            </div>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradDep" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#fb923c" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 12 }}
                                            formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} FCFA`]}
                                        />
                                        <Area type="monotone" dataKey="revenus"  stroke="#0d9488" strokeWidth={2.5} fill="url(#gradRev)" name="Revenus" />
                                        <Area type="monotone" dataKey="depenses" stroke="#fb923c" strokeWidth={2}   fill="url(#gradDep)" name="Dépenses" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Mes propriétés */}
                    <motion.div variants={item}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-base-content flex items-center gap-2">
                                <Building2 size={17} className="text-teal-500" /> Vos Propriétés
                            </h3>
                            <button
                                onClick={() => navigate('/dashboard/biens')}
                                className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors"
                            >
                                Voir tout <ArrowRight size={13} />
                            </button>
                        </div>

                        {loadingWidgets ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map(i => <div key={i} className="h-24 bg-base-200 rounded-2xl animate-pulse" />)}
                            </div>
                        ) : featuredProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {featuredProperties.map(p => (
                                    <div
                                        key={p.id}
                                        className="bg-base-100 rounded-2xl p-4 border border-base-200 shadow-sm flex gap-4 hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group"
                                        onClick={() => navigate('/dashboard/biens')}
                                    >
                                        <div className="w-20 h-20 rounded-xl bg-base-200 overflow-hidden shrink-0">
                                            {p.image
                                                ? <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                : <div className="w-full h-full flex items-center justify-center text-base-content/20"><Building2 size={26} /></div>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0 py-1">
                                            <h4 className="font-bold text-base-content truncate text-sm">{p.name}</h4>
                                            <p className="text-xs text-base-content/50 truncate mb-2">{p.location}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs bg-teal-50 text-teal-600 font-semibold px-2 py-0.5 rounded-lg">{p.units} lots</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${p.occupancy >= 80 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {p.occupancy}% occupé
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-base-100 rounded-2xl border border-dashed border-base-300 p-8 text-center text-base-content/40">
                                <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Aucune propriété enregistrée</p>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Colonne droite 1/3 */}
                <div className="space-y-5">

                    {/* Taux occupation */}
                    <motion.div variants={item}>
                        <Card className="border-none shadow-lg bg-base-100">
                            <h3 className="font-bold text-base-content">Taux d'Occupation</h3>
                            <p className="text-xs text-base-content/40 mb-3">Global — tous lots confondus</p>
                            <div className="h-[160px] relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={occupationData} innerRadius={50} outerRadius={65} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                                            {occupationData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-extrabold text-base-content">{stats?.tauxOccupation || 0}%</span>
                                    <span className="text-[10px] text-base-content/40 uppercase tracking-wide">Loué</span>
                                </div>
                            </div>
                            <div className="flex justify-around mt-1">
                                {[{ label: 'Occupé', val: `${stats?.tauxOccupation || 0}%`, color: 'bg-teal-500' },
                                  { label: 'Vacant',  val: `${100 - (stats?.tauxOccupation || 0)}%`, color: 'bg-base-300' }]
                                .map(({ label, val, color }) => (
                                    <div key={label} className="text-center">
                                        <div className={`w-2 h-2 ${color} rounded-full mx-auto mb-1`} />
                                        <p className="text-xs text-base-content/50">{label}</p>
                                        <p className="text-sm font-bold text-base-content">{val}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Consultation rapide */}
                    <motion.div variants={item}>
                        <Card className="border-none shadow-lg bg-base-100">
                            <h3 className="font-bold text-base-content mb-3">Consultation Rapide</h3>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'Mes Locataires', path: '/dashboard/locataires', icon: Users,      color: 'text-teal-500 bg-teal-50' },
                                    { label: 'Mes Finances',   path: '/dashboard/finances',   icon: Wallet,     color: 'text-green-500 bg-green-50' },
                                    { label: 'Mes Documents',  path: '/dashboard/documents',  icon: Building2,  color: 'text-teal-500 bg-teal-50' },
                                    { label: 'Mes Rapports',   path: '/dashboard/rapports',   icon: TrendingUp, color: 'text-orange-500 bg-orange-50' },
                                ].map(({ label, path, icon: Icon, color }) => (
                                    <button
                                        key={path}
                                        onClick={() => navigate(path)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-200 transition-colors group text-left"
                                    >
                                        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                                            <Icon size={14} />
                                        </div>
                                        <span className="text-sm font-medium text-base-content/80 group-hover:text-base-content flex-1">{label}</span>
                                        <ArrowRight size={13} className="text-base-content/30 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Échéances */}
                    <motion.div variants={item}>
                        <Card className="border-none shadow-lg bg-base-100">
                            <h3 className="font-bold text-base-content mb-3 flex items-center gap-2">
                                <Calendar size={15} className="text-teal-400" /> Prochaines Échéances
                            </h3>
                            <UpcomingEvents events={upcomingEvents} userType="proprietaire" />
                        </Card>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProprietaireDashboard;
