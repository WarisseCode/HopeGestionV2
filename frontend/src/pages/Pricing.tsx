// frontend/src/pages/Pricing.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Crown, Check, Zap, Building2, Users, Star, 
    Smartphone, X, Loader2, AlertCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPlans, getSubscriptionStatus, subscribe, checkPaymentStatus } from '../api/subscriptionApi';
import type { Plan, SubscriptionStatus } from '../api/subscriptionApi';

const OPERATORS = [
    { id: 'mtn', name: 'MTN Mobile Money', color: 'bg-yellow-500' },
    { id: 'moov', name: 'Moov Money', color: 'bg-blue-500' }
];

const Pricing: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({ phone_number: '', operator: 'mtn' });
    const [processing, setProcessing] = useState(false);

    const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        // Check for pending transaction
        const savedTxId = localStorage.getItem('pendingFedaPayTxId');
        console.log('Mounting Pricing - Saved Transaction ID:', savedTxId);
        if (savedTxId) {
            setPendingTransactionId(savedTxId);
            toast('Paiement en attente détecté', { icon: 'ℹ️' });
        }
    }, []);

    const fetchData = async () => {
        try {
            const [plansData, statusData] = await Promise.all([
                getPlans(),
                getSubscriptionStatus()
            ]);
            setPlans(plansData);
            setCurrentStatus(statusData);
        } catch (error) {
            console.error('Error fetching plans:', error);
            toast.error('Erreur de chargement des offres');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (plan: Plan) => {
        if (currentStatus?.plan?.name === plan.name) {
            toast('Vous êtes déjà sur ce plan', { icon: 'ℹ️' });
            return;
        }
        setSelectedPlan(plan);
        if (plan.price > 0) {
            setShowPaymentModal(true);
        } else {
            // Free plan - direct activation
            handleSubscribe(plan, '', '');
        }
    };

    const verifyPayment = async () => {
        const txId = pendingTransactionId; // Capture current ID
        console.log('verifyPayment called for ID:', txId);
        
        if (!txId) {
            toast.error("Aucune transaction trouvée");
            return;
        }

        setProcessing(true);
        const toastId = toast.loading('Vérification du paiement...');
        
        try {
            console.log('Calling API checkPaymentStatus...');
            const data = await checkPaymentStatus(txId);
            console.log('API Response:', data);

            if (data.status === 'approved') {
                toast.success('Paiement validé ! Abonnement activé.', { id: toastId });
                localStorage.removeItem('pendingFedaPayTxId');
                setPendingTransactionId(null);
                // Refresh data after short delay
                setTimeout(fetchData, 1000);
            } else if (data.status === 'pending') {
                toast('Paiement en attente. Veuillez réessayer dans quelques instants.', { icon: '⏳', id: toastId });
            } else if (data.alreadyProcessed) {
                toast.success('Paiement déjà validé précédemment.', { id: toastId });
                localStorage.removeItem('pendingFedaPayTxId');
                setPendingTransactionId(null);
                fetchData();
            } else {
                toast.error(`Statut: ${data.status} - ${data.message || 'Échec'}`, { id: toastId });
                // If failed/cancelled, clear it
                if (data.status === 'declined' || data.status === 'canceled' || data.status === 'failed' || data.status === 'error') {
                    localStorage.removeItem('pendingFedaPayTxId');
                    setPendingTransactionId(null);
                }
            }
        } catch (error: any) {
            console.error('Verify Payment Error:', error);
            toast.error(error?.message || 'Erreur lors de la vérification', { id: toastId });
        } finally {
            setProcessing(false);
        }
    };

    const handleSubscribe = async (plan: Plan, phone: string, operator: string) => {
        setProcessing(true);
        try {
            console.log('Subscribing to plan:', plan.id);
            const response = await subscribe({
                plan_id: plan.id,
                phone_number: phone,
                operator: operator as any
            });
            
            console.log('Subscribe response:', response);

            if (response.success) {
                // Check if we need to redirect to FedaPay
                if ((response as any).redirect && (response as any).payment_url) {
                    // Save transaction ID for later verification
                    const txId = (response as any).transaction_id;
                    if (txId) {
                        console.log('Saving transaction ID to localStorage:', txId);
                        localStorage.setItem('pendingFedaPayTxId', String(txId));
                        setPendingTransactionId(String(txId));
                    } else {
                        console.warn('No transaction_id in response!', response);
                    }
                    
                    toast.success('Redirection vers le paiement...', { duration: 2000 });
                    // Redirect to FedaPay payment page
                    setTimeout(() => {
                        window.location.href = (response as any).payment_url;
                    }, 1000);
                } else {
                    // Direct activation (free plan)
                    toast.success(response.message || 'Abonnement activé!');
                    setShowPaymentModal(false);
                    fetchData(); // Refresh status
                }
            } else {
                toast.error(response.message || 'Échec du paiement');
            }
        } catch (error: any) {
            console.error('Subscribe Error:', error);
            toast.error(error?.message || error?.response?.data?.message || 'Erreur lors de la souscription');
        } finally {
            setProcessing(false);
        }
    };

    const getPlanIcon = (name: string) => {
        switch (name) {
            case 'free': return <Zap className="text-gray-500" size={28} />;
            case 'pro': return <Crown className="text-amber-500" size={28} />;
            case 'enterprise': return <Star className="text-purple-500" size={28} />;
            default: return <Zap size={28} />;
        }
    };

    const getPlanGradient = (name: string) => {
        switch (name) {
            case 'free': return 'from-gray-50 to-gray-100 border-gray-200';
            case 'pro': return 'from-amber-50 to-orange-50 border-amber-200 ring-2 ring-amber-300';
            case 'enterprise': return 'from-purple-50 to-indigo-50 border-purple-200';
            default: return 'from-gray-50 to-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-black text-gray-900 mb-4"
                >
                    Choisissez votre <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Abonnement</span>
                </motion.h1>
                <p className="text-gray-500 text-lg max-w-xl mx-auto">
                    Gérez vos biens immobiliers plus efficacement avec nos offres adaptées à vos besoins.
                </p>
            </div>

            {/* Current Plan Badge */}
            {currentStatus && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl text-white text-center"
                >
                    <p className="text-sm opacity-80">Votre plan actuel</p>
                    <p className="text-xl font-bold">{currentStatus.plan?.display_name || 'Gratuit'}</p>
                    {currentStatus.days_remaining && (
                        <p className="text-sm mt-1">
                            Expire dans {currentStatus.days_remaining} jours
                        </p>
                    )}
                </motion.div>
            )}

            {/* Pending Transaction Alert */}
            <AnimatePresence>
                {pendingTransactionId && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8"
                    >
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Loader2 className="animate-spin text-blue-600" size={24} />
                                
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Paiement en attente de validation</h4>
                                    <p className="text-sm text-gray-600 hidden md:block">
                                        Si vous avez finalisé le paiement, cliquez sur le bouton pour activer votre abonnement.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={verifyPayment}
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                {processing ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                <span className="hidden md:inline">J'ai payé</span>
                                <span className="md:hidden">Vérifier</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {plans.map((plan, index) => {
                    const isCurrent = currentStatus?.plan?.name === plan.name;
                    const isPopular = plan.name === 'pro';

                    return (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative p-6 rounded-3xl border-2 bg-gradient-to-br ${getPlanGradient(plan.name)} 
                                        hover:shadow-xl transition-all duration-300 ${isPopular ? 'scale-105 z-10' : ''}`}
                        >
                            {isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                                    POPULAIRE
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    {getPlanIcon(plan.name)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{plan.display_name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {plan.max_properties === -1 ? 'Illimité' : `${plan.max_properties} biens max`}
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-black text-gray-900">
                                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()}`}
                                </span>
                                {plan.price > 0 && (
                                    <span className="text-gray-500 text-lg ml-1">FCFA/mois</span>
                                )}
                            </div>

                            <ul className="space-y-3 mb-6">
                                {(plan.features as string[])?.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <Check className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                                        {feature}
                                    </li>
                                ))}
                                <li className="flex items-start gap-2 text-sm text-gray-700">
                                    <Building2 className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                                    {plan.max_properties === -1 ? 'Biens illimités' : `${plan.max_properties} biens`}
                                </li>
                                <li className="flex items-start gap-2 text-sm text-gray-700">
                                    <Users className="text-purple-500 flex-shrink-0 mt-0.5" size={16} />
                                    {plan.max_tenants === -1 ? 'Locataires illimités' : `${plan.max_tenants} locataires`}
                                </li>
                            </ul>

                            <button
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isCurrent}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${
                                    isCurrent 
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : plan.name === 'pro'
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/30'
                                            : 'bg-gray-900 text-white hover:bg-gray-800'
                                }`}
                            >
                                {isCurrent ? 'Plan Actuel' : plan.price === 0 ? 'Activer' : 'Souscrire'}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && selectedPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !processing && setShowPaymentModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Paiement Mobile Money</h2>
                                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl mb-6">
                                <p className="text-sm text-gray-500">Plan sélectionné</p>
                                <p className="text-lg font-bold text-gray-900">{selectedPlan.display_name}</p>
                                <p className="text-2xl font-black text-blue-600">{selectedPlan.price.toLocaleString()} FCFA</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-2">Opérateur</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {OPERATORS.map(op => (
                                            <button
                                                key={op.id}
                                                type="button"
                                                onClick={() => setPaymentData({ ...paymentData, operator: op.id })}
                                                className={`p-3 rounded-xl border-2 text-center text-sm font-bold transition ${
                                                    paymentData.operator === op.id
                                                        ? `${op.color} text-white border-transparent`
                                                        : 'border-gray-200 text-gray-700 hover:border-gray-400'
                                                }`}
                                            >
                                                {op.id}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-2">
                                        <Smartphone className="inline mr-1" size={16} />
                                        Numéro de Téléphone
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Ex: 97000000"
                                        value={paymentData.phone_number}
                                        onChange={e => setPaymentData({ ...paymentData, phone_number: e.target.value })}
                                        className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-start gap-2">
                                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                                <p className="text-xs text-amber-800">
                                    Vous recevrez une demande de paiement sur votre téléphone. Confirmez le paiement pour activer votre abonnement.
                                </p>
                            </div>

                            <button
                                onClick={() => handleSubscribe(selectedPlan, paymentData.phone_number, paymentData.operator)}
                                disabled={processing || !paymentData.phone_number}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold 
                                           hover:shadow-lg hover:shadow-green-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed
                                           flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Traitement en cours...
                                    </>
                                ) : (
                                    <>
                                        Payer {selectedPlan.price.toLocaleString()} FCFA
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Pricing;
