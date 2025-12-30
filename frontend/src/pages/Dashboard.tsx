// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { getToken } from '../api/authApi';
import { 
    Home, 
    Users, 
    Wallet, 
    AlertCircle, 
    Building2,
    Eye,
    Plus,
    Search,
    PieChart as PieIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import { 
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { KPICard, QuickActions, ActivityFeed, UpcomingEvents } from '../components/dashboard';
import type { Activity } from '../components/dashboard/ActivityFeed';
import LaPaixImage from '../assets/images/residence-la-paix.png';
import LeDestinImage from '../assets/images/immeuble-le-destin.png';

// --- DATA TYPES ---
interface DashboardStats {
    totalBiens: number;
    locatairesActifs: number;
    totalRevenus: number;
    totalDepenses: number;
    margeNette: number;
    tauxOccupation: number;
    impayesEnCours: number;
}

// --- COMPONENT ---
const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mock Data for fallback
    const mockActivities: Activity[] = [
        { id: 1, type: 'payment', title: 'Loyer reçu', description: 'Jean KOFFI - Apt A01', time: 'Il y a 2h' },
        { id: 2, type: 'alert', title: 'Incident', description: 'Fuite d\'eau Apt B02', time: 'Il y a 5h' },
        { id: 3, type: 'contract', title: 'Nouveau bail', description: 'Marie DOSSOU - Validé', time: 'Hier' },
    ];

    const REVENUE_DATA = [
      { name: 'Jan', revenus: 1200000, depenses: 240000 },
      { name: 'Fév', revenus: 1300000, depenses: 139800 },
      { name: 'Mar', revenus: 1100000, depenses: 98000 },
      { name: 'Avr', revenus: 1578000, depenses: 390800 },
      { name: 'Mai', revenus: 1890000, depenses: 480000 },
      { name: 'Juin', revenus: 2390000, depenses: 380000 },
      { name: 'Juil', revenus: 2490000, depenses: 430000 },
    ];

    const getUserFirstName = (): string => {
        const token = getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const nomComplet = payload.nom || 'Administrateur';
                return nomComplet.split(' ')[0];
            } catch (e) {
                console.error('Erreur lors de la lecture du token:', e);
                return 'Administrateur';
            }
        }
        return 'Administrateur';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = getToken();
            if (!token) {
                setError("Non authentifié.");
                setLoading(false);
                return;
            }
            try {
                // Mock fetch replacement for robust demo
                // const response = await fetch('http://localhost:5000/api/dashboard/stats', { ... });
                // Simulate API delay
                setTimeout(() => {
                    setStats({
                        totalBiens: 15,
                        locatairesActifs: 12,
                        totalRevenus: 4500000,
                        totalDepenses: 1200000,
                        margeNette: 3300000,
                        tauxOccupation: 85,
                        impayesEnCours: 150000
                    });
                    setLoading(false);
                }, 800);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
             <div className="flex justify-center items-center h-screen bg-base-100">
                <div className="loading loading-spinner loading-lg text-primary"></div>
            </div>
        );
    }

    if (!stats) return null;

    const occupationData = [
        { name: 'Occupé', value: stats.tauxOccupation, color: '#6366f1' },
        { name: 'Vacant', value: 100 - stats.tauxOccupation, color: '#e2e8f0' },
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

    return (
        <motion.div 
            className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
                        Vue d'ensemble <span className="text-primary">.</span>
                    </h1>
                    <p className="text-base-content/60 font-medium mt-1">
                        Bonjour {getUserFirstName()}, voici l'état de l'agence.
                    </p>
                </div>
                 <div className="flex items-center gap-3">
                     <Button variant="primary" className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                        <Plus size={18} className="mr-2" />
                        Administration
                    </Button>
                </div>
            </motion.div>

            {/* KPI Grid */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                variants={itemVariants}
            >
                <KPICard 
                    icon={Building2} 
                    label="Parc Immobilier" 
                    value={stats.totalBiens} 
                    color="blue"
                    trend={{ value: "+3", label: "ce mois-ci", positive: true }} 
                />
                <KPICard 
                    icon={Users} 
                    label="Locataires" 
                    value={stats.locatairesActifs} 
                    color="green"
                    trend={{ value: "+2", label: "nouveaux", positive: true }} 
                />
                <KPICard 
                    icon={Wallet} 
                    label="CA Mensuel" 
                    value={formatCurrency(stats.totalRevenus)} 
                    color="purple"
                    trend={{ value: "+8%", label: "vs N-1", positive: true }} 
                />
                <KPICard 
                    icon={AlertCircle} 
                    label="Impayés" 
                    value={formatCurrency(stats.impayesEnCours)} 
                    color="pink"
                    trend={{ value: "-2%", label: "en baisse", positive: true }} 
                />
            </motion.div>

            {/* Main Content Info */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Left Column (Charts & Map) */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Main Chart */}
                     <motion.div variants={itemVariants}>
                        <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100">
                             <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Évolution du Chiffre d'Affaires</h3>
                                    <p className="text-sm text-gray-500">Comparatif 6 mois glissants</p>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenusAdmin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorDepensesAdmin" x1="0" y1="0" x2="0" y2="1">
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
                                        />
                                        <Area type="monotone" dataKey="revenus" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenusAdmin)" name="Revenus" />
                                        <Area type="monotone" dataKey="depenses" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorDepensesAdmin)" name="Dépenses" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </motion.div>

                    {/* Properties List Preview */}
                    <motion.div variants={itemVariants}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Building2 size={20} className="text-primary" />
                                Derniers Biens Ajoutés
                            </h3>
                            <Button variant="ghost" className="text-primary btn-sm hover:bg-primary/5">
                                Voir tout <Eye size={16} className="ml-1" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                                <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                                    <img src={LaPaixImage} alt="Bien" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <h4 className="font-bold text-gray-900 truncate">Résidence La Paix</h4>
                                    <p className="text-sm text-gray-500 mb-2">Haie Vive</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">12 Lots</span>
                                        <span className="text-sm font-bold text-gray-900">100% Occ.</span>
                                    </div>
                                </div>
                            </div>
                             <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 flex gap-4 hover:shadow-xl transition-all cursor-pointer group">
                                <div className="w-24 h-24 rounded-xl bg-gray-200 overflow-hidden relative shrink-0">
                                    <img src={LeDestinImage} alt="Bien" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <h4 className="font-bold text-gray-900 truncate">Immeuble Le Destin</h4>
                                    <p className="text-sm text-gray-500 mb-2">Fidjrossè</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">8 Lots</span>
                                        <span className="text-sm font-bold text-gray-900">75% Occ.</span>
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
                            <h3 className="font-bold text-gray-800 mb-4">Administration</h3>
                            <QuickActions userType="gestionnaire" /> {/* Admin uses manager actions for now */}
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
                                    <span className="text-3xl font-extrabold text-gray-800">{stats.tauxOccupation}%</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Timeline */}
                    <motion.div variants={itemVariants}>
                        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800">Flux d'activité</h3>
                            </div>
                            <ActivityFeed activities={mockActivities} />
                        </div>
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
};

export default Dashboard;