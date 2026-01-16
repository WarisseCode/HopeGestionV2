// frontend/src/pages/Finances.tsx
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Eye, 
  Trash2, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  Filter,
  BarChart3,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { financeApi } from '../api/financeApi';
import type { Payment } from '../api/financeApi';
import { getLocataires, getLocataireDetails } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';

const Finances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'paiements' | 'depenses' | 'rapports'>('paiements');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'paiement' | 'depense'>('paiement');

  const [paiements, setPaiements] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ revenus: 0, depenses: 0, benefice: 0 });
  const [loading, setLoading] = useState(true);

  // Selectors Data
  const [locataires, setLocataires] = useState<Locataire[]>([]);

  // Chart Data (Mock for now, will implement real history later)
  const [revenusData, setRevenusData] = useState<any[]>([
      { mois: 'Jan', montant: 0 }, { mois: 'Fév', montant: 0 }, { mois: 'Mar', montant: 0 }
  ]);

  const [paiementForm, setPaiementForm] = useState({
    locataireId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'loyer',
    montant: 0,
    modePaiement: 'especes',
    reference: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Load only payments and stats for now (Expenses backend not ready)
      const [pData, pStats, locs] = await Promise.all([
        financeApi.getPayments(),
        financeApi.getStats(),
        getLocataires('Locataire')
      ]);
      
      setPaiements(pData);
      setLocataires(locs);

      setStats({
        revenus: pStats.encashed_month,
        depenses: 0, // Placeholder
        benefice: pStats.encashed_month - 0
      });

    } catch (error) {
      console.error("Erreur chargement finances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
      try {
          if (formType === 'paiement') {
              if (!paiementForm.locataireId) {
                  alert("Veuillez sélectionner un locataire");
                  return;
              }
              const details = await getLocataireDetails(parseInt(paiementForm.locataireId));
              // Find active lease
              const activeLease = details.baux.find((b: any) => b.statut === 'actif');
              const leaseId = activeLease ? activeLease.id : (details.baux.length > 0 ? details.baux[0].id : null);

              if (!leaseId) {
                  alert("Ce locataire n'a pas de bail actif");
                  return;
              }

              await financeApi.createPayment({
                  lease_id: leaseId,
                  amount: paiementForm.montant,
                  type: paiementForm.type,
                  payment_method: paiementForm.modePaiement,
                  payment_date: paiementForm.date || new Date().toISOString(),
                  reference: paiementForm.reference
              });
              
              alert("Paiement enregistré avec succès !");
          } else {
              alert("Gestion des dépenses bientôt disponible");
              return;
          }
          setShowForm(false);
          fetchData(); // Refresh data
      } catch (error: any) {
          console.error("Erreur lors de la soumission:", error);
          alert(error.message || "Erreur lors de l'enregistrement");
      }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
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
            Suivi des flux financiers (Paiements & Recettes)
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType('paiement');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            Encaisser un paiement
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
                Dépenses (Bientôt)
            </button>
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
                <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm max-w-2xl mx-auto">
                     <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">
                            Encaisser un paiement
                        </h2>
                        <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                            <Trash2 size={18} className="text-gray-400" />
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Locataire</label>
                            <select className="select select-bordered w-full bg-gray-50 p-2 border rounded-lg" value={paiementForm.locataireId} onChange={(e) => setPaiementForm({...paiementForm, locataireId: e.target.value})}>
                                <option value="">Choisir un locataire...</option>
                                {locataires.map(l => (
                                    <option key={l.id} value={l.id}>{l.prenoms} {l.nom}</option>
                                ))}
                            </select>
                        </div>
                                
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Montant (FCFA)" type="number" value={paiementForm.montant} onChange={(e) => setPaiementForm({...paiementForm, montant: parseFloat(e.target.value)})} />
                            <Input label="Date" type="date" value={paiementForm.date} onChange={(e) => setPaiementForm({...paiementForm, date: e.target.value})} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                                <select className="select select-bordered w-full bg-gray-50 p-2 border rounded-lg" value={paiementForm.type} onChange={(e) => setPaiementForm({...paiementForm, type: e.target.value})}>
                                    <option value="loyer">Loyer</option>
                                    <option value="charges">Charges</option>
                                    <option value="caution">Caution</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Mode Paiement</label>
                                <select className="select select-bordered w-full bg-gray-50 p-2 border rounded-lg" value={paiementForm.modePaiement} onChange={(e) => setPaiementForm({...paiementForm, modePaiement: e.target.value})}>
                                    <option value="especes">Espèces</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="virement">Virement</option>
                                    <option value="cheque">Chèque</option>
                                </select>
                            </div>
                        </div>

                         <Input label="Référence / Notes" placeholder="Ex: Chèque n°123" value={paiementForm.reference} onChange={(e) => setPaiementForm({...paiementForm, reference: e.target.value})} />
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                        <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                        <Button variant="primary" onClick={handleSubmit}>Enregistrer</Button>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard 
                        icon={Wallet} 
                        label="Total Encaissé (Mois)" 
                        value={formatCurrency(stats.revenus)} 
                        color="green" 
                        trend={{ value: "+100%", label: "depuis début", positive: true }} 
                    />
                     <KPICard 
                        icon={TrendingDown} 
                        label="Total Dépenses" 
                        value={formatCurrency(stats.depenses)} 
                        color="orange" 
                    />
                    <KPICard 
                        icon={TrendingUp} 
                        label="Bénéfice Net" 
                        value={formatCurrency(stats.benefice)} 
                        color="blue" 
                    />
                </div>

                {activeTab === 'paiements' ? (
                    /* Table View for Paiements */
                    <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                         <div className="overflow-x-auto">
                            <table className="table w-full text-left">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="py-4 pl-6 font-semibold">Référence</th>
                                        <th className="py-4 font-semibold">Locataire / Bail</th>
                                        <th className="py-4 font-semibold">Date</th>
                                        <th className="py-4 font-semibold">Montant</th>
                                        <th className="py-4 font-semibold">Mode</th>
                                        <th className="py-4 pr-6 text-right font-semibold">Statut</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paiements.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="pl-6 py-3 font-medium text-gray-800">
                                                P-00{item.id}<br/>
                                                <span className="text-xs text-gray-500">{item.type}</span>
                                            </td>
                                            <td className="py-3">
                                                <div className="font-bold text-gray-700">{item.locataire_prenoms} {item.locataire_nom}</div>
                                                <div className="text-xs text-gray-400">{item.reference_bail}</div>
                                            </td>
                                            <td className="py-3 text-gray-500">{new Date(item.payment_date).toLocaleDateString()}</td>
                                            <td className="py-3 font-mono font-bold text-green-600">
                                                {formatCurrency(parseFloat(item.amount as any))}
                                            </td>
                                            <td className="py-3">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs capitalize">
                                                    {item.payment_method?.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="pr-6 py-3 text-right">
                                                <span className={`badge ${item.statut === 'valide' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'} px-2 py-1 rounded-full text-xs font-bold capitalize`}>
                                                    {item.statut}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {paiements.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500">Aucun paiement enregistré</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                    </Card>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                        <TrendingDown size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-medium text-gray-800">Module Dépenses</h3>
                        <p className="text-gray-500 mt-2">Ce module sera disponible très prochainement.</p>
                    </div>
                )}
             </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Finances;