// frontend/src/pages/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  ShieldCheck,
  AlertTriangle 
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
  Cell
} from 'recharts';
import Card from '../../components/ui/Card';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

const AdminDashboard: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            setStatsData(data);
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Compute stats for display
  const stats = [
    { 
        label: 'Utilisateurs Totaux', 
        value: statsData?.users?.total?.toString() || '...', 
        change: '+0%', // Dynamic change requires history
        icon: Users, 
        color: 'text-blue-500', 
        bg: 'bg-blue-100 dark:bg-blue-900/20' 
    },
    { 
        label: 'Revenu Total', 
        value: statsData?.revenue?.total ? `${(statsData.revenue.total).toLocaleString()} FCFA` : '0 FCFA', 
        change: '+0%', 
        icon: Wallet, 
        color: 'text-green-500', 
        bg: 'bg-green-100 dark:bg-green-900/20' 
    },
    { 
        label: 'Agences', 
        value: statsData?.agencies?.toString() || '...', 
        change: '0', 
        icon: Building2, 
        color: 'text-purple-500', 
        bg: 'bg-purple-100 dark:bg-purple-900/20' 
    },
    { 
        label: 'Biens', 
        value: statsData?.properties?.toString() || '...', 
        change: '0', 
        icon: Activity, 
        color: 'text-orange-500', 
        bg: 'bg-orange-100 dark:bg-orange-900/20' 
    },
  ];

  /* 
  // Mock Data (Removed)
  const stats = [ ... ];
  */

  const recentActivity = [
    { user: 'Admin System', action: 'Dashboard initialisé', time: 'À l\'instant', type: 'info' },
    // Only mock for now as audit logs API is separate
  ];

  const chartData = [
    { name: 'Jan', users: 40, revenue: 24000 },
    { name: 'Fév', users: 30, revenue: 13980 },
    // Mock chart data for visual layout (Real data needs history table)
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de Bord Global</h1>
          <p className="text-base-content/60">Vue d'ensemble de l'activité de la plateforme HopeGestion.</p>
        </div>
        <div className="flex gap-2">
            <button className="btn btn-sm btn-outline">Exporter Rapport</button>
            <button className="btn btn-sm btn-primary">Gérer Utilisateurs</button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="flat" className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content/60">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                  <div className={`flex items-center text-xs mt-2 ${stat.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change.startsWith('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="ml-1 font-medium">{stat.change}</span>
                    <span className="text-base-content/40 ml-1">vs mois dernier</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon size={24} className={stat.color} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Croissance & Revenus</h3>
              <select className="select select-bordered select-xs">
                <option>Cette année</option>
                <option>L'année dernière</option>
              </select>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--b1)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  />
                  <Area type="monotone" dataKey="users" stroke="#8884d8" fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="revenue" stroke="#82ca9d" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent Activity / Audit Log Preview */}
        <div>
          <Card className="h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Activité Récente</h3>
              <button className="text-primary text-sm font-medium hover:underline">Voir tout</button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex gap-3 items-start pb-4 border-b border-base-200 last:border-0 last:pb-0">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 
                    ${item.type === 'success' ? 'bg-green-500' : ''}
                    ${item.type === 'warning' ? 'bg-orange-500' : ''}
                    ${item.type === 'info' ? 'bg-blue-500' : ''}
                  `} />
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-base-content/60">{item.user} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-base-200">
                <h4 className="font-bold text-sm mb-3">Santé Système</h4>
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Serveur API</span>
                            <span className="text-success">99.9%</span>
                        </div>
                        <progress className="progress progress-success w-full" value="100" max="100"></progress>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Base de données</span>
                            <span className="text-warning">85% load</span>
                        </div>
                        <progress className="progress progress-warning w-full" value="85" max="100"></progress>
                    </div>
                </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
