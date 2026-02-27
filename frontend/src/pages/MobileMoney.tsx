// frontend/src/pages/MobileMoney.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit3, 
  Trash2, 
  Wallet,
  CheckCircle,
  XCircle,
  Settings,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  RefreshCw,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
    getTransactionsMoMo, 
    initierPaiement, 
    getConfigs, 
    addConfig, 
    deleteConfig, 
    toggleConfig,
    type MobileMoneyTransaction,
    type MobileMoneyConfig
} from '../api/mobileMoneyApi';

const MobileMoney: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'configurations'>('transactions');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'transaction' | 'configuration'>('transaction');

  const [transactions, setTransactions] = useState<MobileMoneyTransaction[]>([]);
  const [configurations, setConfigurations] = useState<MobileMoneyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Forms State
  const [txForm, setTxForm] = useState({
      remarque: '', montant: '', operator: 'MTN', phone: ''
  });
  const [configForm, setConfigForm] = useState({
      nom: '', operateur: 'MTN', numero: ''
  });

  useEffect(() => {
      loadData();
  }, []);

  const loadData = async () => {
      setLoading(true);
      try {
          const [txs, configs] = await Promise.all([
              getTransactionsMoMo(),
              getConfigs()
          ]);
          setTransactions(txs);
          setConfigurations(configs);
      } catch (e) {
          console.error("Erreur chargement:", e);
          toast.error("Erreur lors du chargement des données");
      } finally {
          setLoading(false);
      }
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      const totalIn = transactions
        .filter(t => t.transaction_type === 'collection' && t.status === 'success')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      
      const totalOut = transactions
        .filter(t => t.transaction_type === 'payout' && t.status === 'success')
        .reduce((acc, curr) => acc + Number(curr.amount), 0);
      
      return {
          total: totalIn - totalOut,
          in: totalIn,
          out: totalOut,
          countIn: transactions.filter(t => t.transaction_type === 'collection').length,
          countOut: transactions.filter(t => t.transaction_type === 'payout').length
      };
  }, [transactions]);

  // --- ACTIONS ---

  const handleTransactionSubmit = async () => {
      if (!txForm.montant || !txForm.phone) return toast.error("Montant et numéro requis");
      
      setSubmitting(true);
      try {
          await initierPaiement({
              amount: Number(txForm.montant),
              phoneNumber: txForm.phone,
              operator: txForm.operator,
              description: txForm.remarque
          });
          toast.success("Transaction initiée / enregistrée");
          setShowForm(false);
          loadData();
          setTxForm({ remarque: '', montant: '', operator: 'MTN', phone: '' });
      } catch (e: any) {
          toast.error(e.message || "Erreur lors de la transaction");
      } finally {
          setSubmitting(false);
      }
  };

  const handleConfigSubmit = async () => {
      if (!configForm.nom || !configForm.numero) return toast.error("Nom et numéro requis");

      setSubmitting(true);
      try {
          await addConfig({
              nom: configForm.nom,
              operateur: configForm.operateur,
              numero: configForm.numero
          });
          toast.success("Compte ajouté avec succès");
          setShowForm(false);
          loadData();
          setConfigForm({ nom: '', operateur: 'MTN', numero: '' });
      } catch (e: any) {
          toast.error(e.message || "Erreur ajout compte");
      } finally {
          setSubmitting(false);
      }
  };

  const handleDeleteConfig = async (id: number) => {
      if(!window.confirm("Supprimer ce compte ?")) return;
      try {
          await deleteConfig(id);
          toast.success("Compte supprimé");
          setConfigurations(prev => prev.filter(c => c.id !== id));
      } catch (e: any) {
          toast.error("Erreur suppression");
      }
  };

  const handleToggleConfig = async (id: number) => {
      try {
          const updated = await toggleConfig(id);
          setConfigurations(prev => prev.map(c => c.id === id ? updated : c));
          toast.success("Statut mis à jour");
      } catch (e: any) {
          toast.error("Erreur mise à jour");
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
            Transactions Mobiles <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">Gérez vos paiements Mobile Money et configurations.</p>
        </div>
        <div className="flex gap-3">
             <Button variant="ghost" className="bg-base-100 border border-base-200 text-base-content shadow-sm rounded-full h-10" onClick={loadData}>
                <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button 
                variant="primary" 
                className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
                onClick={() => {
                  setFormType(activeTab === 'transactions' ? 'transaction' : 'configuration');
                  setShowForm(true);
                }}
            >
                <Plus size={18} className="mr-2" />
                {activeTab === 'transactions' ? 'Nouvelle Transaction' : 'Ajouter Compte'}
            </Button>
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200 mb-6">
        <div className="flex p-1 bg-base-200/50 rounded-xl overflow-x-auto w-full sm:w-auto">
             <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'transactions' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <Wallet size={18} />
                Transactions
            </button>
            <button
                onClick={() => setActiveTab('configurations')}
                className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'configurations' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content'
                }`}
            >
                <Settings size={18} />
                Comptes & Config
            </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-blue-100 font-medium mb-1">Solde Total (Théorique)</p>
                      <h3 className="text-3xl font-bold">{stats.total.toLocaleString()} F</h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Wallet size={24} className="text-white"/>
                  </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-100 bg-blue-600/30 w-fit px-2 py-1 rounded-lg">
                  <TrendingUp size={14} /> Basé sur l'historique
              </div>
          </Card>
           <Card className="border-none shadow-lg bg-base-100">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-base-content/60 font-medium mb-1">Entrées</p>
                      <h3 className="text-3xl font-bold text-base-content">{stats.in.toLocaleString()} F</h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <ArrowDownLeft size={24}/>
                  </div>
              </div>
              <div className="mt-4 text-sm text-base-content/40">
                  {stats.countIn} transactions reçues
              </div>
          </Card>
           <Card className="border-none shadow-lg bg-base-100">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-base-content/60 font-medium mb-1">Sorties</p>
                      <h3 className="text-3xl font-bold text-base-content">{stats.out.toLocaleString()} F</h3>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <ArrowUpRight size={24}/>
                  </div>
              </div>
              <div className="mt-4 text-sm text-base-content/40">
                  {stats.countOut} transactions envoyées
              </div>
          </Card>
      </motion.div>

      <AnimatePresence mode="wait">
      {activeTab === 'transactions' && (
        <motion.div
            key="transactions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
        >
             {/* Filters */}
            <Card className="border-none shadow-sm bg-base-100 p-2">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40" />
                    <input 
                        type="text" 
                        placeholder="Rechercher une transaction..." 
                        className="input input-sm h-10 w-full pl-11 bg-base-200/50 border-transparent focus:bg-base-100 focus:border-primary rounded-xl transition-all"
                    />
                    </div>
                </div>
            </Card>

            <Card className="border-none shadow-xl bg-base-100 p-0 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="table w-full">
                    <thead className="bg-base-200/50">
                        <tr>
                            <th className="pl-6 py-4 text-base-content/60 font-semibold">Référence</th>
                            <th className="text-base-content/60 font-semibold">Type</th>
                            <th className="text-base-content/60 font-semibold">Opérateur</th>
                            <th className="text-base-content/60 font-semibold">Montant</th>
                            <th className="text-base-content/60 font-semibold">Description</th>
                            <th className="text-base-content/60 font-semibold">Statut</th>
                            <th className="text-base-content/60 font-semibold text-right pr-6">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                        {transactions.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-8 text-base-content/40">Aucune transaction</td></tr>
                        ) : transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                                <td className="pl-6 font-medium text-base-content">{tx.transaction_id || 'PENDING-' + tx.id}</td>
                                <td>
                                    <span className={`badge ${tx.transaction_type === 'collection' ? 'badge-success badge-outline' : 'badge-warning badge-outline'} font-bold`}>
                                        {tx.transaction_type === 'collection' ? <ArrowDownLeft size={12} className="mr-1"/> : <ArrowUpRight size={12} className="mr-1"/>}
                                        {tx.transaction_type}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={16} className="text-base-content/40"/>
                                        <span className="font-medium text-base-content">{tx.operator}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="font-bold text-base-content">{parseInt(tx.amount as any).toLocaleString()} F</div>
                                    <div className="text-xs text-base-content/40">{tx.phone_number}</div>
                                </td>
                                <td className="max-w-xs truncate text-base-content/60" title={tx.external_reference}>{tx.external_reference}</td>
                                <td>
                                    <span className={`badge ${tx.status === 'success' ? 'bg-green-100 text-green-700 border-none' : tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-none' : 'bg-red-100 text-red-700 border-none'} font-bold`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="text-right pr-6 text-base-content/60 font-mono text-sm">{new Date(tx.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </motion.div>
      )}

      {activeTab === 'configurations' && (
        <motion.div
             key="config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
            {configurations.map(config => (
                <Card key={config.id} className={`border-none shadow-xl bg-base-100 hover:-translate-y-1 transition-transform group ${config.statut === 'inactif' ? 'opacity-60 grayscale' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${config.operateur.includes('MOOV') ? 'bg-blue-100 text-blue-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            <Smartphone size={24} />
                        </div>
                        <div className="form-control">
                            <label className="cursor-pointer label p-0">
                                <input 
                                    type="checkbox" 
                                    className="toggle toggle-sm toggle-primary" 
                                    checked={config.statut === 'actif'} 
                                    onChange={() => handleToggleConfig(config.id)}
                                />
                            </label>
                        </div>
                    </div>
                    
                    <h3 className="font-bold text-lg text-base-content">{config.nom}</h3>
                    <p className="text-sm text-base-content/60 mb-4">{config.operateur}</p>
                    
                    <div className="space-y-3 bg-base-200/50 rounded-xl p-4 mb-4">
                         <div className="flex justify-between text-sm">
                             <span className="text-base-content/60">Numéro:</span>
                             <span className="font-mono font-medium text-base-content">{config.numero}</span>
                         </div>
                    </div>

                    <div className="flex gap-2">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:bg-red-50 w-full"
                            onClick={() => handleDeleteConfig(config.id)}
                         >
                             <Trash2 size={18} /> Supprimer
                         </Button>
                    </div>
                </Card>
            ))}
            
            {/* Add New Card Placeholder */}
            <div 
                className="border-2 border-dashed border-base-300 rounded-2xl flex flex-col items-center justify-center p-8 text-base-content/40 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer min-h-[250px]"
                onClick={() => {
                     setFormType('configuration');
                     setShowForm(true);
                }}
            >
                <div className="p-4 rounded-full bg-base-200 mb-3 group-hover:bg-base-100 transition-colors">
                    <Plus size={32} />
                </div>
                <span className="font-bold">Ajouter un compte</span>
            </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Modal for Forms */}
      {showForm && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
               <motion.div 
                    initial={{scale: 0.9, opacity: 0}}
                    animate={{scale: 1, opacity: 1}}
                    className="bg-base-100 rounded-3xl shadow-2xl max-w-lg w-full p-6"
                >
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-base-content">
                           {formType === 'transaction' ? 'Nouvelle Transaction' : 'Nouveau Compte Mobile'}
                       </h3>
                       <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-circle btn-sm">
                           <XCircle size={24} className="text-base-content/40" />
                       </button>
                   </div>
                   
                   {formType === 'transaction' ? (
                       <div className="space-y-4">
                           <Input 
                                label="Description / Référence" 
                                placeholder="Ex: Paiement Loyer..." 
                                value={txForm.remarque}
                                onChange={(e) => setTxForm({...txForm, remarque: e.target.value})}
                            />
                           <div className="grid grid-cols-2 gap-4">
                               <Input 
                                    label="Montant" 
                                    placeholder="0 F CFA" 
                                    type="number" 
                                    value={txForm.montant}
                                    onChange={(e) => setTxForm({...txForm, montant: e.target.value})}
                                />
                               <div>
                                   <label className="block text-sm font-bold text-base-content/70 mb-2">Opérateur</label>
                                   <select 
                                        className="select select-bordered w-full bg-base-200/50"
                                        value={txForm.operator}
                                        onChange={(e) => setTxForm({...txForm, operator: e.target.value})}
                                    >
                                       <option value="MTN">MTN Money</option>
                                       <option value="MOOV">Moov Money</option>
                                       <option value="CELTIPAY">Celtiis Cash</option>
                                   </select>
                               </div>
                           </div>
                           <Input 
                                label="Numéro de téléphone" 
                                placeholder="22997..." 
                                value={txForm.phone}
                                onChange={(e) => setTxForm({...txForm, phone: e.target.value})}
                            />
                       </div>
                   ) : (
                       <div className="space-y-4">
                           <Input 
                                label="Nom du Compte" 
                                placeholder="Ex: Ma Boutique MTN" 
                                value={configForm.nom}
                                onChange={(e) => setConfigForm({...configForm, nom: e.target.value})}
                            />
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-sm font-bold text-base-content/70 mb-2">Opérateur</label>
                                   <select 
                                        className="select select-bordered w-full bg-base-200/50"
                                        value={configForm.operateur}
                                        onChange={(e) => setConfigForm({...configForm, operateur: e.target.value})}
                                    >
                                       <option value="MTN">MTN Money</option>
                                       <option value="MOOV">Moov Money</option>
                                       <option value="CELTIPAY">Celtiis Cash</option>
                                   </select>
                               </div>
                               <Input 
                                    label="Numéro" 
                                    placeholder="+229..." 
                                    value={configForm.numero}
                                    onChange={(e) => setConfigForm({...configForm, numero: e.target.value})}
                                />
                           </div>
                       </div>
                   )}

                   <div className="flex justify-end gap-3 mt-8">
                       <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                       <Button 
                            variant="primary" 
                            onClick={formType === 'transaction' ? handleTransactionSubmit : handleConfigSubmit}
                            disabled={submitting}
                        >
                           {submitting ? 'Enregistrement...' : 'Enregistrer'}
                       </Button>
                   </div>
               </motion.div>
           </div>
      )}
    </motion.div>
  );
};

export default MobileMoney;