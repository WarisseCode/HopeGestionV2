// frontend/src/pages/MobileMoney.tsx
import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';

const MobileMoney: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'configurations'>('transactions');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'transaction' | 'configuration'>('transaction');

  // Données de démonstration
  const [transactions] = useState([
    {
      id: 1,
      reference: 'MM-2025-001',
      type: 'Réception',
      expediteur: '+229 97 00 00 00',
      destinataire: 'Hope Gestion',
      montant: 150000,
      frais: 1500,
      statut: 'Validé',
      date: '2025-01-15',
      description: 'Paiement loyer - KOFFI Jean - Lot A01',
      operateur: 'Moov Money'
    },
    {
      id: 2,
      reference: 'MM-2025-002',
      type: 'Réception',
      expediteur: '+229 96 00 00 00',
      destinataire: 'Hope Gestion',
      montant: 80000,
      frais: 800,
      statut: 'Validé',
      date: '2025-01-16',
      description: 'Paiement loyer - DOSSOU Marie - Lot A02',
      operateur: 'MTN Money'
    },
    {
      id: 3,
      reference: 'MM-2025-003',
      type: 'Envoi',
      expediteur: 'Hope Gestion',
      destinataire: '+229 97 12 34 56',
      montant: 50000,
      frais: 500,
      statut: 'En attente',
      date: '2025-01-17',
      description: 'Paiement fournisseur - SARL Plomberie Expert',
      operateur: 'Moov Money'
    }
  ]);

  const [configurations] = useState([
    {
      id: 1,
      nom: 'Compte Moov Money',
      operateur: 'Moov Money',
      numero: '+229 97 00 00 00',
      statut: 'Actif',
      seuil: 500000,
      frais: 1
    },
    {
      id: 2,
      nom: 'Compte MTN Money',
      operateur: 'MTN Money',
      numero: '+229 96 00 00 00',
      statut: 'Actif',
      seuil: 500000,
      frais: 1
    },
    {
      id: 3,
      nom: 'Compte MTN ONATEL',
      operateur: 'MTN ONATEL',
      numero: '+229 95 00 00 00',
      statut: 'Inactif',
      seuil: 500000,
      frais: 1
    }
  ]);

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
             <Button variant="ghost" className="bg-base-100 border border-base-200 text-base-content shadow-sm rounded-full h-10">
                <RefreshCw size={16} className="mr-2" /> Actualiser
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
                      <p className="text-blue-100 font-medium mb-1">Solde Total Mobile Money</p>
                      <h3 className="text-3xl font-bold">2,540,000 F</h3>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Wallet size={24} className="text-white"/>
                  </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-100 bg-blue-600/30 w-fit px-2 py-1 rounded-lg">
                  <TrendingUp size={14} /> +15% ce mois
              </div>
          </Card>
           <Card className="border-none shadow-lg bg-base-100">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-base-content/60 font-medium mb-1">Entrées (Mois)</p>
                      <h3 className="text-3xl font-bold text-base-content">1,850,000 F</h3>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <ArrowDownLeft size={24}/>
                  </div>
              </div>
              <div className="mt-4 text-sm text-base-content/40">
                  12 transactions reçues
              </div>
          </Card>
           <Card className="border-none shadow-lg bg-base-100">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-base-content/60 font-medium mb-1">Sorties (Mois)</p>
                      <h3 className="text-3xl font-bold text-base-content">450,000 F</h3>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <ArrowUpRight size={24}/>
                  </div>
              </div>
              <div className="mt-4 text-sm text-base-content/40">
                  5 transactions envoyées
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
                    <div className="flex gap-2 w-full md:w-auto">
                        <select className="select select-sm h-10 bg-base-200/50 border-transparent rounded-xl">
                            <option>Tous les statuts</option>
                            <option>Validé</option>
                            <option>En attente</option>
                            <option>Échoué</option>
                        </select>
                         <select className="select select-sm h-10 bg-base-200/50 border-transparent rounded-xl">
                            <option>Tous les opérateurs</option>
                            <option>Moov Money</option>
                            <option>MTN Money</option>
                        </select>
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
                        {transactions.map(tx => (
                            <tr key={tx.id} className="hover:bg-base-200/50 transition-colors">
                                <td className="pl-6 font-medium text-base-content">{tx.reference}</td>
                                <td>
                                    <span className={`badge ${tx.type === 'Réception' ? 'badge-success badge-outline' : 'badge-warning badge-outline'} font-bold`}>
                                        {tx.type === 'Réception' ? <ArrowDownLeft size={12} className="mr-1"/> : <ArrowUpRight size={12} className="mr-1"/>}
                                        {tx.type}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={16} className="text-base-content/40"/>
                                        <span className="font-medium text-base-content">{tx.operateur}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="font-bold text-base-content">{tx.montant.toLocaleString()} F</div>
                                    <div className="text-xs text-base-content/40">Frais: {tx.frais} F</div>
                                </td>
                                <td className="max-w-xs truncate text-base-content/60" title={tx.description}>{tx.description}</td>
                                <td>
                                    <span className={`badge ${tx.statut === 'Validé' ? 'bg-green-100 text-green-700 border-none dark:bg-green-900/30 dark:text-green-400' : tx.statut === 'En attente' ? 'bg-yellow-100 text-yellow-700 border-none dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 border-none dark:bg-red-900/30 dark:text-red-400'} font-bold`}>
                                        {tx.statut}
                                    </span>
                                </td>
                                <td className="text-right pr-6 text-base-content/60 font-mono text-sm">{tx.date}</td>
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
                <Card key={config.id} className="border-none shadow-xl bg-base-100 hover:-translate-y-1 transition-transform group">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${config.operateur.includes('Moov') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            <Smartphone size={24} />
                        </div>
                        <div className="form-control">
                            <label className="cursor-pointer label p-0">
                                <input type="checkbox" className="toggle toggle-sm toggle-primary" checked={config.statut === 'Actif'} readOnly />
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
                         <div className="flex justify-between text-sm">
                             <span className="text-base-content/60">Seuil Max:</span>
                             <span className="font-medium text-base-content">{config.seuil.toLocaleString()} F</span>
                         </div>
                    </div>

                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="outline" size="sm" className="flex-1 border-base-200">
                             Modifier
                         </Button>
                         <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                             <Trash2 size={18} />
                         </Button>
                    </div>
                </Card>
            ))}
            
            {/* Add New Card Placeholder */}
            <div 
                className="border-2 border-dashed border-base-300 rounded-2xl flex flex-col items-center justify-center p-8 text-base-content/40 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer min-h-[300px]"
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

      {/* Simplified Modal for Forms */}
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
                   
                   <div className="space-y-4">
                       <Input label="Nom / Référence" placeholder="Ex: Paiement Loyer..." />
                       <div className="grid grid-cols-2 gap-4">
                           <Input label="Montant" placeholder="0 F CFA" type="number" />
                           <div>
                               <label className="block text-sm font-bold text-base-content/70 mb-2">Opérateur</label>
                               <select className="select select-bordered w-full bg-base-200/50">
                                   <option>Moov Money</option>
                                   <option>MTN Money</option>
                               </select>
                           </div>
                       </div>
                   </div>

                   <div className="flex justify-end gap-3 mt-8">
                       <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                       <Button variant="primary" onClick={() => setShowForm(false)}>Enregistrer</Button>
                   </div>
               </motion.div>
           </div>
      )}
    </motion.div>
  );
};

export default MobileMoney;