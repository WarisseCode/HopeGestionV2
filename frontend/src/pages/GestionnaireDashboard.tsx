// frontend/src/pages/GestionnaireDashboard.tsx
import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';
import Card from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
// ... existing imports ...
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
import { KPICard, QuickActions, ActivityFeed } from '../components/dashboard'; 
import type { Activity } from '../components/dashboard/ActivityFeed';
import Button from '../components/ui/Button';
import { getToken } from '../api/authApi';

// ... existing interfaces ...
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
  const { user, stats, loading } = useUser();
  const navigate = useNavigate();

  const handleKpiClick = (kpi: KPIData) => {
      if (kpi.id === 'lots_occupation') {
          navigate('/dashboard/biens?tab=lots');
          return;
      }
      
      const path = kpi.modulePath.startsWith('/') ? kpi.modulePath : `/${kpi.modulePath}`;
      navigate(`/dashboard${path}`);
  };
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [showAllKpis, setShowAllKpis] = useState(false); // State for collapsible grid

  // ... existing mock data ...
  const mockKpis: KPIData[] = [
      { id: 'total_biens', label: 'Total Biens', value: 15, status: 'success', icon: 'Building2', modulePath: '/biens' },
      { id: 'lots_occupation', label: 'Occupés / Libres', value: "12 / 3", status: 'success', icon: 'Home', modulePath: '/biens' },
      { id: 'loyers_encaisses', label: 'Encaissés (Mois)', value: 4500000, status: 'success', icon: 'Wallet', modulePath: '/finances' },
      { id: 'loyers_impayes', label: 'Impayés', value: 150000, status: 'warning', icon: 'AlertTriangle', modulePath: '/finances' },
      { id: 'taux_occupation', label: "Taux Occupation", value: "85%", status: 'success', icon: 'Percent', modulePath: '/biens' },
      { id: 'contrats_actifs', label: 'Contrats Actifs', value: 12, status: 'success', icon: 'FileText', modulePath: '/locataires' },
      { id: 'plaintes_ouvertes', label: 'Plaintes', value: 2, status: 'warning', icon: 'MessageCircle', modulePath: '/alertes' },
      { id: 'reservations', label: 'Réservations', value: 1, status: 'warning', icon: 'Calendar', modulePath: '/biens' },
      { id: 'recouvrement', label: 'À Recouvrer', value: 280000, status: 'danger', icon: 'DollarSign', modulePath: '/finances' },
      { id: 'echelonements_retard', label: 'Retards Échél.', value: 0, status: 'success', icon: 'Clock', modulePath: '/finances' },
  ];

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

  // ... existing formatting helpers ...
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

  // ... useEffect for fetching KPIs ...
  useEffect(() => {
    const fetchKPIs = async () => {
      const token = getToken();
      if (!token) {
        setKpis(mockKpis);
        return;
      }
      
      try {
        const response = await fetch('http://localhost:5000/api/dashboard/kpi', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setKpis(data.kpis);
        } else {
          setKpis(mockKpis);
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error);
        setKpis(mockKpis);
      }
    };
    
    fetchKPIs();
  }, [stats]);


  // ... Chart Data ...
  const revenusData = [
    { name: 'Jan', revenus: 1200000, depenses: 240000 },
    { name: 'Fév', revenus: 1100000, depenses: 139800 },
    { name: 'Mar', revenus: 1400000, depenses: 150000 },
    { name: 'Avr', revenus: 1278000, depenses: 390800 },
    { name: 'Mai', revenus: 1890000, depenses: 480000 },
    { name: 'Juin', revenus: 2339000, depenses: 380000 },
    { name: 'Juil', revenus: 2449000, depenses: 430000 },
  ];

  const occupationData = [
    { name: 'Occupé', value: stats?.tauxOccupation || 85, color: '#6366f1' },
    { name: 'Vacant', value: 100 - (stats?.tauxOccupation || 85), color: '#e2e8f0' },
  ];

  const activities: Activity[] = [
    { id: 1, type: 'payment', title: 'Paiement reçu', description: 'Loyer décembre - Apt A01', time: 'Il y a 2h' },
    { id: 2, type: 'reminder', title: 'Rappel envoyé', description: 'M. Touré (Retard 5 jours)', time: 'Il y a 5h' },
    { id: 3, type: 'intervention', title: 'Plomberie', description: 'Réparation fuite Apt B02', time: 'Hier' },
    { id: 4, type: 'contract', title: 'Nouveau bail', description: 'Résidence La Paix, Apt C04', time: '28 Déc' },
  ];


  const allKpis = kpis.length > 0 ? kpis : mockKpis;
  const visibleKpis = showAllKpis ? allKpis : allKpis.slice(0, 4);

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
            Tableau de bord <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Bienvenue {user?.nom || ''}, voici votre aperçu global aujourd'hui.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Recherche rapide..." 
                    className="input input-sm h-10 pl-10 bg-base-100 border-base-200 focus:border-primary w-64 rounded-full shadow-sm"
                />
            </div>
            <Button variant="primary" className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                <Plus size={18} className="mr-2" />
                Nouveau
            </Button>
        </div>
      </motion.div>

      {/* KPI Section */}
       <motion.div variants={itemVariants} className="relative">
          <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-800 dark:text-base-content">Indicateurs Stratégiques</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {showAllKpis ? '10 metrics' : '4 metrics'}
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
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column (Charts & Properties) - 2/3 width */}
        <div className="xl:col-span-2 space-y-8">
            
            {/* Finance Chart */}
            <motion.div variants={itemVariants}>
                <Card className="overflow-hidden border-none shadow-xl bg-white">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Analyse Financière</h3>
                            <p className="text-sm text-gray-500">Revenus vs Dépenses (6 derniers mois)</p>
                        </div>
                        <select className="select select-sm select-bordered rounded-full bg-gray-50 border-gray-200">
                            <option>Cette année</option>
                            <option>L'année dernière</option>
                        </select>
                    </div>
                    <div className="h-[350px] w-full">
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
            </motion.div>

            {/* Properties Grid */}
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Building2 size={20} className="text-primary" />
                        Biens en vedette
                    </h3>
                    <Button variant="ghost" className="text-primary btn-sm hover:bg-primary/5">
                        Tout voir <Eye size={16} className="ml-1" />
                    </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Property Card 1 */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                        <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                            <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80" alt="Bien" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                             <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-gray-900 truncate">Résidence Les Palmiers</h4>
                            <p className="text-sm text-gray-500 mb-2">Haie Vive, Cotonou</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">8 Appts</span>
                                <span className="text-sm font-bold text-gray-900">95% Occ.</span>
                            </div>
                        </div>
                    </div>

                    {/* Property Card 2 */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                        <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                            <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80" alt="Bien" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                             <div className="absolute top-1 right-1 w-3 h-3 bg-orange-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-gray-900 truncate">Villa Saint-Michel</h4>
                            <p className="text-sm text-gray-500 mb-2">Fidjrossè, Cotonou</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium bg-purple-50 text-purple-600 px-2 py-1 rounded-lg">Villa</span>
                                <span className="text-sm font-bold text-gray-900">En travaux</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Right Column (Activity & Actions) - 1/3 width */}
        <div className="space-y-8">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Actions Rapides</h3>
                    <QuickActions userType="gestionnaire" />
                </div>
            </motion.div>

            {/* Occupation Pie Chart (Compact) */}
            <motion.div variants={itemVariants}>
                 <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                    <h3 className="font-bold text-gray-800 mb-2">Occupation</h3>
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
                            <span className="text-3xl font-extrabold text-gray-800">{stats?.tauxOccupation || 85}%</span>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Occupé</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={itemVariants}>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Fil d'actualité</h3>
                        <Button variant="ghost" className="btn-xs text-gray-400">
                            <MoreVertical size={16} />
                        </Button>
                    </div>
                    <ActivityFeed activities={activities} />
                </div>
            </motion.div>
            
        </div>
      </div>
    </motion.div>
  );
};

export default GestionnaireDashboard;
