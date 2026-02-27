import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, CreditCard, Phone, User, FileText, Wifi } from 'lucide-react';
import { financeApi } from '../../api/financeApi';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Schedule {
    id: number;
    lease_id: number;
    total_amount: string;
    due_date: string;
    status: string;
    amount_paid: string | null;
    description: string;
    tenant_nom: string;
    tenant_prenoms: string;
    tenant_telephone: string;
    reference_bail: string;
    loyer_actuel: string;
    charges_mensuelles: string;
    lot_reference: string | null;
    quittance_url: string | null;
    online_payment_status: string | null;
    online_paid_at: string | null;
}

interface FinanceSchedulesProps {
    month: number;
    year: number;
}

const FinanceSchedules: React.FC<FinanceSchedulesProps> = ({ month, year }) => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingId, setPayingId] = useState<number | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('especes');
    const [paymentRef, setPaymentRef] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

    useEffect(() => {
        loadSchedules();
    }, [month, year]);

    const loadSchedules = async () => {
        setLoading(true);
        try {
            const data = await financeApi.getSchedules(month, year);
            setSchedules(data);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erreur chargement échéances');
        } finally {
            setLoading(false);
        }
    };

    const openPayModal = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setPaymentMethod('especes');
        setPaymentRef('');
        setShowPayModal(true);
    };

    const handlePay = async () => {
        if (!selectedSchedule) return;
        try {
            setPayingId(selectedSchedule.id);
            await financeApi.paySchedule(selectedSchedule.id, paymentMethod, paymentRef);
            toast.success('Échéance marquée comme payée !');
            setShowPayModal(false);
            loadSchedules();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Erreur paiement');
        } finally {
            setPayingId(null);
        }
    };

    const formatCurrency = (amount: string | number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(Number(amount));
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const filteredSchedules = schedules.filter(s => {
        if (filter === 'pending') return s.status === 'pending';
        if (filter === 'paid') return s.status === 'paid';
        return true;
    });

    const totalExpected = schedules.reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalPaid = schedules.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalPending = totalExpected - totalPaid;
    const paidCount = schedules.filter(s => s.status === 'paid').length;
    const pendingCount = schedules.filter(s => s.status === 'pending').length;

    const isOverdue = (dateStr: string) => {
        return new Date(dateStr) < new Date() && true;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (schedules.length === 0) {
        return (
            <Card className="border-none shadow-lg bg-white text-center py-16">
                <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-700">Aucune échéance pour cette période</h3>
                <p className="text-gray-500 mt-2">
                    Cliquez sur <strong>"📅 Générer Loyers"</strong> pour créer les échéances du mois.
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-500 rounded-xl p-2"><CreditCard size={18} className="text-white" /></div>
                        <span className="text-sm font-semibold text-blue-700">Total Attendu</span>
                    </div>
                    <p className="text-2xl font-extrabold text-blue-900">{formatCurrency(totalExpected)}</p>
                    <p className="text-xs text-blue-600 mt-1">{schedules.length} échéance(s)</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-500 rounded-xl p-2"><CheckCircle size={18} className="text-white" /></div>
                        <span className="text-sm font-semibold text-green-700">Payé</span>
                    </div>
                    <p className="text-2xl font-extrabold text-green-900">{formatCurrency(totalPaid)}</p>
                    <p className="text-xs text-green-600 mt-1">{paidCount} payé(es)</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-orange-500 rounded-xl p-2"><AlertTriangle size={18} className="text-white" /></div>
                        <span className="text-sm font-semibold text-orange-700">En Attente</span>
                    </div>
                    <p className="text-2xl font-extrabold text-orange-900">{formatCurrency(totalPending)}</p>
                    <p className="text-xs text-orange-600 mt-1">{pendingCount} en attente</p>
                </motion.div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-700">Taux de recouvrement</span>
                    <span className="text-sm font-bold text-primary">
                        {totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(['all', 'pending', 'paid'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            filter === f
                                ? f === 'pending' ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                : f === 'paid' ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'
                        }`}
                    >
                        {f === 'all' ? `Tout (${schedules.length})` : f === 'pending' ? `En attente (${pendingCount})` : `Payé (${paidCount})`}
                    </button>
                ))}
            </div>

            {/* Schedules List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredSchedules.map((schedule, i) => (
                        <motion.div
                            key={schedule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: i * 0.03 }}
                        >
                            <Card className={`border-none shadow-sm hover:shadow-md transition-all ${
                                schedule.status === 'paid' ? 'bg-green-50/50 border-l-4 border-l-green-400' : 
                                isOverdue(schedule.due_date) ? 'bg-red-50/30 border-l-4 border-l-red-400' :
                                'bg-white border-l-4 border-l-orange-400'
                            }`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                                    {/* Tenant Info */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            schedule.status === 'paid' ? 'bg-green-100' : 'bg-orange-100'
                                        }`}>
                                            <User size={20} className={schedule.status === 'paid' ? 'text-green-600' : 'text-orange-600'} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">
                                                {schedule.tenant_prenoms} {schedule.tenant_nom}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                {schedule.lot_reference && (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">🏠 {schedule.lot_reference}</span>
                                                )}
                                                {schedule.reference_bail && (
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">📋 {schedule.reference_bail}</span>
                                                )}
                                                {schedule.tenant_telephone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone size={12} /> {schedule.tenant_telephone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount & Date */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-lg font-extrabold text-gray-900">{formatCurrency(schedule.total_amount)}</p>
                                        <p className="text-xs text-gray-500">
                                            Échéance : {formatDate(schedule.due_date)}
                                        </p>
                                    </div>

                                    {/* Status & Action */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {schedule.status === 'paid' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                                                    <CheckCircle size={16} /> Payé
                                                </span>
                                                {schedule.quittance_url && (
                                                    <Button
                                                        variant="ghost"
                                                        className="rounded-xl px-3 shadow-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border-none h-10 w-10 p-0 flex items-center justify-center"
                                                        title="Télécharger la quittance"
                                                        onClick={() => window.open(`${import.meta.env.VITE_API_URL}${schedule.quittance_url}`, '_blank')}
                                                    >
                                                        <FileText size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                className="rounded-xl px-5 shadow-md"
                                                onClick={() => openPayModal(schedule)}
                                                disabled={payingId === schedule.id}
                                            >
                                                {payingId === schedule.id ? (
                                                    <span className="animate-spin mr-2">⏳</span>
                                                ) : (
                                                    <CreditCard size={16} className="mr-2" />
                                                )}
                                                Encaisser
                                            </Button>
                                        )}
                                        {/* Online payment badge */}
                                        {schedule.online_payment_status && schedule.status !== 'paid' && (
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                                                schedule.online_payment_status === 'pending'
                                                    ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                                    : schedule.online_payment_status === 'approved'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200'
                                            }`}>
                                                <Wifi size={12} />
                                                {schedule.online_payment_status === 'pending' ? 'En ligne (en cours)' :
                                                 schedule.online_payment_status === 'approved' ? 'Payé en ligne' :
                                                 'En ligne (échoué)'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Pay Modal */}
            <Modal
                isOpen={showPayModal}
                onClose={() => setShowPayModal(false)}
                title="Confirmer le paiement"
            >
                {selectedSchedule && (
                    <div className="space-y-5">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Locataire</span>
                                <span className="font-bold">{selectedSchedule.tenant_prenoms} {selectedSchedule.tenant_nom}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Montant</span>
                                <span className="font-extrabold text-primary text-lg">{formatCurrency(selectedSchedule.total_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Échéance</span>
                                <span className="font-semibold">{formatDate(selectedSchedule.due_date)}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Mode de paiement</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            >
                                <option value="especes">💵 Espèces</option>
                                <option value="virement">🏦 Virement bancaire</option>
                                <option value="mobile_money">📱 Mobile Money</option>
                                <option value="cheque">📝 Chèque</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Référence (optionnel)</label>
                            <input
                                type="text"
                                value={paymentRef}
                                onChange={(e) => setPaymentRef(e.target.value)}
                                placeholder="N° de transaction, reçu..."
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                className="flex-1 rounded-xl"
                                onClick={() => setShowPayModal(false)}
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="primary"
                                className="flex-1 rounded-xl shadow-lg"
                                onClick={handlePay}
                                disabled={payingId !== null}
                            >
                                {payingId !== null ? 'Traitement...' : '✅ Confirmer le paiement'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FinanceSchedules;
