// frontend/src/pages/finance/FinanceOnlinePayments.tsx
// Displays online payment transactions for gestionnaires/propriétaires

import React, { useState, useEffect } from 'react';
import { Wifi, CheckCircle2, Clock, XCircle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { financeApi } from '../../api/financeApi';
import { motion } from 'framer-motion';

interface OnlinePaymentStats {
    total_online: number;
    pending_count: number;
    approved_count: number;
    failed_count: number;
    total_approved_amount: number;
    total_pending_amount: number;
}

interface OnlineTransaction {
    id: number;
    schedule_id: number;
    amount: string;
    status: 'pending' | 'approved' | 'failed' | 'cancelled' | 'expired';
    operator: string | null;
    fedapay_transaction_id: string;
    created_at: string;
    paid_at: string | null;
    tenant_nom: string;
    tenant_prenoms: string;
    tenant_telephone: string;
    schedule_description: string;
    due_date: string;
    lot_reference: string;
    building_name: string;
}

interface Props {
    month: number;
    year: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
    pending: { label: 'En attente', color: 'text-amber-700', icon: <Clock size={14} />, bg: 'bg-amber-50 border-amber-200' },
    approved: { label: 'Approuvé', color: 'text-green-700', icon: <CheckCircle2 size={14} />, bg: 'bg-green-50 border-green-200' },
    failed: { label: 'Échoué', color: 'text-red-700', icon: <XCircle size={14} />, bg: 'bg-red-50 border-red-200' },
    cancelled: { label: 'Annulé', color: 'text-gray-700 dark:text-gray-200', icon: <XCircle size={14} />, bg: 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700' },
    expired: { label: 'Expiré', color: 'text-gray-500 dark:text-gray-400', icon: <XCircle size={14} />, bg: 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700' }
};

const formatCurrency = (val: number | string) => new Intl.NumberFormat('fr-FR').format(Number(val)) + ' FCFA';

const FinanceOnlinePayments: React.FC<Props> = ({ month, year }) => {
    const [transactions, setTransactions] = useState<OnlineTransaction[]>([]);
    const [stats, setStats] = useState<OnlinePaymentStats | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txns, statsData] = await Promise.all([
                financeApi.getOnlineTransactions(month, year, filterStatus || undefined),
                financeApi.getOnlinePaymentStats(month, year)
            ]);
            setTransactions(txns);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading online payments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [month, year, filterStatus]);

    return (
        <div className="space-y-6">
            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700/50 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">
                            <Wifi size={14} />
                            Total Transactions
                        </div>
                        <div className="text-2xl font-black text-gray-800 dark:text-gray-100">{stats.total_online}</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-green-100 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-1">
                            <CheckCircle2 size={14} />
                            Encaissé en ligne
                        </div>
                        <div className="text-2xl font-black text-green-700">{formatCurrency(stats.total_approved_amount)}</div>
                        <div className="text-xs text-green-600 mt-1">{stats.approved_count} transaction(s)</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-100 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-medium mb-1">
                            <Clock size={14} />
                            En attente
                        </div>
                        <div className="text-2xl font-black text-amber-700">{formatCurrency(stats.total_pending_amount)}</div>
                        <div className="text-xs text-amber-600 mt-1">{stats.pending_count} transaction(s)</div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-red-100 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-red-600 text-xs font-medium mb-1">
                            <XCircle size={14} />
                            Échouées
                        </div>
                        <div className="text-2xl font-black text-red-700">{stats.failed_count}</div>
                    </motion.div>
                </div>
            )}

            {/* Filters & Actions */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {['', 'pending', 'approved', 'failed'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                                filterStatus === s
                                    ? 'bg-primary/10 text-primary border-primary/20'
                                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-900/50'
                            }`}
                        >
                            {s === '' ? 'Toutes' : statusConfig[s]?.label || s}
                        </button>
                    ))}
                </div>
                <Button variant="ghost" onClick={loadData} className="text-gray-500 dark:text-gray-400">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </Button>
            </div>

            {/* Transactions Table */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw size={24} className="animate-spin text-primary" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Wifi size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-medium">Aucune transaction en ligne</p>
                        <p className="text-sm mt-1">Les paiements en ligne des locataires apparaîtront ici</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700/50">
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Locataire</th>
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Immeuble / Lot</th>
                                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Échéance</th>
                                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Montant</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Opérateur</th>
                                    <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Statut</th>
                                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, idx) => {
                                    const sc = statusConfig[t.status] || statusConfig.pending;
                                    return (
                                        <motion.tr
                                            key={t.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="border-b border-gray-50 hover:bg-gray-50 dark:bg-slate-900/50/50 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-gray-800 dark:text-gray-100">{t.tenant_prenoms} {t.tenant_nom}</div>
                                                {t.tenant_telephone && (
                                                    <div className="text-xs text-gray-400">{t.tenant_telephone}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-gray-700 dark:text-gray-200">{t.building_name || '-'}</div>
                                                <div className="text-xs text-gray-400">{t.lot_reference || '-'}</div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300 text-xs">
                                                {t.schedule_description || '-'}
                                                {t.due_date && (
                                                    <div className="text-gray-400">Éch. {new Date(t.due_date).toLocaleDateString('fr-FR')}</div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-gray-800 dark:text-gray-100">
                                                {formatCurrency(t.amount)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                    {t.operator || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.color}`}>
                                                    {sc.icon}
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(t.created_at).toLocaleDateString('fr-FR')}
                                                <div className="text-gray-400">
                                                    {new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default FinanceOnlinePayments;
