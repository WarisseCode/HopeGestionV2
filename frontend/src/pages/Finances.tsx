// frontend/src/pages/Finances.tsx
import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calculator
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { financeApi, Payment } from '../api/financeApi'; // Updated import
import { getLocataires, getLocataireDetails } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';

// Sub-modules
import FinanceExpenses from './finance/FinanceExpenses';
import FinanceLoans from './finance/FinanceLoans';
import FinanceTax from './finance/FinanceTax';

const Finances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'paiements' | 'depenses' | 'prets' | 'fiscalite'>('paiements');
  const [showForm, setShowForm] = useState(false);
  const [activeSubModule, setActiveSubModule] = useState<string>('paiements');

  const [paiements, setPaiements] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ 
      encashed_month: 0, 
      expenses_month: 0, 
      net_balance: 0, 
      pending_total: 0 
  });
  const [loading, setLoading] = useState(true);

  // Selectors Data for Payment Form
  const [locataires, setLocataires] = useState<Locataire[]>([]);
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
      const [pData, pStats, locs] = await Promise.all([
        financeApi.getPayments(),
        financeApi.getStats(),
        getLocataires('Locataire')
      ]);
      
      setPaiements(pData);
      setLocataires(locs);
      
      // @ts-ignore - stats updated in backend
      setStats(pStats);

    } catch (error) {
      console.error("Erreur chargement finances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
      try {
          if (!paiementForm.locataireId) {
              alert("Veuillez sélectionner un locataire");
              return;
          }
          const details = await getLocataireDetails(parseInt(paiementForm.locataireId));
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
          setShowForm(false);
          fetchData(); 
      } catch (error: any) {
          console.error("Erreur:", error);
          alert(error.message || "Erreur lors de l'enregistrement");
      }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Finance & Trésorerie <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Pilotage financier complet (Revenus, Dépenses, Fiscalité)
          </p>
        </div>
        {activeTab === 'paiements' && (
             <Button 
                variant="primary" 
                className="rounded-full px-6 shadow-lg"
                onClick={() => setShowForm(true)}
             >
                <Plus size={18} className="mr-2" /> Encaisser Loyer
             </Button>
        )}
      </div>

      {/* Global KPIs (Dynamic Treasury) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KPICard 
            icon={Wallet} 
            label="Revenus (Mois)" 
            value={formatCurrency(stats.encashed_month)} 
            color="green" 
        />
         <KPICard 
            icon={TrendingDown} 
            label="Dépenses (Mois)" 
            value={formatCurrency(stats.expenses_month)} 
            color="orange" 
        />
        <KPICard 
            icon={TrendingUp} 
            label="Trésorerie Nette" 
            value={formatCurrency(stats.net_balance)} 
            color="blue" 
        />
         <KPICard 
            icon={Building2} 
            label="Loyer en Attente" 
            value={formatCurrency(stats.pending_total)} 
            color="purple" 
        />
    </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 overflow-x-auto">
        <div className="flex p-1 gap-2 min-w-max">
             <button
                onClick={() => setActiveTab('paiements')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'paiements' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <ArrowDownRight size={18}/> Revenus & Loyers
            </button>
            <button
                onClick={() => setActiveTab('depenses')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'depenses' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <ArrowUpRight size={18}/> Dépenses & Factures
            </button>
             <button
                onClick={() => setActiveTab('prets')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'prets' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Building2 size={18}/> Prêts & Financements
            </button>
             <button
                onClick={() => setActiveTab('fiscalite')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'fiscalite' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Calculator size={18}/> Fiscalité
            </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {activeTab === 'paiements' && (
                <>
                {showForm ? (
                     <Card className="border-none shadow-xl bg-white max-w-2xl mx-auto mb-8 relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Encaisser un paiement</h2>
                            <Button variant="ghost" onClick={() => setShowForm(false)}>✕</Button>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Locataire</label>
                                <select className="select select-bordered w-full bg-gray-50 p-2 border rounded-lg" value={paiementForm.locataireId} onChange={(e) => setPaiementForm({...paiementForm, locataireId: e.target.value})}>
                                    <option value="">Choisir...</option>
                                    {locataires.map(l => <option key={l.id} value={l.id}>{l.prenoms} {l.nom}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Montant" type="number" value={paiementForm.montant} onChange={(e) => setPaiementForm({...paiementForm, montant: parseFloat(e.target.value)})} />
                                <Input label="Date" type="date" value={paiementForm.date} onChange={(e) => setPaiementForm({...paiementForm, date: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select className="select select-bordered w-full p-2 border rounded-lg" value={paiementForm.type} onChange={(e) => setPaiementForm({...paiementForm, type: e.target.value})}>
                                    <option value="loyer">Loyer</option>
                                    <option value="charges">Charges</option>
                                </select>
                                <select className="select select-bordered w-full p-2 border rounded-lg" value={paiementForm.modePaiement} onChange={(e) => setPaiementForm({...paiementForm, modePaiement: e.target.value})}>
                                    <option value="especes">Espèces</option>
                                    <option value="mobile_money">Mobile Money</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="primary" onClick={handlePaymentSubmit}>Valider Paiement</Button>
                            </div>
                        </div>
                    </Card>
                ) : null}

                <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 pl-6 font-semibold">Référence</th>
                                    <th className="py-4 font-semibold">Locataire</th>
                                    <th className="py-4 font-semibold">Date</th>
                                    <th className="py-4 font-semibold">Montant</th>
                                    <th className="py-4 font-semibold">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {paiements.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50">
                                        <td className="pl-6 py-3 font-medium text-gray-800">P-00{item.id}</td>
                                        <td className="py-3 font-bold text-gray-700">{item.locataire_prenoms} {item.locataire_nom}</td>
                                        <td className="py-3 text-gray-500">{new Date(item.payment_date).toLocaleDateString()}</td>
                                        <td className="py-3 font-mono font-bold text-green-600">{formatCurrency(Number(item.amount))}</td>
                                        <td className="py-3"><span className="badge bg-green-100 text-green-600 px-2 py-1 rounded text-xs">{item.statut}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                </>
            )}

            {activeTab === 'depenses' && <FinanceExpenses />}
            {activeTab === 'prets' && <FinanceLoans />}
            {activeTab === 'fiscalite' && <FinanceTax />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default Finances;