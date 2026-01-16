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
  RefreshCw
} from 'lucide-react';
import Card from '../components/ui/Card';
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
import { 
  KPICard, 
  QuickActions, 
  UpcomingEvents,
  PeriodFilter,
  DashboardSkeleton
} from '../components/dashboard';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';
import type { Period } from '../components/dashboard/PeriodFilter';
import Button from '../components/ui/Button';

const ProprietaireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');

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

  // Mock Data - filtered by period
  const revenusData = useMemo(() => {
    const baseData = [
      { name: 'Jan', revenus: 400000, depenses: 24000 },
      { name: 'Fév', revenus: 300000, depenses: 13980 },
      { name: 'Mar', revenus: 200000, depenses: 98000 },
      { name: 'Avr', revenus: 278000, depenses: 39080 },
      { name: 'Mai', revenus: 189000, depenses: 48000 },
      { name: 'Juin', revenus: 239000, depenses: 38000 },
      { name: 'Juil', revenus: 349000, depenses: 43000 },
    ];
    
    switch (period) {
      case '7d': return baseData.slice(-2);
      case '30d': return baseData.slice(-3);
      case '90d': return baseData.slice(-5);
      default: return baseData;
    }
  }, [period]);

  const occupationData = [
    { name: 'Occupé', value: stats?.tauxOccupation || 83, color: '#3f51b5' },
    { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 83), color: '#e2e8f0' },
  ];

  // Événements à venir
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Échéance loyer', description: 'Résidence Les Palmiers', date: '02 Jan', daysUntil: 5 },
    { id: 2, type: 'contract', title: 'Renouvellement', description: 'Apt A02 - Mme Adjo', date: '10 Jan', daysUntil: 13 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (loading) {
    return <DashboardSkeleton type="proprietaire" />;
  }

  // Calculate totals for the period
  const totalRevenus = revenusData.reduce((sum, d) => sum + d.revenus, 0);
  const totalDepenses = revenusData.reduce((sum, d) => sum + d.depenses, 0);
  const revenuNet = totalRevenus - totalDepenses;

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
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/4"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">Revenu net sur la période</p>
              <p className="text-3xl font-bold">{formatCurrency(revenuNet)}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Revenus bruts</p>
                <p className="text-lg font-bold">{formatCurrency(totalRevenus)}</p>
              </div>
              <div className="text-center bg-white/10 rounded-xl px-4 py-2 backdrop-blur-sm">
                <p className="text-white/80 text-xs font-medium">Charges</p>
                <p className="text-lg font-bold">-{formatCurrency(totalDepenses)}</p>
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
          value={stats?.totalBiens || 5} 
          color="blue" 
          trend={{ value: "+1", label: "nouvelle acquisition", positive: true }}
        />
        <KPICard 
          icon={Users} 
          label="Taux d'Occupation" 
          value={`${stats?.tauxOccupation || 83}%`} 
          color="green" 
          trend={{ value: "Stable", label: "vs mois dernier", positive: true }}
        />
        <KPICard 
          icon={Wallet} 
          label="Revenus Nette" 
          value={formatCurrency(stats?.revenusMois || 850000)} 
          color="purple" 
          trend={{ value: "+5%", label: "performance", positive: true }}
        />
        <KPICard 
          icon={AlertCircle} 
          label="Impayés" 
          value={formatCurrency(stats?.impayesEnCours || 0)} 
          color="orange" 
          trend={{ value: "0", label: "Aucun retard majeur", positive: true }}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Charts) - 2/3 width */}
        <div className="xl:col-span-2 space-y-8">
            
             {/* Finance Chart */}
             <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-none shadow-xl bg-white">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Performance Financière</h3>
                            <p className="text-sm text-gray-500">Revenus locatifs bruts vs charges</p>
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
                                <linearGradient id="colorDepensesProprio" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f50057" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f50057" stopOpacity={0}/>
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
                            <Area type="monotone" dataKey="depenses" stroke="#f50057" strokeWidth={3} fillOpacity={1} fill="url(#colorDepensesProprio)" name="Dépenses" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </motion.div>

            {/* Properties Grid Preview */}
            <motion.div variants={itemVariants}>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Building2 size={20} className="text-primary" />
                        Vos Propriétés
                    </h3>
                    <Button variant="ghost" className="text-primary btn-sm hover:bg-primary/5" onClick={() => navigate('/dashboard/biens')}>
                        Détails Complets <Eye size={16} className="ml-1" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                        <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                             <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="text-blue-500" />
                             </div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-gray-900 truncate">Résidence La Paix</h4>
                            <p className="text-sm text-gray-500 mb-2">Haie Vive, Cotonou</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium bg-green-50 text-green-600 px-2 py-1 rounded-lg">100% Loué</span>
                                <span className="text-sm font-bold text-gray-900">12 Lots</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                        <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                            <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                <Home className="text-orange-500" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-gray-900 truncate">Villa Les Cocotiers</h4>
                            <p className="text-sm text-gray-500 mb-2">Cocotiers, Cotonou</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium bg-red-50 text-red-600 px-2 py-1 rounded-lg">Vacant</span>
                                <span className="text-sm font-bold text-gray-900">1 Lot</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Accès Rapide</h3>
                    <QuickActions userType="proprietaire" />
                </div>
            </motion.div>

            {/* Occupation Pie Chart */}
            <motion.div variants={itemVariants}>
                 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                    <h3 className="font-bold text-gray-800 mb-2">Taux d'Occupation</h3>
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
                            <span className="text-3xl font-extrabold text-gray-800">{stats?.tauxOccupation || 83}%</span>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Loué</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Échéances</h3>
                    <UpcomingEvents events={upcomingEvents} userType="proprietaire" />
                </div>
            </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

export default ProprietaireDashboard;