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
  ChevronRight,
  Lock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { financeApi } from '../api/financeApi';
import type { Payment } from '../api/financeApi';
import { getLocataires, getLocataireDetails } from '../api/locataireApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { Locataire } from '../api/locataireApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import toast from 'react-hot-toast';

// Sub-modules
import FinanceSchedules from './finance/FinanceSchedules';

import FinanceExpenses from './finance/FinanceExpenses';
import FinanceLoans from './finance/FinanceLoans';
import FinanceTax from './finance/FinanceTax';
import FinanceOnlinePayments from './finance/FinanceOnlinePayments';
import FinanceChart from '../components/finance/FinanceChart';
import { generateQuittancePDF } from '../utils/pdfGenerator';

const Finances: React.FC = () => {
  const { user } = useUser();
  const { t } = useTranslation();
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab, setActiveTab] = useState<'paiements' | 'echeances' | 'en_ligne' | 'depenses' | 'prets' | 'fiscalite'>('echeances');
  const [showForm, setShowForm] = useState(false);

  const [paiements, setPaiements] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ 
      encashed_month: 0, 
      expenses_month: 0, 
      net_balance: 0, 
      pending_total: 0 
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Period selector state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const monthNames = t('months', { returnObjects: true }) as string[];

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
  }, [selectedMonth, selectedYear]);

  // Bornes du mois sélectionné (1er → dernier jour) pour filtrer les paiements affichés.
  const periodRange = (month: number, year: number) => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0]; // jour 0 du mois suivant = dernier jour
    return { start, end };
  };

  const fetchData = async () => {
    try {
      const { start, end } = periodRange(selectedMonth, selectedYear);
      const [pData, pStats, locs, subStatus] = await Promise.all([
        financeApi.getPayments({ start_date: start, end_date: end }),
        financeApi.getStats(selectedMonth, selectedYear),
        getLocataires('Locataire'),
        getSubscriptionStatus().catch(err => {
            console.error("Erreur chargement abonnement", err);
            return null;
        })
      ]);

      setPaiements(pData);
      setLocataires(locs);
      if (subStatus) setSubscriptionStatus(subStatus);
      setStats(pStats);

    } catch (error) {
      console.error("Erreur chargement finances:", error);
    }
  };

  // Reload stats when period changes
  useEffect(() => {
    const reloadStats = async () => {
      try {
        const pStats = await financeApi.getStats(selectedMonth, selectedYear);
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
              toast.error(t('finance.selectTenant'));
              return;
          }
          const details = await getLocataireDetails(parseInt(paiementForm.locataireId));
          const activeLease = details.baux.find((b: any) => b.statut === 'actif') || details.baux[0];
          const leaseId = activeLease?.id ?? null;

          if (!leaseId) {
              toast.error(t('finance.noActiveLease'));
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

          // Génération automatique de la quittance PDF
          const loc = locataires.find(l => l.id.toString() === paiementForm.locataireId);
          const locataireName = `${loc?.prenoms || ''} ${loc?.nom || ''}`.trim() || 'Locataire';
          const leaseRef = activeLease?.reference_bail || activeLease?.ref_bail || `BAIL-${leaseId}`;
          const dateObj = new Date(paiementForm.date || new Date());
          const periode = dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          const annee = dateObj.getFullYear();
          const mois = String(dateObj.getMonth() + 1).padStart(2, '0');

          await generateQuittancePDF({
              id: `PAY-${Date.now()}`,
              numero: `QUI-${annee}-${mois}-${loc?.id || '000'}`,
              locataire: locataireName,
              bien: leaseRef,
              periode,
              montant: paiementForm.montant,
              datePaiement: paiementForm.date || new Date().toISOString()
          }, 'download');

          toast.success(t('finance.paymentSavedReceipt', { name: locataireName }));
          setShowForm(false);
          fetchData();
          setChartKey(k => k + 1);
      } catch (error: any) {
          console.error("Erreur:", error);
          toast.error(error.message || t('finance.saveError'));
      }
  };

  const [generating, setGenerating] = useState(false);
  const [schedulesKey, setSchedulesKey] = useState(0);
  // Incrémenté après un encaissement ou une génération pour forcer FinanceChart à recharger.
  const [chartKey, setChartKey] = useState(0);

  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const confirmGenerateSchedules = async () => {
      try {
          setGenerating(true);
          // Génère pour le mois actuellement affiché (pas forcément le mois courant).
          const result = await financeApi.generateSchedules(selectedMonth, selectedYear);
          toast.success(t('finance.schedulesGenerated', { count: result.details.generated }));
          fetchData();
          setSchedulesKey(k => k + 1); // Force FinanceSchedules à recharger ses données
          setChartKey(k => k + 1);
          setActiveTab('echeances');
          setShowGenerateModal(false);
      } catch (error: any) {
          console.error("Erreur génération:", error);
          toast.error(error.message || t('finance.generateError'));
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

  // Référence lisible à largeur fixe (P-0005, P-0042…) — évite le padding incohérent.
  const formatPaymentRef = (id: number) => `P-${String(id).padStart(4, '0')}`;

  // Couleur du badge selon le statut réel du paiement (et non vert systématique).
  const statutBadgeClass = (statut?: string) => {
      switch (statut) {
          case 'valide':
          case 'paye':
          case 'paid':
              return 'bg-green-100 text-green-600';
          case 'en_attente':
          case 'partiel':
              return 'bg-amber-100 text-amber-700';
          case 'annule':
              return 'bg-red-100 text-red-600';
          default:
              return 'bg-base-200 text-base-content/60';
      }
  };

  return (
    <motion.div 
      className="space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            {t('finance.title')} <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            {t('finance.subtitle')}
          </p>
        </div>
        {canWrite && (activeTab === 'paiements' || activeTab === 'echeances') && (
             <div className="flex gap-2">
                 <Button
                    variant="ghost"
                    className="rounded-full px-6 shadow-sm border-primary text-primary hover:bg-primary/5"
                    onClick={() => setShowGenerateModal(true)}
                    disabled={generating}
                 >
                    {generating ? t('finance.generating') : t('finance.generateRents')}
                 </Button>
                 <Button
                    variant="primary"
                    className="rounded-full px-6 shadow-lg"
                    onClick={() => setShowForm(true)}
                 >
                    <Plus size={18} className="mr-2" /> {t('finance.collectRent')}
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
              ? 'text-base-content/40 cursor-not-allowed'
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
            label={t('finance.kpiRevenue')}
            value={formatCurrency(stats.encashed_month)}
            color="green"
        />
         <KPICard
            icon={TrendingDown}
            label={t('finance.kpiExpenses')}
            value={formatCurrency(stats.expenses_month)}
            color="orange"
        />
        <KPICard
            icon={TrendingUp}
            label={t('finance.kpiNet')}
            value={formatCurrency(stats.net_balance)}
            color="teal"
        />
         <KPICard
            icon={Building2}
            label={t('finance.kpiPending')}
            value={formatCurrency(stats.pending_total)}
            color="teal"
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <FinanceChart key={chartKey} />

      {/* Navigation Tabs */}
      <div className="bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200 overflow-x-auto">
        <div className="flex p-1 gap-2 min-w-max">
             <button
                onClick={() => setActiveTab('echeances')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'echeances' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                {t('finance.tabSchedules')}
            </button>
             <button
                onClick={() => setActiveTab('paiements')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'paiements' ? 'bg-green-50 text-green-700 shadow-sm border border-green-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                <ArrowDownRight size={18}/> {t('finance.tabPayments')}
            </button>
            <button
                onClick={() => {
                    if (subscriptionStatus && !subscriptionStatus.is_premium) {
                        toast(t('finance.premiumToast'), { icon: '👑' });
                        return;
                    }
                    setActiveTab('en_ligne')
                }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'en_ligne' ? 'bg-cyan-50 text-cyan-700 shadow-sm border border-cyan-100' : 'text-base-content/60 hover:bg-base-200'
                } ${subscriptionStatus && !subscriptionStatus.is_premium ? 'opacity-50 grayscale' : ''}`}
                title={subscriptionStatus && !subscriptionStatus.is_premium ? t('finance.premiumFeature') : ""}
            >
                {t('finance.tabOnline')}
                {subscriptionStatus && !subscriptionStatus.is_premium && (
                    <span className="ml-1 flex items-center gap-0.5 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-bold">
                        <Lock size={10} /> PRO
                    </span>
                )}
            </button>
            <button
                onClick={() => setActiveTab('depenses')}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'depenses' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-base-content/60 hover:bg-base-200'
                }`}
            >
                <ArrowUpRight size={18}/> {t('finance.tabExpenses')}
            </button>
             <button
                onClick={() => {
                    if (subscriptionStatus && !subscriptionStatus.is_premium) {
                        toast(t('finance.premiumToast'), { icon: '👑' });
                        return;
                    }
                    setActiveTab('prets')
                }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'prets' ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' : 'text-base-content/60 hover:bg-base-200'
                } ${subscriptionStatus && !subscriptionStatus.is_premium ? 'opacity-50 grayscale' : ''}`}
                title={subscriptionStatus && !subscriptionStatus.is_premium ? t('finance.premiumFeature') : ""}
            >
                <Building2 size={18}/> {t('finance.tabLoans')}
                {subscriptionStatus && !subscriptionStatus.is_premium && (
                    <span className="ml-1 flex items-center gap-0.5 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-bold">
                        <Lock size={10} /> PRO
                    </span>
                )}
            </button>
             <button
                onClick={() => {
                    if (subscriptionStatus && !subscriptionStatus.is_premium) {
                        toast(t('finance.premiumToast'), { icon: '👑' });
                        return;
                    }
                    setActiveTab('fiscalite')
                }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'fiscalite' ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' : 'text-base-content/60 hover:bg-base-200'
                } ${subscriptionStatus && !subscriptionStatus.is_premium ? 'opacity-50 grayscale' : ''}`}
                title={subscriptionStatus && !subscriptionStatus.is_premium ? t('finance.premiumFeature') : ""}
            >
                <Calculator size={18}/> {t('finance.tabTax')}
                {subscriptionStatus && !subscriptionStatus.is_premium && (
                    <span className="ml-1 flex items-center gap-0.5 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200 font-bold">
                        <Lock size={10} /> PRO
                    </span>
                )}
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
                            <h2 className="text-xl font-bold">{t('finance.collectPaymentTitle')}</h2>
                            <Button variant="ghost" onClick={() => setShowForm(false)}>✕</Button>
                        </div>
                        <div className="space-y-4">
                            <Select
                                label={t('finance.tenant')}
                                value={paiementForm.locataireId}
                                onChange={(e) => setPaiementForm({...paiementForm, locataireId: e.target.value})}
                                options={[
                                    { value: '', label: t('common.choose') },
                                    ...locataires.map(l => ({ value: l.id, label: `${l.prenoms} ${l.nom}` }))
                                ]}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label={t('finance.amount')} type="number" value={paiementForm.montant} onChange={(e) => setPaiementForm({...paiementForm, montant: parseFloat(e.target.value)})} />
                                <Input label={t('finance.date')} type="date" value={paiementForm.date} onChange={(e) => setPaiementForm({...paiementForm, date: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label={t('finance.type')}
                                    value={paiementForm.type}
                                    onChange={(e) => setPaiementForm({...paiementForm, type: e.target.value})}
                                    options={[
                                        { value: 'loyer', label: t('finance.typeRent') },
                                        { value: 'charges', label: t('finance.typeCharges') },
                                    ]}
                                />
                                <Select
                                    label={t('finance.paymentMethod')}
                                    value={paiementForm.modePaiement}
                                    onChange={(e) => setPaiementForm({...paiementForm, modePaiement: e.target.value})}
                                    options={[
                                        { value: 'especes', label: t('finance.cash') },
                                        { value: 'mobile_money', label: 'Mobile Money' },
                                    ]}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="primary" onClick={handlePaymentSubmit}>{t('finance.validatePayment')}</Button>
                            </div>
                        </div>
                    </Card>
                ) : null}

                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full text-left">
                            <thead className="bg-base-200/50">
                                <tr>
                                    <th className="py-4 pl-6 font-semibold">{t('finance.colReference')}</th>
                                    <th className="py-4 font-semibold">{t('finance.tenant')}</th>
                                    <th className="py-4 font-semibold">{t('finance.date')}</th>
                                    <th className="py-4 font-semibold">{t('finance.amount')}</th>
                                    <th className="py-4 font-semibold">{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base-200">
                                {paiements.map((item) => (
                                    <tr key={item.id} className="hover:bg-base-200/50">
                                        <td className="pl-6 py-3 font-medium text-base-content/90">{formatPaymentRef(item.id)}</td>
                                        <td className="py-3 font-bold text-base-content/80">{item.locataire_prenoms} {item.locataire_nom}</td>
                                        <td className="py-3 text-base-content/60">{new Date(item.payment_date).toLocaleDateString()}</td>
                                        <td className="py-3 font-mono font-bold text-green-600">{formatCurrency(Number(item.amount))}</td>
                                        <td className="py-3"><span className={`badge ${statutBadgeClass(item.statut)} px-2 py-1 rounded text-xs`}>{item.statut}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                </>
            )}

            {activeTab === 'echeances' && <FinanceSchedules key={schedulesKey} month={selectedMonth} year={selectedYear} />}
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
        title={t('finance.generateModalTitle')}
        size="md"
        footer={
            <>
                <Button variant="ghost" onClick={() => setShowGenerateModal(false)}>{t('common.cancel')}</Button>
                <Button
                    variant="primary"
                    onClick={confirmGenerateSchedules}
                    disabled={generating}
                >
                    {generating ? t('finance.generatingInProgress') : t('finance.confirmGeneration')}
                </Button>
            </>
        }
      >
          <div className="space-y-4">
              <p className="text-base-content/70">
                  {t('finance.generateModalBody', { period: `${monthNames[selectedMonth - 1]} ${selectedYear}` })}
              </p>
              <div className="bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 p-4 rounded-lg text-sm border border-teal-200 dark:border-teal-700">
                  {t('finance.generateModalNote')}
              </div>
          </div>
      </Modal>

    </motion.div>
  );
};

export default Finances;