// frontend/src/pages/Finances.tsx
import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard'; // Reusing premium components
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const Finances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'paiements' | 'depenses' | 'rapports'>('paiements');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'paiement' | 'depense'>('paiement');

  // Données de démonstration
  const [paiements] = useState([
    { id: 1, reference: 'PMT-2025-001', locataire: 'KOFFI Jean', lot: 'A01 - Résidence La Paix', date: '2025-01-15', type: 'Loyer', montant: 150000, modePaiement: 'Mobile Money', statut: 'Validé', fichier: 'reçu_001.pdf' },
    { id: 2, reference: 'PMT-2025-002', locataire: 'DOSSOU Marie', lot: 'A02 - Résidence La Paix', date: '2025-01-16', type: 'Charges', montant: 10000, modePaiement: 'Espèces', statut: 'Validé', fichier: 'reçu_002.pdf' },
    { id: 3, reference: 'PMT-2025-003', locataire: 'ADJINON Sébastien', lot: 'B01 - Immeuble Le Destin', date: '2025-01-17', type: 'Acompte', montant: 200000, modePaiement: 'Virement', statut: 'En attente', fichier: 'reçu_003.pdf' }
  ]);

  const [depenses] = useState([
    { id: 1, reference: 'DEP-2025-001', fournisseur: 'SARL Electricité Pro', type: 'Électricité', date: '2025-01-10', montant: 50000, statut: 'Payé', fichier: 'facture_001.pdf' },
    { id: 2, reference: 'DEP-2025-002', fournisseur: 'SARL Plomberie Expert', type: 'Plomberie', date: '2025-01-12', montant: 75000, statut: 'Payé', fichier: 'facture_002.pdf' },
    { id: 3, reference: 'DEP-2025-003', fournisseur: 'SARL Nettoyage Clean', type: 'Nettoyage', date: '2025-01-15', montant: 30000, statut: 'En attente', fichier: 'facture_003.pdf' }
  ]);

  const [paiementForm, setPaiementForm] = useState({
    reference: '', locataire: '', lot: '', date: '', type: 'Loyer', montant: 0, modePaiement: 'Mobile Money', statut: 'En attente', fichier: null
  });

  const [depenseForm, setDepenseForm] = useState({
    reference: '', fournisseur: '', type: 'Électricité', date: '', montant: 0, statut: 'En attente', fichier: null
  });

  // Données pour les graphiques
  const revenusData = [
    { mois: 'Jan', montant: 1200000, depenses: 300000 },
    { mois: 'Fév', montant: 1500000, depenses: 250000 },
    { mois: 'Mar', montant: 1300000, depenses: 350000 },
    { mois: 'Avr', montant: 1600000, depenses: 280000 },
    { mois: 'Mai', montant: 1400000, depenses: 320000 },
    { mois: 'Jun', montant: 1700000, depenses: 310000 }
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
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Finance & Comptabilité <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Suivi des flux financiers, trésorerie et facturation.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input type="text" placeholder="Rechercher une transaction..." className="input input-sm h-10 pl-10 bg-white border-gray-200 focus:border-primary w-64 rounded-full shadow-sm transition-all focus:w-72" />
            </div>
           <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType(activeTab === 'paiements' || activeTab === 'rapports' ? 'paiement' : 'depense');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            Nouvelle Opération
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('paiements')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'paiements' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <ArrowDownRight size={18} className="text-green-500"/>
                Revenus (Paiements)
            </button>
            <button
                onClick={() => setActiveTab('depenses')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'depenses' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <ArrowUpRight size={18} className="text-red-500"/>
                Dépenses
            </button>
             <button
                onClick={() => setActiveTab('rapports')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rapports' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <BarChart3 size={18} />
                Rapports & Analyses
            </button>
        </div>
         <div className="flex items-center gap-2 px-2 mt-4 sm:mt-0">
             <Button variant="ghost" className="btn-sm font-medium text-gray-500 hover:text-gray-700">
                 <Filter size={16} className="mr-2" />
                 Filtres
             </Button>
         </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showForm ? (
             <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
             >
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                     <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">
                            {formType === 'paiement' ? 'Encaisser un paiement' : 'Enregistrer une dépense'}
                        </h2>
                        <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                            <Trash2 size={18} className="text-gray-400" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formType === 'paiement' ? (
                            <>
                                <Input label="Référence" placeholder="Auto-généré" value={paiementForm.reference} onChange={(e) => setPaiementForm({...paiementForm, reference: e.target.value})} />
                                <Input label="Montant (FCFA)" type="number" value={paiementForm.montant} onChange={(e) => setPaiementForm({...paiementForm, montant: parseFloat(e.target.value)})} />
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Locataire</label>
                                    <select className="select select-bordered w-full bg-gray-50" value={paiementForm.locataire} onChange={(e) => setPaiementForm({...paiementForm, locataire: e.target.value})}>
                                        <option value="">Choisir...</option>
                                        <option value="KOFFI Jean">KOFFI Jean</option>
                                    </select>
                                </div>
                                 
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                                    <select className="select select-bordered w-full bg-gray-50" value={paiementForm.type} onChange={(e) => setPaiementForm({...paiementForm, type: e.target.value})}>
                                        <option>Loyer</option>
                                        <option>Charges</option>
                                        <option>Caution</option>
                                    </select>
                                </div>

                                <Input label="Date" type="date" value={paiementForm.date} onChange={(e) => setPaiementForm({...paiementForm, date: e.target.value})} />
                                
                                <div className="md:col-span-2">
                                     <label className="block text-sm font-bold text-gray-700 mb-2">Preuve de paiement</label>
                                     <div className="h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary transition-all">
                                         <p className="text-sm">Glisser-déposer un reçu ou cliquer pour parcourir</p>
                                     </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Depense Form */}
                                <Input label="Référence" placeholder="Auto-généré" value={depenseForm.reference} onChange={(e) => setDepenseForm({...depenseForm, reference: e.target.value})} />
                                <Input label="Montant (FCFA)" type="number" value={depenseForm.montant} onChange={(e) => setDepenseForm({...depenseForm, montant: parseFloat(e.target.value)})} />
                                <Input label="Fournisseur" value={depenseForm.fournisseur} onChange={(e) => setDepenseForm({...depenseForm, fournisseur: e.target.value})} />
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie</label>
                                    <select className="select select-bordered w-full bg-gray-50" value={depenseForm.type} onChange={(e) => setDepenseForm({...depenseForm, type: e.target.value})}>
                                        <option>Électricité</option>
                                        <option>Eau</option>
                                        <option>Maintenance</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                        <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                        <Button variant="primary" onClick={() => setShowForm(false)}>Confirmer</Button>
                    </div>
                </Card>
             </motion.div>
        ) : (
             <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
             >
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                        icon={Wallet} 
                        label="Total Revenus" 
                        value="2,8M F" 
                        color="green" 
                        trend={{ value: "+12%", label: "ce mois", positive: true }} 
                    />
                     <KPICard 
                        icon={TrendingDown} 
                        label="Total Dépenses" 
                        value="155k F" 
                        color="red" 
                        trend={{ value: "-5%", label: "vs N-1", positive: true }} 
                    />
                    <KPICard 
                        icon={TrendingUp} 
                        label="Bénéfice Net" 
                        value="2,6M F" 
                        color="blue" 
                    />
                     <KPICard 
                        icon={FileText} 
                        label="En Attente" 
                        value="230k F" 
                        color="orange" 
                        trend={{ value: "3", label: "factures", positive: false }} 
                    />
                </div>

                {activeTab === 'rapports' ? (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <Card className="border-none shadow-xl bg-white">
                             <h3 className="font-bold text-gray-800 mb-6">Évolution Mensuelle</h3>
                             <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenusData}>
                                        <defs>
                                            <linearGradient id="colorRevenusFin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorDepensesFin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="montant" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenusFin)" name="Revenus" />
                                        <Area type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDepensesFin)" name="Dépenses" />
                                    </AreaChart>
                                </ResponsiveContainer>
                             </div>
                         </Card>
                     </div>
                ) : (
                    /* Table View for Paiements or Depenses */
                    <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                         <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="py-4 pl-6">Référence</th>
                                        <th>{activeTab === 'paiements' ? 'Locataire / Lot' : 'Fournisseur / Type'}</th>
                                        <th>Date</th>
                                        <th>Montant</th>
                                        <th>Statut</th>
                                        <th className="pr-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(activeTab === 'paiements' ? paiements : depenses).map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="pl-6 font-medium text-gray-800">{item.reference}</td>
                                            <td>
                                                <div className="font-bold text-gray-700">{activeTab === 'paiements' ? item.locataire : item.fournisseur}</div>
                                                <div className="text-xs text-gray-400">{activeTab === 'paiements' ? item.lot : item.type}</div>
                                            </td>
                                            <td className="text-gray-500">{new Date(item.date).toLocaleDateString()}</td>
                                            <td className={`font-mono font-bold ${activeTab === 'paiements' ? 'text-green-600' : 'text-red-600'}`}>
                                                {activeTab === 'paiements' ? '+' : '-'}{item.montant.toLocaleString()} F
                                            </td>
                                            <td>
                                                <span className={`badge ${item.statut === 'Validé' || item.statut === 'Payé' ? 'badge-success' : 'badge-warning'} gap-1 font-bold`}>
                                                    {item.statut}
                                                </span>
                                            </td>
                                            <td className="pr-6 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14} /></Button>
                                                    <Button variant="ghost" size="sm" className="btn-square btn-xs"><Download size={14} /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </Card>
                )}
             </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Finances;