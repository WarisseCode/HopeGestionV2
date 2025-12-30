// frontend/src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { getToken } from '../api/authApi';
import { 
    Home, 
    Users, 
    Wallet, 
    TrendingUp, 
    AlertCircle, 
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    Clock,
    PlusCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Select from '../components/ui/Select';
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
import LaPaixImage from '../assets/images/residence-la-paix.png';
import LeDestinImage from '../assets/images/immeuble-le-destin.png';

// --- SUB-COMPONENTS ---
const KPICard = ({ title, value, trend, trendUp, icon, color, textColor, isWarning }: any) => (
    <motion.div 
        variants={{hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 }}}
        className={`rounded-xl shadow-md border ${isWarning ? 'border-error' : 'border-base-200'} overflow-hidden ${color} ${textColor || 'text-base-content'}`}
    >
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <p className={`text-sm font-medium ${textColor ? 'text-white/80' : 'text-base-content/80'} mb-1`}>{title}</p>
                    <h3 className="text-2xl font-bold">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${textColor ? 'bg-white/20' : 'bg-base-200'}`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-xs font-medium">
                {trendUp ? <ArrowUpRight size={14} className="text-success" /> : <ArrowDownRight size={14} className={isWarning ? "text-error" : "text-error"} />}
                <span className={trendUp ? "text-success" : (isWarning ? "text-error" : "text-base-content/60")}>{trend}</span>
            </div>
        </div>
    </motion.div>
);

const ActivityItem = ({ icon, title, time, desc }: any) => (
    <div className="flex items-start gap-3 pb-3 border-b border-base-200 last:border-0">
        <div className="mt-1 bg-base-200 p-2 rounded-full">{icon}</div>
        <div className="flex-1">
            <div className="flex justify-between">
                <h4 className="font-semibold text-sm text-base-content">{title}</h4>
                <span className="text-xs text-base-content/60">{time}</span>
            </div>
            <p className="text-xs text-base-content/70 mt-1 line-clamp-1">{desc}</p>
        </div>
    </div>
);

const PropertyCard = ({ image, title, location, units, occupancy, status, isVacant }: any) => (
    <div className="rounded-xl overflow-hidden shadow-md border border-base-200 hover:shadow-xl transition-all duration-300 group cursor-pointer">
        <div className="relative h-48 overflow-hidden">
            <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold ${isVacant ? 'bg-error text-error-content' : 'bg-success text-success-content'}`}>
                {status}
            </div>
        </div>
        <div className="p-5">
            <h3 className="text-lg font-semibold text-base-content mb-2">{title}</h3>
            <div className="flex items-center text-sm text-base-content/70 mb-3">
                <Users size={14} className="mr-1" /> {location}
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-base-200">
                <span className="text-sm font-semibold text-base-content">{units}</span>
                <span className={`text-sm font-bold ${isVacant ? 'text-error' : 'text-success'}`}>{occupancy} Occ.</span>
            </div>
        </div>
    </div>
);

// --- DATA TYPES ---
interface DashboardStats {
    totalBiens: number;
    locatairesActifs: number;
    totalRevenus: string;
    totalDepenses: string;
    margeNette: string;
    rentabilitePourcentage: string;
}

// --- MOCK DATA FOR CHARTS (To be replaced by API) ---
const REVENUE_DATA = [
  { name: 'Jan', revenus: 400000, depenses: 24000 },
  { name: 'Fév', revenus: 300000, depenses: 13980 },
  { name: 'Mar', revenus: 200000, depenses: 98000 },
  { name: 'Avr', revenus: 278000, depenses: 39080 },
  { name: 'Mai', revenus: 189000, depenses: 48000 },
  { name: 'Juin', revenus: 239000, depenses: 38000 },
  { name: 'Juil', revenus: 349000, depenses: 43000 },
];

const OCCUPANCY_DATA = [
    { name: 'Occupé', value: 85, color: '#3f51b5' }, // Primary
    { name: 'Vacant', value: 10, color: '#f50057' }, // Secondary
    { name: 'Travaux', value: 5, color: '#ff9800' }, // Warning
];

// --- COMPONENT ---
const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getUserFirstName = (): string => {
        console.log("Dashboard updated with AreaChart"); // Debug log for user
        const token = getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const nomComplet = payload.nom || 'Utilisateur';
                return nomComplet.split(' ')[0];
            } catch (e) {
                console.error('Erreur lors de la lecture du token:', e);
                return 'Utilisateur';
            }
        }
        return 'Utilisateur';
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
                const response = await fetch('http://localhost:5000/api/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (response.ok) setStats(data.stats);
                else throw new Error(data.message);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // --- RENDER HELPERS ---
    
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="mt-4 text-base-content/60 font-medium">Chargement de votre bureau...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="error" className="m-4">
                <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            </Alert>
        );
    }
    if (!stats) {
        return (
            <Alert variant="warning" className="m-4">
                Aucune donnée disponible.
            </Alert>
        );
    }

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

    return (
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="space-y-8 p-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 1. Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-base-content">Bonjour, {getUserFirstName()} 👋</h1>
                <p className="text-base-content/60 mt-1">Voici ce qui se passe sur votre parc immobilier aujourd'hui.</p>
            </div>

            {/* 2. Quick Actions Cards */}
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
                variants={itemVariants}
            >
                {/* Action 1: Ajouter un bien */}
                <Card className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <div className="flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <Home size={32} className="text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-base-content mb-2">Ajouter un bien</h3>
                        <p className="text-sm text-base-content/60">Enregistrer une nouvelle propriété</p>
                    </div>
                </Card>

                {/* Action 2: Ajouter un locataire */}
                <Card className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                    <div className="flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                            <Users size={32} className="text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-base-content mb-2">Ajouter un locataire</h3>
                        <p className="text-sm text-base-content/60">Inviter un nouveau locataire</p>
                    </div>
                </Card>

                {/* Action 3: Nouveau paiement */}
                <Card className="cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                    <div className="flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                            <Wallet size={32} className="text-success" />
                        </div>
                        <h3 className="text-lg font-semibold text-base-content mb-2">Nouveau paiement</h3>
                        <p className="text-sm text-base-content/60">Enregistrer un loyer reçu</p>
                    </div>
                </Card>
            </motion.div>

            {/* 2. Key Performance Indicators (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard 
                    title="Revenus du mois"
                    value={`${stats.totalRevenus} FCFA`}
                    trend="+12% vs mois dernier"
                    trendUp={true}
                    icon={<Wallet className="text-white" />}
                    color="bg-primary"
                    textColor="text-white"
                />
                <KPICard 
                    title="Taux d'occupation"
                    value={`${Math.round((stats.locatairesActifs / stats.totalBiens) * 100)}%`}
                    trend="2 unités vacantes"
                    trendUp={false}
                    icon={<Users className="text-primary" />}
                    color="bg-base-100"
                />
                <KPICard 
                    title="Impayés en cours"
                    value="150,000 FCFA"
                    trend="3 locataires en retard"
                    trendUp={false}
                    isWarning={true}
                    icon={<AlertCircle className="text-error" />}
                    color="bg-base-100"
                />
                 <KPICard 
                    title="Demandes en attente"
                    value="5"
                    trend="Maintenance & Visites"
                    trendUp={true}
                    icon={<Clock className="text-warning" />}
                    color="bg-base-100"
                />
            </div>

            {/* 3. Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue vs Expenses Bar Chart */}
                <motion.div variants={itemVariants}>
                    <Card title="Revenus vs Dépenses">
                        <div className="flex justify-end mb-4">
                            <Select
                                className="w-auto"
                                options={[
                                    { value: '6m', label: '6 derniers mois' },
                                    { value: '1y', label: 'Cette année' }
                                ]}
                            />
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3f51b5" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#3f51b5" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f50057" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#f50057" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                        formatter={(value: number | undefined) => value ? [`${value?.toLocaleString()} FCFA`, 'Montant'] : ['0 FCFA', 'Montant']}
                                    />
                                    <Legend 
                                        wrapperStyle={{paddingTop: '20px'}}
                                        iconType="circle"
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="revenus" 
                                        stroke="#3f51b5" 
                                        fillOpacity={1} 
                                        fill="url(#colorRevenus)" 
                                        name="Revenus"
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="depenses" 
                                        stroke="#f50057" 
                                        fillOpacity={1} 
                                        fill="url(#colorDepenses)" 
                                        name="Dépenses"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </motion.div>

                {/* Occupancy Pie Chart */}
                <motion.div variants={itemVariants}>
                    <Card title="Taux d'Occupation">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={OCCUPANCY_DATA}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {OCCUPANCY_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                        formatter={(value: number | undefined) => value ? [`${value}%`, 'Taux'] : ['0%', 'Taux']}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        height={36}
                                        iconType="circle"
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </motion.div>

                {/* Recent Activities / Alerts */}
                <motion.div variants={itemVariants}>
                    <Card title="Activités Récentes">
                        <div className="space-y-4">
                            <ActivityItem 
                                icon={<CheckCircle2 size={16} className="text-success" />}
                                title="Loyer reçu - Apt A01"
                                time="Il y a 2h"
                                desc="Jean KOFFI a payé 150,000 FCFA par MoMo"
                            />
                            <ActivityItem 
                                icon={<AlertCircle size={16} className="text-error" />}
                                title="Fuite d'eau signalée"
                                time="Il y a 5h"
                                desc="Résidence La Paix, Apt B02"
                            />
                            <ActivityItem 
                                icon={<Users size={16} className="text-primary" />}
                                title="Nouveau locataire"
                                time="Hier"
                                desc="Dossier validé pour Marie DOSSOU"
                            />
                             <ActivityItem 
                                icon={<Clock size={16} className="text-warning" />}
                                title="Contrat expire bientôt"
                                time="Dans 15 jours"
                                desc="Boutique C04 - Marché Dantokpa"
                            />
                        </div>
                        <div className="mt-4">
                            <Button variant="ghost" className="w-full">
                                Voir tout l'historique
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* 4. Properties Grid Preview */}
            <motion.div variants={itemVariants}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-base-content">Vos Biens Immobiliers</h3>
                    <a href="#" className="text-sm font-semibold text-primary hover:text-primary-focus">Voir tous les biens</a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PropertyCard 
                        image={LaPaixImage}
                        title="Résidence La Paix"
                        location="Haie Vive, Cotonou"
                        units="12 Lots"
                        occupancy="100%"
                        status="Complet"
                    />
                    <PropertyCard 
                        image={LeDestinImage} 
                        title="Immeuble Le Destin"
                        location="Fidjrossè, Cotonou"
                        units="8 Lots"
                        occupancy="75%"
                        status="Disponible"
                    />
                    <PropertyCard 
                        image={LaPaixImage} // Temporary reuse due to quota
                        title="Villa Les Cocotiers"
                        location="Cocotiers, Cotonou"
                        units="1 Lot"
                        occupancy="0%"
                        status="Vacant"
                        isVacant
                    />
                </div>
            </motion.div>
          </motion.div>
        </div>
    );
};

export default Dashboard;