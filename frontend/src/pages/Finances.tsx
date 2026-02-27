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
  Calculator,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { financeApi } from '../api/financeApi';
import type { Payment } from '../api/financeApi';
import { getLocataires, getLocataireDetails } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';

// Sub-modules
import FinanceSchedules from './finance/FinanceSchedules';

import FinanceExpenses from './finance/FinanceExpenses';
import FinanceLoans from './finance/FinanceLoans';
import FinanceTax from './finance/FinanceTax';
import FinanceOnlinePayments from './finance/FinanceOnlinePayments';
import FinanceChart from '../components/finance/FinanceChart';

const Finances: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'paiements' | 'echeances' | 'en_ligne' | 'depenses' | 'prets' | 'fiscalite'>('echeances');
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

  // Period selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

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
        financeApi.getStats(selectedMonth, selectedYear),
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

  // Reload stats when period changes
  useEffect(() => {
    const reloadStats = async () => {
      try {
        const pStats = await financeApi.getStats(selectedMonth, selectedYear);
        // @ts-ignore
        setStats(pStats);
      } catch (error) {
        console.error('Erreur stats:', error);
      }
    };
    reloadStats();
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()) return;
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
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

  const [generating, setGenerating] = useState(false);




  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const handleGenerateSchedules = async () => {
      // Logic moved to onConfirm of Modal
      setShowGenerateModal(true);
  };

  const confirmGenerateSchedules = async () => {
      try {
          setGenerating(true);
          const result = await financeApi.generateSchedules();
          alert(`Succès ! ${result.details.generated} échéances générées.`);
          fetchData(); 
          setActiveTab('echeances');
          setShowGenerateModal(false);
      } catch (error: any) {
          console.error("Erreur génération:", error);
          alert(error.message || "Erreur lors de la génération");
      } finally {
          setGenerating(false);
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
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Finance & Trésorerie <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Pilotage financier complet (Revenus, Dépenses, Fiscalité)
          </p>
        </div>
        {(activeTab === 'paiements' || activeTab === 'echeances') && (
             <div className="flex gap-2">
                 <Button 
                    variant="ghost" 
                    className="rounded-full px-6 shadow-sm border-primary text-primary hover:bg-primary/5"
                    onClick={() => setShowGenerateModal(true)}
                    disabled={generating}
                 >
                    {generating ? 'Génération...' : '📅 Générer Loyers'}
                 </Button>
                 <Button 
                    variant="primary" 
                    className="rounded-full px-6 shadow-lg"
                    onClick={() => setShowForm(true)}
                 >
                    <Plus size={18} className="mr-2" /> Encaisser Loyer
                 </Button>
             </div>
        )}
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-center gap-3 bg-base-100 rounded-xl p-3 shadow-sm border border-base-200 w-fit mx-auto">
        <button 
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-base-300 transition-colors text-base-content/60"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-base font-bold text-base-content/90 min-w-[180px] text-center">
          {monthNames[selectedMonth - 1]} {selectedYear}
        </span>
        <button 
          onClick={handleNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()
              ? 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-base-300 text-base-content/60'
          }`}
          disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
        >
          <ChevronRight size={20} />
        </button>
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

      {/* Revenue vs Expenses Chart */}
      <FinanceChart />

      {/* Navigation Tabs */}
      <div className="bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200 overflow-x-auto">
        <div className="flex p-1 gap-2 min-w-max">
             <button
                onClick={() => setActiveTab('echeances')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'echeances' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                📅 Échéances
            </button>
             <button
                onClick={() => setActiveTab('paiements')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'paiements' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                <ArrowDownRight size={18}/> Revenus & Loyers
            </button>
            <button
                onClick={() => setActiveTab('en_ligne')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'en_ligne' ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                📱 Paiements en ligne
            </button>
            <button
                onClick={() => setActiveTab('depenses')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'depenses' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                <ArrowUpRight size={18}/> Dépenses & Factures
            </button>
             <button
                onClick={() => setActiveTab('prets')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'prets' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                <Building2 size={18}/> Prêts & Financements
            </button>
             <button
                onClick={() => setActiveTab('fiscalite')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'fiscalite' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-100' : 'text-base-content/60 hover:bg-base-200'
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
                     <Card className="border-none shadow-xl bg-base-100 max-w-2xl mx-auto mb-8 relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Encaisser un paiement</h2>
                            <Button variant="ghost" onClick={() => setShowForm(false)}>✕</Button>
                        </div>
                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-bold text-base-content/80 mb-2">Locataire</label>
                                <select className="select select-bordered w-full bg-base-200 p-2 border rounded-lg" value={paiementForm.locataireId} onChange={(e) => setPaiementForm({...paiementForm, locataireId: e.target.value})}>
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

                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full text-left">
                            <thead className="bg-base-200/50">
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
                                    <tr key={item.id} className="hover:bg-base-200/50">
                                        <td className="pl-6 py-3 font-medium text-base-content/90">P-00{item.id}</td>
                                        <td className="py-3 font-bold text-base-content/80">{item.locataire_prenoms} {item.locataire_nom}</td>
                                        <td className="py-3 text-base-content/60">{new Date(item.payment_date).toLocaleDateString()}</td>
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

            {activeTab === 'echeances' && <FinanceSchedules month={selectedMonth} year={selectedYear} />}
            {activeTab === 'en_ligne' && <FinanceOnlinePayments month={selectedMonth} year={selectedYear} />}
            {activeTab === 'depenses' && <FinanceExpenses />}
            {activeTab === 'prets' && <FinanceLoans />}
            {activeTab === 'fiscalite' && <FinanceTax />}
        </motion.div>
      </AnimatePresence>

      {/* MODAL DE GENERATION */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Générer les appels de loyer"
        size="md"
        footer={
            <>
                <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>Annuler</Button>
                <Button 
                    variant="primary" 
                    onClick={confirmGenerateSchedules}
                    disabled={generating}
                >
                    {generating ? 'Génération en cours...' : 'Confirmer la génération'}
                </Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-base-content/70">
                  Cette action va générer automatiquement les quittances de loyer pour tous les baux actifs du mois courant.
              </p>
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm">
                  ℹ️ Les quittances déjà existantes pour ce mois ne seront pas dupliquées.
              </div>
          </div>
      </Modal>

    </motion.div>
  );
};

export default Finances;