// frontend/src/pages/GestionnaireDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Home, 
  Wallet, 
  AlertTriangle, 
  Percent, 
  FileText, 
  MessageCircle, 
  Calendar, 
  DollarSign, 
  Clock, 
  Search, 
  Plus, 
  MoreVertical, 
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import Card from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  KPICard, 
  QuickActions, 
  ActivityFeed,
  PeriodFilter,
  DashboardSkeleton,
  ChartSkeleton
} from '../components/dashboard'; 
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { Period } from '../components/dashboard/PeriodFilter';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import { getToken } from '../api/authApi';
import { API_URL } from '../config';
import EmptyState from '../components/ui/EmptyState';

// --- Types for API Data ---
interface KPIData {
    id: string;
    label: string;
    value: string | number;
    status: 'success' | 'warning' | 'danger';
    icon: string;
    modulePath: string;
}

const GestionnaireDashboard: React.FC = () => {
  const { user, stats, loading: userLoading } = useUser();
  const navigate = useNavigate();
  
  // States
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoadingKpis, setIsLoadingKpis] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleKpiClick = (kpi: KPIData) => {
      if (kpi.id === 'lots_occupation') {
          navigate('/dashboard/biens?tab=lots');
          return;
      }
      
      const path = kpi.modulePath.startsWith('/') ? kpi.modulePath : `/${kpi.modulePath}`;
      navigate(`/dashboard${path}`);
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

  // Helper to format values based on KPI type
  const formatValue = (kpi: KPIData) => {
      // 1. Currency KPIs
      if (['loyers_encaisses', 'loyers_impayes', 'recouvrement'].includes(kpi.id)) {
          if (typeof kpi.value === 'number') {
              return new Intl.NumberFormat('fr-FR').format(kpi.value) + ' FCFA';
          }
          return kpi.value + ' FCFA';
      }
      
      // 2. Percentage or Special String KPIs
      if (['taux_occupation', 'lots_occupation'].includes(kpi.id)) {
          return kpi.value;
      }
      
      // 3. Count KPIs (Integer)
      if (typeof kpi.value === 'number') {
           return new Intl.NumberFormat('fr-FR').format(kpi.value);
      }
      return kpi.value;
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'Building2': return Building2;
          case 'Home': return Home;
          case 'Wallet': return Wallet;
          case 'AlertTriangle': return AlertTriangle;
          case 'Percent': return Percent;
          case 'FileText': return FileText;
          case 'MessageCircle': return MessageCircle;
          case 'Calendar': return Calendar;
          case 'DollarSign': return DollarSign;
          case 'Clock': return Clock;
          default: return Building2;
      }
  };

  const getKeyColor = (kpi: KPIData): 'blue' | 'green' | 'purple' | 'orange' | 'pink' => {
      switch(kpi.id) {
          case 'total_biens': return 'blue';
          case 'lots_occupation': return 'purple';
          case 'loyers_encaisses': return 'green';
          case 'loyers_impayes': return 'pink';
          case 'taux_occupation': return 'blue';
          case 'contrats_actifs': return 'green';
          case 'plaintes_ouvertes': return 'orange';
          case 'reservations': return 'purple';
          case 'recouvrement': return 'pink';
          case 'echelonements_retard': return 'orange';
          default: return 'blue';
      }
  };

  // Fetch KPIs with period filter
  useEffect(() => {
    const fetchKPIs = async () => {
      setIsLoadingKpis(true);
      const token = getToken();
      if (!token) {
        // Simulate loading delay for skeleton demo
        await new Promise(r => setTimeout(r, 500));
        setKpis([]);
        setIsLoadingKpis(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/dashboard/kpi?period=${period}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setKpis(data.kpis);
        } else {
          setKpis([]);
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        setKpis([]);
      } finally {
        setIsLoadingKpis(false);
      }
    };
    
    fetchKPIs();
  }, [stats, period, refreshKey]);


  // Fetch chart data and other dashboard widgets
  const [chartData, setChartData] = useState<{ name: string; revenus: number; depenses: number }[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<any[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingChart(true);
      setLoadingWidgets(true);
      const token = getToken();
      
      if (!token) {
        setChartData([{ name: 'N/A', revenus: 0, depenses: 0 }]);
        setIsLoadingChart(false);
        setLoadingWidgets(false);
        return;
      }

      try {
        // 1. Chart Data
        const chartPromise = fetch(`${API_URL}/dashboard/chart-data?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        // 2. Activity Feed
        const activityPromise = fetch(`${API_URL}/dashboard/activity`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        // 3. Featured Properties
        const propertiesPromise = fetch(`${API_URL}/dashboard/featured-properties`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json());

        const [chartRes, activityRes, propertiesRes] = await Promise.all([
            chartPromise, 
            activityPromise, 
            propertiesPromise
        ]);

        if (chartRes.chartData) setChartData(chartRes.chartData);
        if (activityRes.activities) {
             // Map backend activity to frontend format
             const mappedActivities = activityRes.activities.map((a: any) => ({
                 id: a.id,
                 type: a.type,
                 title: a.title,
                 description: a.description,
                 time: new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
             }));
             setActivities(mappedActivities);
        }
        if (propertiesRes.properties) setFeaturedProperties(propertiesRes.properties);

      } catch (error) {
        console.error('Error fetching dashboard widgets:', error);
      } finally {
        setIsLoadingChart(false);
        setLoadingWidgets(false);
      }
    };
    
    fetchDashboardData();
  }, [period]);

  // Alias for chart
  const revenusData = chartData;

  const occupationData = [
    { name: 'Occupé', value: stats?.tauxOccupation || 0, color: '#6366f1' },
    { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 0), color: '#e2e8f0' },
  ];

  const allKpis = kpis; 
  const visibleKpis = showAllKpis ? allKpis : allKpis.slice(0, 4);

  // Financial Banner Values
  const totalRevenus = kpis.find(k => k.id === 'loyers_encaisses')?.value as number || 0;
  const totalImpayes = kpis.find(k => k.id === 'loyers_impayes')?.value as number || 0;
  const revenuNet = totalRevenus;

  // Show full skeleton while user context loads
  if (userLoading) {
    return <DashboardSkeleton type="gestionnaire" />;
  }

  return (
    <motion.div 
      className="p-4 md:p-8 space-y-8 max-w-[1700px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Tableau de bord <span className="text-primary"></span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Bienvenue {user?.nom || ''}, voici votre aperçu global.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
            {/* Period Filter */}
            <PeriodFilter value={period} onChange={setPeriod} />
            
            <SearchInput 
              placeholder="Recherche rapide..." 
              value={searchQuery}
              onChange={setSearchQuery}
              size="sm"
              className="w-48 lg:w-64"
            />
            

        </div>
      </motion.div>

      {/* Financial Summary Banner */}
      <motion.div variants={itemVariants}>
        <div className="bg-gradient-to-r from-primary via-primary to-secondary rounded-2xl p-6 text-primary-content shadow-xl relative overflow-hidden">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-base-100 rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-base-100 rounded-full translate-y-1/2 -translate-x-1/4"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">Performance globale (Mois)</p>
              <p className="text-3xl font-bold">{new Intl.NumberFormat('fr-FR').format(revenuNet)} FCFA</p>
              <p className="text-white/60 text-xs mt-1">Revenus encaissés (mois)</p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="text-center bg-base-100/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Encaissements</p>
                <p className="text-lg font-bold text-green-300">+{new Intl.NumberFormat('fr-FR').format(totalRevenus)}</p>
              </div>
              <div className="text-center bg-base-100/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Impayés</p>
                <p className="text-lg font-bold text-orange-300">{new Intl.NumberFormat('fr-FR').format(totalImpayes)}</p>
              </div>
              <div className="text-center bg-base-100/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Taux occupation</p>
                <p className="text-lg font-bold">{stats?.tauxOccupation || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Section */}
       <motion.div variants={itemVariants} className="relative">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-base-content/90 dark:text-base-content">Indicateurs Stratégiques</span>
                <span className="px-2 py-0.5 rounded-full bg-base-300 text-xs font-medium text-base-content/60">
                    {showAllKpis ? `${allKpis.length} metrics` : `${Math.min(4, allKpis.length)} metrics`}
                </span>
              </div>
              
              <button 
                onClick={() => setShowAllKpis(!showAllKpis)}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-focus transition-colors"
                >
                  {showAllKpis ? (
                      <>
                        Voir moins <ChevronUp size={16} />
                      </>
                  ) : (
                      <>
                        Voir tous <ChevronDown size={16} />
                      </>
                  )}
              </button>
          </div>

          {isLoadingKpis ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-base-100 rounded-2xl p-6 border border-base-200 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-base-300 rounded-full" />
                    <div className="w-16 h-6 bg-base-300 rounded" />
                  </div>
                  <div className="w-24 h-4 bg-base-300 rounded mb-2" />
                  <div className="w-32 h-8 bg-base-300 rounded" />
                </div>
              ))}
            </div>
          ) : visibleKpis.length === 0 ? (
            <div className="col-span-full py-8">
              <EmptyState 
                icon={<AlertTriangle size={48} />}
                title="Données indisponibles"
                description="Impossible de charger les indicateurs. Veuillez vérifier votre connexion ou rafraîchir la page."
                actionLabel="Réessayer"
                onAction={() => window.location.reload()}
              />
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                  {visibleKpis.map((kpi) => (
                  <motion.div
                      key={kpi.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                  >
                      <KPICard 
                          icon={getIcon(kpi.icon)}
                          label={kpi.label}
                          value={formatValue(kpi)}
                          color={getKeyColor(kpi)}
                          onClick={() => handleKpiClick(kpi)}
                      />
                  </motion.div>
                  ))}
              </AnimatePresence>
            </motion.div>
          )}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Charts & Properties) - 2/3 width */}
        <div className="xl:col-span-2 space-y-8">
            
            {/* Finance Chart */}
            <motion.div variants={itemVariants}>
              {isLoadingChart ? (
                <ChartSkeleton height={350} />
              ) : (
                <Card className="overflow-hidden border-none shadow-xl bg-base-100">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div>
                            <h2 className="text-xl font-bold text-base-content/90">Analyse Financière</h2>
                            <p className="text-sm text-base-content/60">Revenus vs Dépenses ({
                              period === '7d' ? '7 derniers jours' :
                              period === '30d' ? '30 derniers jours' :
                              period === '90d' ? '90 derniers jours' :
                              period === '1y' ? 'Cette année' : 'Tout'
                            })</p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setRefreshKey(k => k + 1)}>
                          <RefreshCw size={14} />
                          Actualiser
                        </Button>
                    </div>
                    <div className="h-[350px] w-full min-h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenusGest" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorDepensesGest" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                                formatter={(value: any) => [`${value?.toLocaleString() ?? 0} FCFA`, '']}
                                labelStyle={{color: '#64748b', marginBottom: '0.5rem'}}
                            />
                            <Area type="monotone" dataKey="revenus" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenusGest)" name="Revenus" />
                            <Area type="monotone" dataKey="depenses" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorDepensesGest)" name="Dépenses" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
              )}
            </motion.div>

            {/* Properties Grid */}
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
                        <Building2 size={20} className="text-primary" />
                        Biens en vedette
                    </h3>
                    <Button variant="ghost" className="text-primary btn-sm hover:bg-primary/5" onClick={() => navigate('/dashboard/biens')}>
                        Tout voir <Eye size={16} className="ml-1" />
                    </Button>
                </div>
                
                {loadingWidgets ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                             <div key={i} className="bg-base-300 rounded-2xl h-32 animate-pulse"></div>
                        ))}
                    </div>
                ) : featuredProperties.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {featuredProperties.map(property => (
                            <div key={property.id} className="bg-base-100 rounded-2xl p-4 shadow-lg border border-base-200 flex gap-4 hover:shadow-xl transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/biens?id=${property.id}`)}>
                                <div className="w-24 h-24 rounded-xl bg-base-300 overflow-hidden relative shrink-0">
                                    {property.image ? (
                                        <img src={property.image} alt={property.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-base-300 text-base-content/50">
                                            <Building2 size={32} />
                                        </div>
                                    )}
                                     <div className={`absolute top-1 right-1 w-3 h-3 border-2 border-white rounded-full ${property.occupancy >= 80 ? 'bg-green-500' : property.occupancy >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}></div>
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
                    <div className="p-8 text-center text-base-content/60 bg-base-200 rounded-xl">
                        Aucun bien en vedette pour le moment
                    </div>
                )}
            </motion.div>
        </div>

        {/* Right Column (Activity & Actions) - 1/3 width */}
        <div className="space-y-8">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <h3 className="font-bold text-base-content/90 mb-4">Actions Rapides</h3>
                    <QuickActions userType="gestionnaire" />
                </div>
            </motion.div>

            {/* Occupation Pie Chart (Compact) */}
            <motion.div variants={itemVariants}>
                 <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200 relative overflow-hidden">
                    <h3 className="font-bold text-base-content/90 mb-2">Occupation</h3>
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
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-extrabold text-base-content/90">{stats?.tauxOccupation || 0}%</span>
                            <span className="text-xs text-base-content/50 font-medium uppercase tracking-wide">Occupé</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
                <div className="bg-base-100 rounded-2xl p-6 shadow-lg border border-base-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-base-content/90">Fil d'actualité</h3>
                        <Button variant="ghost" className="btn-xs text-base-content/50">
                            <MoreVertical size={16} />
                        </Button>
                    </div>
                    {loadingWidgets ? (
                         <div className="space-y-4">
                             {[1, 2, 3].map(i => <div key={i} className="h-16 bg-base-300 rounded-xl animate-pulse"></div>)}
                         </div>
                    ) : activities.length > 0 ? (
                        <ActivityFeed activities={activities} />
                    ) : (
                        <p className="text-center text-base-content/60 py-4">Aucune activité récente</p>
                    )}
                </div>
            </motion.div>
            
        </div>
      </div>
    </motion.div>
  );
};

export default GestionnaireDashboard;
