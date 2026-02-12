// frontend/src/pages/TenantPayments.tsx
// Page for tenants to view and pay their rent online

import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, Clock, AlertCircle, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rentPaymentApi } from '../api/rentPaymentApi';
import type { PaymentSchedule, RentPaymentTransaction } from '../api/rentPaymentApi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { toast } from 'react-hot-toast';

const TenantPayments: React.FC = () => {
    const [pendingSchedules, setPendingSchedules] = useState<PaymentSchedule[]>([]);
    const [transactionHistory, setTransactionHistory] = useState<RentPaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    
    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<PaymentSchedule | null>(null);
    const [selectedOperator, setSelectedOperator] = useState<'mtn' | 'moov'>('mtn');

    // Get lease ID from user context (assuming single active lease for tenant)
    const [leaseId, setLeaseId] = useState<number | null>(null);
    // This state is no longer needed if getMyPendingSchedules handles lease context internally
    // const [leaseId, setLeaseId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // The API now provides a dedicated endpoint for the tenant's pending schedules
            const [schedules, history] = await Promise.all([
                rentPaymentApi.getMyPendingSchedules(), // Use the new specific endpoint for tenants
                rentPaymentApi.getTransactionHistory()
            ]);

            setPendingSchedules(schedules);
            setTransactionHistory(history);
        } catch (error: any) {
            console.error('Error loading data:', error);
            toast.error(error.message || 'Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handlePayClick = (schedule: PaymentSchedule) => {
        setSelectedSchedule(schedule);
        setShowPaymentModal(true);
    };

    const handleVerifyClick = async (schedule: PaymentSchedule) => {
        if (!schedule.pending_transaction_id) return;
        
        try {
            const toastId = toast.loading('Vérification du paiement...');
            const result = await rentPaymentApi.verifyPayment(schedule.pending_transaction_id);
            
            toast.dismiss(toastId);

            if (result.success && (result.status === 'approved' || result.status === 'valide')) {
                toast.success('Paiement confirmé !');
                loadData(); // Reload to update status
            } else {
                toast.info(`Statut actuel : ${result.status === 'pending' ? 'En attente' : result.status}`);
                if (result.status !== 'pending') loadData();
            }
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || 'Erreur lors de la vérification');
        }
    };

    const handleConfirmPayment = async () => {
        if (!selectedSchedule) return;

        try {
            setPaymentLoading(true);
            const result = await rentPaymentApi.initiatePayment(
                selectedSchedule.id,
                selectedOperator
            );

            if (result.success && result.paymentUrl) {
                // Redirect to FedaPay payment page
                window.location.href = result.paymentUrl;
            } else {
                toast.error(result.message || 'Erreur lors de la création du lien de paiement');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors du paiement');
        } finally {
            setPaymentLoading(false);
            setShowPaymentModal(false);
        }
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            'pending': { color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} />, label: 'En attente' },
            'overdue': { color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14} />, label: 'En retard' },
            'partial': { color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} />, label: 'Partiel' },
            'paid': { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} />, label: 'Payé' },
            'approved': { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} />, label: 'Payé' },
            'failed': { color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14} />, label: 'Échoué' },
            'cancelled': { color: 'bg-gray-100 text-gray-700', icon: <AlertCircle size={14} />, label: 'Annulé' }
        };

        const config = configs[status] || configs['pending'];

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>
                {config.icon}
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    Mes Paiements <span className="text-primary">.</span>
                </h1>
                <p className="text-gray-500 font-medium mt-1">
                    Gérez vos loyers et consultez votre historique de paiements
                </p>
            </div>

            {/* Pending Payments */}
            {pendingSchedules.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-primary" size={24} />
                        Loyers à Payer
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingSchedules.map((schedule) => {
                            const amountDue = schedule.total_amount - (schedule.amount_paid || 0);
                            const isOverdue = new Date(schedule.due_date) < new Date() && schedule.status !== 'paid';

                            return (
                                <Card
                                    key={schedule.id}
                                    className={`relative overflow-hidden ${isOverdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}
                                >
                                    {isOverdue && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                            EN RETARD
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">
                                                {schedule.description || 'Loyer'}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Échéance: {formatDate(schedule.due_date)}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600">Montant total</span>
                                                <span className="font-mono font-bold text-gray-800">
                                                    {formatMoney(schedule.total_amount)}
                                                </span>
                                            </div>

                                            {schedule.amount_paid > 0 && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">Déjà payé</span>
                                                    <span className="font-mono text-green-600">
                                                        -{formatMoney(schedule.amount_paid)}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center pt-2 border-t">
                                                <span className="font-bold text-gray-700">Reste à payer</span>
                                                <span className="font-mono font-bold text-primary text-lg">
                                                    {formatMoney(amountDue)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="primary"
                                                className="flex-1"
                                                onClick={() => handlePayClick(schedule)}
                                            >
                                                <CreditCard size={18} className="mr-2" />
                                                Payer
                                            </Button>

                                            {schedule.pending_transaction_id && (
                                                <Button
                                                    variant="outline"
                                                    className="px-3"
                                                    title="Vérifier le statut si vous avez déjà payé"
                                                    onClick={() => handleVerifyClick(schedule)}
                                                >
                                                    <RefreshCw size={18} />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            {getStatusBadge(schedule.status)}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {pendingSchedules.length === 0 && (
                <Card className="text-center py-12">
                    <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Tous vos loyers sont à jour !</h3>
                    <p className="text-gray-500">Aucun paiement en attente</p>
                </Card>
            )}

            {/* Transaction History */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Clock className="text-primary" size={24} />
                    Historique des Paiements
                </h2>

                {transactionHistory.length > 0 ? (
                    <Card className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="table w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4">Montant</th>
                                        <th className="p-4">Statut</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactionHistory.map((transaction) => (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="p-4 whitespace-nowrap">
                                                {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium">{transaction.description}</div>
                                                <div className="text-xs text-gray-500">
                                                    {transaction.payment_method && `via ${transaction.payment_method.toUpperCase()}`}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-gray-800">
                                                {formatMoney(transaction.amount)}
                                            </td>
                                            <td className="p-4">
                                                {getStatusBadge(transaction.status)}
                                            </td>
                                            <td className="p-4">
                                                {transaction.status === 'approved' && (
                                                    <Button variant="ghost" size="sm" className="text-xs">
                                                        <Download size={14} className="mr-1" />
                                                        Quittance
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <Card className="text-center py-8 text-gray-500">
                        Aucun historique de paiement
                    </Card>
                )}
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Payer votre loyer"
                size="md"
            >
                {selectedSchedule && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-bold text-gray-800 mb-2">{selectedSchedule.description}</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Montant à payer</span>
                                <span className="text-2xl font-bold text-primary">
                                    {formatMoney(selectedSchedule.total_amount - (selectedSchedule.amount_paid || 0))}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-gray-700">
                                Choisissez votre opérateur Mobile Money
                            </label>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSelectedOperator('mtn')}
                                    className={`p-4 border-2 rounded-lg transition-all ${
                                        selectedOperator === 'mtn'
                                            ? 'border-yellow-500 bg-yellow-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-yellow-600 mb-1">MTN</div>
                                        <div className="text-xs text-gray-500">Mobile Money</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setSelectedOperator('moov')}
                                    className={`p-4 border-2 rounded-lg transition-all ${
                                        selectedOperator === 'moov'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600 mb-1">MOOV</div>
                                        <div className="text-xs text-gray-500">Money</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                            <strong>ℹ️ Comment ça marche ?</strong>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                                <li>Vous serez redirigé vers la page de paiement sécurisée</li>
                                <li>Entrez votre numéro Mobile Money</li>
                                <li>Confirmez le paiement sur votre téléphone</li>
                                <li>Votre quittance sera générée automatiquement</li>
                            </ol>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1"
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmPayment}
                                disabled={paymentLoading}
                                className="flex-1"
                            >
                                {paymentLoading ? (
                                    'Redirection...'
                                ) : (
                                    <>
                                        <ExternalLink size={16} className="mr-2" />
                                        Continuer vers le paiement
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </motion.div>
    );
};

export default TenantPayments;
