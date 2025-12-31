// frontend/src/pages/Rapports.tsx
import React, { useState } from 'react';
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
  Printer
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

const Rapports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rapports' | 'statistiques'>('statistiques');
  const [selectedPeriod, setSelectedPeriod] = useState<'mois' | 'trimestre' | 'annee'>('mois');

  // Données de démonstration
  const [rapports] = useState([
    { id: 1, nom: 'Rapport des loyers', description: 'Recouvrement des loyers par période', type: 'Financier', date: '2025-01-15' },
    { id: 2, nom: 'Rapport d\'occupation', description: 'Taux d\'occupation des lots', type: 'Exploitation', date: '2025-01-15' },
    { id: 3, nom: 'Rapport des dépenses', description: 'Dépenses par catégorie et par bien', type: 'Financier', date: '2025-01-15' },
    { id: 4, nom: 'Rapport fiscal annuel', description: 'Préparation pour la déclaration fiscale', type: 'Fiscalité', date: '2025-01-10' },
    { id: 5, nom: 'État des lieux global', description: 'Synthèse des états des lieux entrants/sortants', type: 'Exploitation', date: '2025-01-05' },
  ]);

  const revenuData = [
    { name: 'Jan', revenus: 4000000, depenses: 2400000 },
    { name: 'Fév', revenus: 3000000, depenses: 1398000 },
    { name: 'Mar', revenus: 2000000, depenses: 5800000 },
    { name: 'Avr', revenus: 2780000, depenses: 3908000 },
    { name: 'Mai', revenus: 1890000, depenses: 4800000 },
    { name: 'Juin', revenus: 2390000, depenses: 3800000 },
  ];

  const occupationData = [
    { name: 'Occupé', value: 85, color: '#16a34a' },
    { name: 'Vacant', value: 10, color: '#dc2626' },
    { name: 'Travaux', value: 5, color: '#f59e0b' },
  ];

  const COLORS = ['#16a34a', '#dc2626', '#f59e0b'];

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
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
            >
                <option value="mois">Ce Mois</option>
                <option value="trimestre">Ce Trimestre</option>
                <option value="annee">Cette Année</option>
            </select>
            <Button variant="ghost" className="bg-base-100 border border-base-200 text-base-content shadow-sm rounded-full h-10">
                <Printer size={16} className="mr-2" /> Imprimer
            </Button>
             <Button variant="primary" className="rounded-full pl-4 pr-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold">
                <Download size={18} className="mr-2" />
                Exporter Tout
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
                Tableau de Bord
            </button>
            <button
                onClick={() => setActiveTab('rapports')}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'rapports' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <FileText size={18} />
                Bibliothèque
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
                 <Card title="Performance Financière" className="h-96 border-none shadow-xl bg-base-100">
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
                                {occupationData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="text-center mt-4">
                        <p className="text-3xl font-extrabold text-base-content">85%</p>
                        <p className="text-base-content/60 font-medium">Taux Global</p>
                    </div>
                </div>
             </Card>

              {/* Stats Grid */}
             <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Marge Nette", value: "+ 12%", trend: "up", color: "bg-green-100 dark:bg-green-900/30" },
                    { label: "Loyer Moyen", value: "150,000 F", trend: "neutral", color: "bg-blue-100 dark:bg-blue-900/30" },
                    { label: "Taux Impayés", value: "2.4%", trend: "down", color: "bg-red-100 dark:bg-red-900/30" },
                    { label: "Cash Flow", value: "8.5M", trend: "up", color: "bg-purple-100 dark:bg-purple-900/30" }
                ].map((stat, i) => (
                    <Card key={i} className="border-none shadow-lg bg-base-100">
                         <div className="flex items-center gap-4">
                             <div className={`p-4 rounded-full ${stat.color} flex items-center justify-center`}>
                                 <TrendingUp className="text-base-content/50" size={24} />
                             </div>
                             <div>
                                 <p className="text-base-content/60 text-sm font-medium">{stat.label}</p>
                                 <p className="text-2xl font-bold text-base-content">{stat.value}</p>
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
            <Card className="border-none shadow-xl bg-base-100 p-0 overflow-hidden">
                <table className="table w-full">
                    <thead className="bg-base-200/50">
                        <tr>
                            <th className="pl-6 py-4 text-base-content/60 font-semibold">Nom du Rapport</th>
                            <th className="text-base-content/60 font-semibold">Type</th>
                            <th className="text-base-content/60 font-semibold">Date de génération</th>
                            <th className="text-right pr-6 text-base-content/60 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                        {rapports.map(rapport => (
                            <tr key={rapport.id} className="hover:bg-base-200/50 transition-colors">
                                <td className="pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-base-content">{rapport.nom}</div>
                                            <div className="text-xs text-base-content/60">{rapport.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="badge badge-ghost font-medium">{rapport.type}</span></td>
                                <td className="font-mono text-sm text-base-content/60">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-base-content/40"/>
                                        {rapport.date}
                                    </div>
                                </td>
                                <td className="text-right pr-6">
                                    <Button variant="ghost" size="sm" className="btn-square text-base-content/40 hover:text-primary mr-2">
                                        <Eye size={18} />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="btn-square text-base-content/40 hover:text-primary">
                                        <Download size={18} />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
          </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Rapports;
