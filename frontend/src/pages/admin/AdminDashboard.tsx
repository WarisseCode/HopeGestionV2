// frontend/src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Home,
  UserCheck,
  TrendingUp,
  Clock,
  RefreshCw,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

interface StatsData {
  users: { total: number; active: number; thisMonth: number; trend: number };
  revenue: { total: number; currency: string; paymentsCount: number };
  agencies: number;
  properties: number;
  lots: number;
  tenants: number;
}

interface GrowthData {
  name: string;
  users: number;
  revenue: number;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'success' | 'warning' | 'error' | 'info';
  ip?: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [growth, setGrowth] = useState<GrowthData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = getToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, growthRes, activityRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers }),
        fetch(`${API_URL}/admin/stats/growth`, { headers }),
        fetch(`${API_URL}/admin/stats/activity`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (growthRes.ok) {
        const gData = await growthRes.json();
        setGrowth(gData.growth || []);
      }
      if (activityRes.ok) {
        const aData = await activityRes.json();
        setActivity(aData.activity || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const kpis = [
    { 
      label: 'Utilisateurs', 
      value: stats?.users.total?.toString() || '0',
      sub: `${stats?.users.active || 0} actifs`,
      trend: stats?.users.trend || 0,
      icon: Users, 
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10 text-blue-500'
    },
    { 
      label: 'Revenus', 
      value: stats ? `${formatCurrency(stats.revenue.total)}` : '0',
      sub: `${stats?.revenue.paymentsCount || 0} paiements`,
      trend: 0,
      icon: Wallet, 
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/10 text-emerald-500'
    },
    { 
      label: 'Agences', 
      value: stats?.agencies?.toString() || '0', 
      sub: 'Gestionnaires actifs',
      trend: 0,
      icon: Building2, 
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-500/10 text-purple-500'
    },
    { 
      label: 'Locataires', 
      value: stats?.tenants?.toString() || '0', 
      sub: `${stats?.lots || 0} lots gérés`,
      trend: 0,
      icon: UserCheck, 
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/10 text-amber-500'
    },
  ];

  const activityDot: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-base-100 rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-base-100 rounded-2xl animate-pulse shadow-sm" />
          <div className="h-96 bg-base-100 rounded-2xl animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Tableau de Bord Super Admin
          </h1>
          <p className="text-base-content/60 mt-1">Vue en temps réel de votre plateforme HopeGestion</p>
        </div>
        <button 
          onClick={() => fetchAll(true)} 
          className={`btn btn-sm btn-outline gap-2 ${refreshing ? 'loading' : ''}`}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
          >
            <div className="bg-base-100 rounded-2xl p-5 shadow-sm border border-base-200 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-base-content/50 uppercase tracking-wide">{kpi.label}</p>
                  <h3 className="text-3xl font-bold mt-2 tracking-tight">{kpi.value}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {kpi.trend !== 0 && (
                      <span className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        kpi.trend > 0 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {kpi.trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {kpi.trend > 0 ? '+' : ''}{kpi.trend}%
                      </span>
                    )}
                    <span className="text-xs text-base-content/60">{kpi.sub}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${kpi.iconBg} group-hover:scale-110 transition-transform`}>
                  <kpi.icon size={22} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Immeubles', value: stats?.properties || 0, icon: Building2 },
          { label: 'Lots', value: stats?.lots || 0, icon: Home },
          { label: 'Inscrits ce mois', value: stats?.users.thisMonth || 0, icon: TrendingUp },
          { label: 'Paiements', value: stats?.revenue.paymentsCount || 0, icon: Activity },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="bg-base-100 rounded-xl p-4 shadow-sm border border-base-200 text-center"
          >
            <item.icon size={18} className="mx-auto text-primary/60 mb-1" />
            <p className="text-xl font-bold">{item.value.toLocaleString()}</p>
            <p className="text-xs text-base-content/50">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts + Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg">Croissance & Revenus</h3>
                <p className="text-xs text-base-content/50 mt-0.5">12 derniers mois</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Utilisateurs
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> Revenus
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              {growth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.08} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--b1, #1d232a)', 
                        borderRadius: '12px', 
                        border: '1px solid var(--b3, #2a323c)', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                        fontSize: '13px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#gradUsers)" 
                      name="Utilisateurs"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#gradRevenue)" 
                      name="Revenus (FCFA)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-base-content/30">
                  <div className="text-center">
                    <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Pas encore de données de croissance</p>
                    <p className="text-xs mt-1">Les données apparaîtront au fil des inscriptions</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-base-100 rounded-2xl p-6 shadow-sm border border-base-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Activité Récente
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1" style={{ maxHeight: '340px' }}>
              {activity.length > 0 ? (
                activity.map((item, index) => (
                  <motion.div 
                    key={item.id || index} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.03 }}
                    className="flex gap-3 items-start py-3 border-b border-base-200/50 last:border-0"
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${activityDot[item.type] || 'bg-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{item.action}</p>
                      <p className="text-xs text-base-content/50 mt-0.5 truncate">
                        {item.user} • {item.time}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-base-content/30 py-12">
                  <div className="text-center">
                    <Activity size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune activité récente</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
