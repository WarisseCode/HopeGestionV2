// frontend/src/pages/ProprietaireDashboard.tsx
import React from 'react';
import { 
  Building2, 
  Home,
  Wallet, 
  AlertCircle, 
  Eye
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useUser } from '../contexts/UserContext';
import { KPICard, QuickActions, ActivityFeed, UpcomingEvents } from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import type { UpcomingEvent } from '../components/dashboard/UpcomingEvents';

const ProprietaireDashboard: React.FC = () => {
  const { user, stats, loading } = useUser();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Données pour les graphiques
  const revenusData = [
    { name: 'Jan', revenus: 400000, depenses: 24000 },
    { name: 'Fév', revenus: 300000, depenses: 13980 },
    { name: 'Mar', revenus: 200000, depenses: 98000 },
    { name: 'Avr', revenus: 278000, depenses: 39080 },
    { name: 'Mai', revenus: 189000, depenses: 48000 },
    { name: 'Juin', revenus: 239000, depenses: 38000 },
    { name: 'Juil', revenus: 349000, depenses: 43000 },
  ];

  const occupationData = [
    { name: 'Occupé', value: stats?.tauxOccupation || 83, color: '#3f51b5' },
    { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 83), color: '#f50057' },
  ];

  // Activités récentes
  const activities: Activity[] = [
    { id: 1, type: 'payment', title: 'Paiement reçu', description: 'Loyer décembre - Apt A01', time: 'Il y a 2h' },
    { id: 2, type: 'reminder', title: 'Rappel de paiement', description: 'Loyer novembre - Apt B02', time: 'Il y a 5h' },
    { id: 3, type: 'alert', title: 'Fuite d\'eau signalée', description: 'Résidence La Paix, Apt B02', time: 'Hier' },
  ];

  // Événements à venir (pour mes biens)
  const upcomingEvents: UpcomingEvent[] = [
    { id: 1, type: 'rent', title: 'Échéance loyer', description: 'Résidence Les Palmiers - M. Koffi', date: '02 Jan', daysUntil: 5 },
    { id: 2, type: 'contract', title: 'Renouvellement contrat', description: 'Apt A02 - Mme Adjo', date: '10 Jan', daysUntil: 13 },
    { id: 3, type: 'intervention', title: 'Maintenance prévue', description: 'Vérification électrique', date: '28 Déc', daysUntil: 0 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Section de bienvenue */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              Bonjour, {user?.nom || 'Propriétaire'} 👋
            </h1>
            <p className="text-base-content/60 mt-1">Voici l'état de vos biens immobiliers</p>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/20">
            <div className="p-3 bg-gradient-to-r from-primary to-secondary rounded-lg">
              <Building2 className="text-primary-content" size={24} />
            </div>
            <div>
              <p className="text-sm text-base-content/60">Total biens</p>
              <p className="font-bold text-lg text-primary">{stats?.totalBiens || 0}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={itemVariants}
      >
        <KPICard 
          icon={Building2} 
          label="Total biens" 
          value={stats?.totalBiens || 0} 
          color="blue" 
        />
        <KPICard 
          icon={Home} 
          label="Taux d'occupation" 
          value={`${stats?.tauxOccupation || 0}%`} 
          color="green" 
        />
        <KPICard 
          icon={Wallet} 
          label="Revenus ce mois" 
          value={formatCurrency(stats?.revenusMois || 0)} 
          color="purple" 
        />
        <KPICard 
          icon={AlertCircle} 
          label="Impayés en cours" 
          value={formatCurrency(stats?.impayesEnCours || 0)} 
          color="orange" 
        />
      </motion.div>

      {/* Graphiques */}
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        variants={itemVariants}
      >
        <Card title="Revenus vs Dépenses">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenusProprio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3f51b5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDepensesProprio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f50057" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f50057" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  formatter={(value: any) => [`${value?.toLocaleString() ?? 0} FCFA`, 'Montant']}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} iconType="circle" />
                <Area 
                  type="monotone" 
                  dataKey="revenus" 
                  stroke="#3f51b5" 
                  fillOpacity={1} 
                  fill="url(#colorRevenusProprio)" 
                  name="Revenus" 
                />
                <Area 
                  type="monotone" 
                  dataKey="depenses" 
                  stroke="#f50057" 
                  fillOpacity={1} 
                  fill="url(#colorDepensesProprio)" 
                  name="Dépenses" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Taux d'Occupation">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {occupationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                  formatter={(value: any) => [`${value}%`, 'Taux']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions et Activités */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={itemVariants}
      >
        <Card title="Actions Rapides">
          <QuickActions userType="proprietaire" />
        </Card>

        <Card title="Répartition des revenus">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Loyer</span>
                <span className="text-sm">{formatCurrency((stats?.revenusMois || 0) * 0.8)}</span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Caution</span>
                <span className="text-sm">{formatCurrency((stats?.revenusMois || 0) * 0.13)}</span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '13%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Charges</span>
                <span className="text-sm">{formatCurrency((stats?.revenusMois || 0) * 0.07)}</span>
              </div>
              <div className="w-full bg-base-200 rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: '7%' }}></div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Activités récentes">
          <ActivityFeed activities={activities} />
        </Card>

        {/* Événements à venir */}
        <UpcomingEvents events={upcomingEvents} userType="proprietaire" />
      </motion.div>

      {/* Biens */}
      <motion.div variants={itemVariants}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-base-content">Vos Biens</h3>
          <button className="text-sm font-semibold text-primary hover:text-primary-focus flex items-center gap-1">
            Voir tous les biens
            <Eye size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl overflow-hidden shadow-md border border-base-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="relative h-48 bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center">
              <Building2 size={64} className="text-blue-500 opacity-30" />
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-success text-success-content">
                Complet
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-base-content mb-2">Résidence La Paix</h3>
              <div className="flex items-center text-sm text-base-content/70 mb-3">
                <Home size={14} className="mr-1" /> Haie Vive, Cotonou
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-base-200">
                <span className="text-sm font-semibold text-base-content">12 Lots</span>
                <span className="text-sm font-bold text-success">100% Occ.</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden shadow-md border border-base-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="relative h-48 bg-gradient-to-r from-green-100 to-green-200 flex items-center justify-center">
              <Building2 size={64} className="text-green-500 opacity-30" />
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-success text-success-content">
                Disponible
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-base-content mb-2">Immeuble Le Destin</h3>
              <div className="flex items-center text-sm text-base-content/70 mb-3">
                <Home size={14} className="mr-1" /> Fidjrossè, Cotonou
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-base-200">
                <span className="text-sm font-semibold text-base-content">8 Lots</span>
                <span className="text-sm font-bold text-success">75% Occ.</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden shadow-md border border-base-200 hover:shadow-xl transition-all duration-300 cursor-pointer">
            <div className="relative h-48 bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center">
              <Building2 size={64} className="text-orange-500 opacity-30" />
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-error text-error-content">
                Vacant
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold text-base-content mb-2">Villa Les Cocotiers</h3>
              <div className="flex items-center text-sm text-base-content/70 mb-3">
                <Home size={14} className="mr-1" /> Cocotiers, Cotonou
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-base-200">
                <span className="text-sm font-semibold text-base-content">1 Lot</span>
                <span className="text-sm font-bold text-error">0% Occ.</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProprietaireDashboard;