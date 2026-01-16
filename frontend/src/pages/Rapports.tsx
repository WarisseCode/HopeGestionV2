// frontend/src/pages/Rapports.tsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp,
  BarChart3,
  PieChart,
  Filter,
  Eye,
  Sliders,
  Printer,
  Building,
  Loader2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { getBuildingStats, exportExcel } from '../api/reportApi';
import type { BuildingStats } from '../api/reportApi';
import { getImmeubles } from '../api/bienApi';
import type { Immeuble } from '../api/bienApi';
import toast from 'react-hot-toast';

const Rapports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rapports' | 'statistiques'>('statistiques');
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | 'all'>('all');
  const [stats, setStats] = useState<BuildingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Données de démonstration pour le graphique (à remplacer par des données historiques réelles plus tard)
  const revenuData = [
    { name: 'Jan', revenus: 4000, depenses: 2400 },
    { name: 'Fév', revenus: 3000, depenses: 1398 },
    { name: 'Mar', revenus: 2000, depenses: 9800 },
    { name: 'Avr', revenus: 2780, depenses: 3908 },
    { name: 'Mai', revenus: 1890, depenses: 4800 },
    { name: 'Juin', revenus: 2390, depenses: 3800 },
  ];

  useEffect(() => {
    loadImmeubles();
  }, []);

  useEffect(() => {
    if (selectedBuildingId !== 'all') {
      loadBuildingStats(selectedBuildingId as number);
    } else {
        setStats(null);
    }
  }, [selectedBuildingId]);

  const loadImmeubles = async () => {
    try {
      const data = await getImmeubles();
      setImmeubles(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBuildingStats = async (id: number) => {
    setLoading(true);
    try {
      const data = await getBuildingStats(id);
      setStats(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportExcel();
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'exportation');
    } finally {
      setExporting(false);
    }
  };

  const occupationData = stats ? [
    { name: 'Occupé', value: stats.stats.occupied_lots, color: '#16a34a' },
    { name: 'Vacant', value: stats.stats.total_lots - stats.stats.occupied_lots, color: '#dc2626' },
  ] : [
    { name: 'Occupé', value: 85, color: '#16a34a' },
    { name: 'Vacant', value: 15, color: '#dc2626' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-[1700px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Rapports & Statistiques <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">Analysez la performance de votre parc immobilier.</p>
        </div>
        <div className="flex gap-3">
            <select 
                className="select select-bordered bg-base-100 shadow-sm rounded-full h-10 min-h-0"
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            >
                <option value="all">Tous les immeubles</option>
                {immeubles.map(imm => (
                    <option key={imm.id} value={imm.id}>{imm.nom}</option>
                ))}
            </select>
            <Button 
                variant="primary" 
                className="rounded-full pl-4 pr-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
                onClick={handleExport}
                disabled={exporting}
            >
                {exporting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Download size={18} className="mr-2" />}
                Exporter Excel
            </Button>
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200 mb-6">
        <div className="flex p-1 bg-base-200/50 rounded-xl overflow-x-auto w-full sm:w-auto">
             <button
                onClick={() => setActiveTab('statistiques')}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'statistiques' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <BarChart3 size={18} />
                Analyses
            </button>
            <button
                onClick={() => setActiveTab('rapports')}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'rapports' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <FileText size={18} />
                Documents
            </button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
      {activeTab === 'statistiques' && (
          <motion.div
             key="stats"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
             {/* Chart 1: Revenue vs Expenses */}
             <div className="lg:col-span-2">
                 <Card title="Performance Financière (Demo)" className="h-96 border-none shadow-xl bg-base-100">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenuData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorDepenses" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <Area type="monotone" dataKey="revenus" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenus)" name="Revenus" />
                            <Area type="monotone" dataKey="depenses" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorDepenses)" name="Dépenses" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                 </Card>
             </div>

             {/* Chart 2: Occupation */}
             <Card title="Taux d'Occupation" className="h-96 border-none shadow-xl bg-base-100">
                <div className="h-full flex flex-col items-center justify-center">
                    {loading ? (
                        <Loader2 className="animate-spin text-primary" size={40} />
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={250}>
                                <RechartsPieChart>
                                    <Pie
                                        data={occupationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {occupationData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-4">
                                <p className="text-3xl font-extrabold text-base-content">
                                    {stats ? `${stats.stats.occupancy_rate}%` : '85%'}
                                </p>
                                <p className="text-base-content/60 font-medium">Occupation actuelle</p>
                            </div>
                        </>
                    )}
                </div>
             </Card>

              {/* Stats Grid */}
             <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { 
                        label: "Recouvrement", 
                        value: stats ? `${stats.stats.financial_performance.collection_efficiency}%` : "---", 
                        sub: "Efficacité mensuelle",
                        color: "bg-green-100 dark:bg-green-900/30" 
                    },
                    { 
                        label: "Total Dû", 
                        value: stats ? `${stats.stats.financial_performance.total_due.toLocaleString()} F` : "---", 
                        sub: "Ce mois-ci",
                        color: "bg-blue-100 dark:bg-blue-900/30" 
                    },
                    { 
                        label: "Total Encaissé", 
                        value: stats ? `${stats.stats.financial_performance.total_paid.toLocaleString()} F` : "---", 
                        sub: "Ce mois-ci",
                        color: "bg-purple-100 dark:bg-purple-900/30" 
                    },
                    { 
                        label: "Lots Occupés", 
                        value: stats ? `${stats.stats.occupied_lots} / ${stats.stats.total_lots}` : "---", 
                        sub: "Sur l'immeuble",
                        color: "bg-orange-100 dark:bg-orange-900/30" 
                    }
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-lg bg-base-100 hover:scale-[1.02] transition-transform">
                         <div className="flex items-center gap-4">
                             <div className={`p-4 rounded-full ${stat.color} flex items-center justify-center`}>
                                 <TrendingUp className="text-base-content/50" size={24} />
                             </div>
                             <div>
                                 <p className="text-base-content/60 text-sm font-medium">{stat.label}</p>
                                 <p className="text-2xl font-bold text-base-content">{stat.value}</p>
                                 <p className="text-xs text-base-content/40 mt-1">{stat.sub}</p>
                             </div>
                         </div>
                    </Card>
                ))}
             </div>
          </motion.div>
      )}

      {activeTab === 'rapports' && (
          <motion.div
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-none shadow-xl bg-base-100 p-8 text-center text-gray-500">
                <FileText className="mx-auto mb-4 opacity-20" size={60} />
                <p className="text-lg font-medium">Bibliothèque de rapports archivés</p>
                <p className="text-sm opacity-60">Les rapports générés seront listés ici.</p>
            </Card>
          </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Rapports;
