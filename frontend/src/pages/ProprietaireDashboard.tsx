// frontend/src/pages/ProprietaireDashboard.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Home, 
  Wallet, 
  AlertCircle, 
  Eye, 
  Users,
  Download,
  RefreshCw,
  Copy
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { useUser } from '../contexts/UserContext';
import { getToken } from '../api/authApi';
import { API_URL } from '../config';
import { ActivityFeed, DashboardSkeleton, PeriodFilter, KPICard, QuickActions, UpcomingEvents } from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { Period } from '../components/dashboard/PeriodFilter';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';

const ProprietaireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const [managerCode, setManagerCode] = useState<string | null>(null);

  // Fetch Manager Code
  React.useEffect(() => {
      const fetchCode = async () => {
          const token = getToken();
          console.log('[ProprietaireDashboard] fetchCode: token exists?', !!token);
          if (!token) return;
          try {
              const url = `${API_URL}/auth/manager-code`;
              console.log('[ProprietaireDashboard] fetchCode: calling', url);
              const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              console.log('[ProprietaireDashboard] fetchCode: status=', res.status);
              const data = await res.json();
              console.log('[ProprietaireDashboard] fetchCode: response=', JSON.stringify(data));
              if (res.ok && data.managerCode) {
                  setManagerCode(data.managerCode);
              } else {
                  console.warn('[ProprietaireDashboard] fetchCode: managerCode is null/empty', data);
              }
          } catch (e) { 
              console.error('[ProprietaireDashboard] fetchCode error:', e); 
          }
      };
      if (user) {
          fetchCode();
      }
  }, [user]);


  // New State for Real Data
  const [chartData, setChartData] = useState<{ name: string; revenus: number; depenses: number }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  // Fetch Dashboard Data
  React.useEffect(() => {
    const fetchData = async () => {
      setLoadingWidgets(true);
      const token = getToken();
      if (!token) {
        setLoadingWidgets(false);
        return;
      }

      try {
        const [chartRes, activityRes, propsRes] = await Promise.all([
          fetch(`${API_URL}/dashboard/chart-data?period=${period}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API_URL}/dashboard/activity`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
          fetch(`${API_URL}/dashboard/featured-properties`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]);

        if (chartRes.chartData) setChartData(chartRes.chartData);
        
        if (activityRes.activities) {
             const mappedActivities = activityRes.activities.map((a: any) => ({
                 id: a.id,
                 type: a.type,
                 title: a.title,
                 description: a.description,
                 time: new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
             }));
             setActivities(mappedActivities);
        }

        if (propsRes.properties) setFeaturedProperties(propsRes.properties);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoadingWidgets(false);
      }
    };

    fetchData();
  }, [period]);

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

  // Chart Data
  const revenusData = useMemo(() => {
      if (chartData.length > 0) return chartData;
      return []; 
  }, [chartData]);


  const occupationData = [
    { name: 'Occupé', value: stats?.tauxOccupation || 0, color: '#3f51b5' },
    { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 0), color: '#e2e8f0' },
  ];

  // Événements à venir (Mock for now, or fetch if endpoint available)
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Échéance loyer', description: 'Prochain cycle de facturation', date: '05 du mois', daysUntil: 5 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (loading) {
    return <DashboardSkeleton type="proprietaire" />;
  }

  // Calculate totals from Chart Data or Stats
  // Use stats for consistency if available, otherwise chart sum
  const totalRevenus = stats?.revenusMois || 0;
  // const totalDepenses = revenusData.reduce((sum, d) => sum + d.depenses, 0); // Charts might be empty
  const revenuNet = totalRevenus; // Simplified for now

  return (
    <motion.div 
      className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            {user?.nom || 'Propriétaire'} <span className="text-secondary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Bonjour {user?.nom || 'Propriétaire'}, voici la performance de votre patrimoine.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
            {/* Period Filter */}
            <PeriodFilter value={period} onChange={setPeriod} compact />

            {/* Manager Code Badge */}
            {managerCode && (
                <div 
                    className="bg-base-100 px-4 py-2 rounded-full shadow-sm border border-base-300 flex items-center gap-2 cursor-pointer hover:bg-base-200 transition-colors group" 
                    onClick={() => {
                        navigator.clipboard.writeText(managerCode);
                        alert(`Code ${managerCode} copié !`);
                    }}
                    title="Cliquez pour copier votre code agence"
                >
                    <span className="text-xs text-base-content/60 font-medium uppercase">Code Agence:</span>
                    <span className="font-bold text-primary font-mono tracking-wider">{managerCode}</span>
                    <Copy size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
                </div>
            )}

            {/* Export Button */}
            <Button variant="ghost" className="gap-2">
              <Download size={16} />
              Exporter
            </Button>
        </div>
      </motion.div>

      {/* Financial Summary Banner */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-base-100 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-base-100 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">Revenus ce mois</p>
              <p className="text-3xl font-bold">{formatCurrency(revenuNet)}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center bg-base-100/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Revenus bruts</p>
                <p className="text-lg font-bold">{formatCurrency(totalRevenus)}</p>
              </div>
              <div className="text-center bg-base-100/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Impayés</p>
                <p className="text-lg font-bold text-orange-300">{formatCurrency(stats?.impayesEnCours || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <KPICard 
          icon={Building2} 
          label="Patrimoine" 
          value={stats?.totalBiens || 0} 
          color="blue" 
          trend={{ value: "Actifs", label: "biens sous gestion", positive: true }}
        />
        <KPICard 
          icon={Users} 
          label="Taux d'Occupation" 
          value={`${stats?.tauxOccupation || 0}%`} 
          color="green" 
          trend={{ value: "Global", label: "sur tous les lots", positive: true }}
        />
        <KPICard 
          icon={Wallet} 
          label="Revenus du Mois" 
          value={formatCurrency(stats?.revenusMois || 0)} 
          color="purple" 
          trend={{ value: "Encaissé", label: "ce mois-ci", positive: true }}
        />
        <KPICard 
          icon={AlertCircle} 
          label="Impayés" 
          value={formatCurrency(stats?.impayesEnCours || 0)} 
          color="orange" 
          trend={{ value: "Attention", label: "Loyers en retard", positive: false }}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Charts) - 2/3 width */}
        <div className="xl:col-span-2 space-y-8">
            
             {/* Finance Chart */}
             <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-none shadow-xl bg-base-100">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-base-content/90">Performance Financière</h3>
                            <p className="text-sm text-base-content/60">Revenus locatifs bruts vs charges</p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <RefreshCw size={14} />
                        </Button>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenusProprio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3f51b5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                                formatter={(value: any) => [`${value?.toLocaleString() ?? 0} FCFA`, '']}
                            />
                            <Area type="monotone" dataKey="revenus" stroke="#3f51b5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenusProprio)" name="Revenus" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* Properties Grid Preview */}
            <motion.div variants={itemVariants}>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                        <Building2 size={20} className="text-primary" />
                        Vos Propriétés
                    </h3>
                    <Button variant="ghost" className="text-primary btn-sm hover:bg-primary/5" onClick={() => navigate('/dashboard/biens')}>
                        Détails Complets <Eye size={16} className="ml-1" />
                    </Button>
                </div>

                {loadingWidgets ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-base-300 rounded-xl animate-pulse"></div>)}
                    </div>
                ) : featuredProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {featuredProperties.map(property => (
                            <div key={property.id} className="bg-base-100 rounded-2xl p-4 shadow-lg border border-base-200 flex gap-4 hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/biens?id=${property.id}`)}>
                                <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                                    {property.image ? (
                                        <img src={property.image} alt={property.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-base-300 text-gray-400">
                                            <Building2 size={32} />
                                        </div>
                                    )}
                                     <div className={`absolute top-1 right-1 w-3 h-3 border-2 border-white rounded-full ${property.occupancy >= 80 ? 'bg-green-50' : 'bg-orange-50'}`}></div>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <h4 className="font-bold text-base-content truncate">{property.name}</h4>
                                    <p className="text-sm text-base-content/60 mb-2 truncate">{property.location}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{property.units} Lots</span>
                                        <span className="text-sm font-bold text-base-content">{property.occupancy}% Occ.</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-base-content/60 py-8 bg-base-100 rounded-xl">Aucune propriété affichée.</p>
                )}
            </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">Accès Rapide</h3>
                    <QuickActions userType="proprietaire" />
                </div>
            </motion.div>

            {/* Code de Liaison Locataire */}
            {managerCode && (
                <motion.div variants={itemVariants}>
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg text-white">
                        <div className="flex items-center gap-2 mb-3">
                            <Copy size={16} className="text-white/70" />
                            <h3 className="font-bold text-sm uppercase tracking-wide text-white/80">Code de Liaison</h3>
                        </div>
                        <p className="text-3xl font-mono font-extrabold tracking-widest mb-2">{managerCode}</p>
                        <p className="text-white/70 text-xs mb-4">Partagez ce code avec vos locataires pour qu'ils puissent rejoindre votre espace.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(managerCode);
                                }}
                                className="flex items-center gap-2 bg-base-100/20 hover:bg-base-100/30 backdrop-blur-sm text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all"
                            >
                                <Copy size={14} /> Copier
                            </button>
                            <button
                                onClick={() => navigate('/dashboard/locataires?tab=requests')}
                                className="flex items-center gap-2 bg-base-100/20 hover:bg-base-100/30 backdrop-blur-sm text-white text-sm font-semibold px-3 py-2 rounded-lg transition-all"
                            >
                                Demandes en attente
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Occupation Pie Chart */}
            <motion.div variants={itemVariants}>
                 <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200 relative overflow-hidden">
                    <h3 className="font-bold text-base-content/90 mb-2">Taux d'Occupation</h3>
                    <div className="h-[200px] flex items-center justify-center relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={occupationData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {occupationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-extrabold text-base-content/90">{stats?.tauxOccupation || 83}%</span>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Loué</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">Échéances</h3>
                    <UpcomingEvents events={upcomingEvents} userType="proprietaire" />
                </div>
            </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

export default ProprietaireDashboard;