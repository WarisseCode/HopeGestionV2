// frontend/src/pages/LocationDetails.tsx
// Module V: Detailed lease view with interactive payment schedule

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, FileText, Calendar, User, Home, DollarSign, 
    Check, Clock, AlertTriangle, X, Plus, CreditCard, Building,
    RefreshCw, XCircle, Wallet
} from 'lucide-react';
import locationApi from '../api/locationApi';
import { API_URL } from '../config';
import type { Location, PaymentScheduleItem } from '../api/locationApi';
import Alert from '../components/ui/Alert';
import Card from '../components/ui/Card';

const LocationDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [location, setLocation] = useState<Location | null>(null);
    const [echeancier, setEcheancier] = useState<PaymentScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'echeancier' | 'infos'>('echeancier');
    
    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<PaymentScheduleItem | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMode, setPaymentMode] = useState<string>('especes');

    useEffect(() => {
        if (id) loadLocationDetails();
    }, [id]);

    const loadLocationDetails = async () => {
        try {
            setLoading(true);
            const data = await locationApi.getLocation(parseInt(id!));
            setLocation(data.location);
            setEcheancier(data.echeancier || []);
        } catch (err: any) {
            setError(err.message || 'Erreur chargement');
        } finally {
            setLoading(false);
        }
    };

    const openPaymentModal = (schedule: PaymentScheduleItem) => {
        setSelectedSchedule(schedule);
        const remaining = schedule.montant - (schedule.montant_paye || 0);
        setPaymentAmount(remaining > 0 ? remaining : schedule.montant);
        setShowPaymentModal(true);
    };

    const handleRecordPayment = async () => {
        if (!selectedSchedule || !location) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/paiements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lease_id: location.id,
                    montant: paymentAmount,
                    type: 'loyer',
                    mode_paiement: paymentMode,
                    schedule_id: selectedSchedule.id
                })
            });
            
            if (!response.ok) throw new Error('Erreur enregistrement');
            
            setSuccess('Paiement enregistré !');
            setShowPaymentModal(false);
            loadLocationDetails(); // Refresh data
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case 'paye': return { color: 'bg-green-100 text-green-700', icon: <Check size={14} /> };
            case 'partiel': return { color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={14} /> };
            case 'retard': return { color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} /> };
            case 'impaye': return { color: 'bg-red-200 text-red-800', icon: <XCircle size={14} /> };
            default: return { color: 'bg-base-300 text-base-content/70', icon: <Clock size={14} /> };
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: location?.devise || 'XOF' }).format(amount);
    };

    const totalDue = echeancier.reduce((sum, e) => sum + e.montant, 0);
    const totalPaid = echeancier.reduce((sum, e) => sum + (e.montant_paye || 0), 0);
    const balance = totalDue - totalPaid;

    if (loading && !location) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="p-6">
                <Alert variant="error">Location non trouvée</Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate('/dashboard/locations')}
                    className="p-2 hover:bg-base-300 rounded-lg transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-base-content/90">{location.reference_bail}</h1>
                    <p className="text-sm text-base-content/60">
                        {location.locataire_prenoms} {location.locataire_nom} • {location.ref_lot}
                    </p>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                    location.statut === 'actif' ? 'bg-green-100 text-green-700' :
                    location.statut === 'signe' ? 'bg-teal-100 text-teal-700' :
                    'bg-base-300 text-base-content/70'
                }`}>
                    {location.statut}
                </span>
            </div>

            {/* Alerts */}
            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <DollarSign className="text-teal-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-base-content/90">{formatCurrency(location.loyer_mensuel)}</p>
                            <p className="text-xs text-base-content/60">Loyer mensuel</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Check className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                            <p className="text-xs text-base-content/60">Total payé</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Wallet className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(balance)}</p>
                            <p className="text-xs text-base-content/60">Solde restant</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Calendar className="text-teal-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-base-content/90">{echeancier.length}</p>
                            <p className="text-xs text-base-content/60">Échéances</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-base-300">
                <button 
                    onClick={() => setActiveTab('echeancier')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                        activeTab === 'echeancier' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-base-content/60 hover:text-base-content/80'
                    }`}
                >
                    <Calendar size={16} className="inline mr-2" />
                    Échéancier
                </button>
                <button 
                    onClick={() => setActiveTab('infos')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                        activeTab === 'infos' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-base-content/60 hover:text-base-content/80'
                    }`}
                >
                    <FileText size={16} className="inline mr-2" />
                    Informations
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'echeancier' && (
                <Card className="overflow-hidden">
                    {echeancier.length === 0 ? (
                        <div className="p-8 text-center text-base-content/60">
                            <Calendar size={48} className="mx-auto mb-4 text-base-content/40" />
                            <p>Aucun échéancier généré pour ce contrat.</p>
                            <p className="text-sm">L'échéancier est créé automatiquement pour les paiements échelonnés.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-base-200 text-base-content/70 text-sm">
                                    <tr>
                                        <th className="p-4 text-left">#</th>
                                        <th className="p-4 text-left">Date échéance</th>
                                        <th className="p-4 text-left">Montant dû</th>
                                        <th className="p-4 text-left">Payé</th>
                                        <th className="p-4 text-left">Solde</th>
                                        <th className="p-4 text-left">Statut</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {echeancier.map((item) => {
                                        const statusBadge = getStatusBadge(item.statut);
                                        const solde = item.montant - (item.montant_paye || 0);
                                        return (
                                            <motion.tr 
                                                key={item.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="hover:bg-base-200 transition"
                                            >
                                                <td className="p-4 font-mono text-sm">{item.numero_echeance}</td>
                                                <td className="p-4">
                                                    {new Date(item.date_echeance).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 font-medium">{formatCurrency(item.montant)}</td>
                                                <td className="p-4 text-green-600 font-medium">{formatCurrency(item.montant_paye || 0)}</td>
                                                <td className="p-4 font-medium text-orange-600">{formatCurrency(solde)}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                                                        {statusBadge.icon}
                                                        {item.statut}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {item.statut !== 'paye' && (
                                                        <button 
                                                            onClick={() => openPaymentModal(item)}
                                                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition flex items-center gap-1 ml-auto"
                                                        >
                                                            <CreditCard size={14} />
                                                            Payer
                                                        </button>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'infos' && (
                <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base-content/90 flex items-center gap-2">
                            <User size={18} /> Locataire
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-base-content/60">Nom:</span> {location.locataire_prenoms} {location.locataire_nom}</p>
                            <p><span className="text-base-content/60">Téléphone:</span> {location.locataire_telephone || '-'}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base-content/90 flex items-center gap-2">
                            <Home size={18} /> Bien
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-base-content/60">Lot:</span> {location.ref_lot}</p>
                            <p><span className="text-base-content/60">Immeuble:</span> {location.immeuble_nom || '-'}</p>
                            <p><span className="text-base-content/60">Propriétaire:</span> {location.proprietaire_nom || '-'}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base-content/90 flex items-center gap-2">
                            <Calendar size={18} /> Période
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-base-content/60">Début:</span> {new Date(location.date_debut).toLocaleDateString('fr-FR')}</p>
                            <p><span className="text-base-content/60">Fin:</span> {location.date_fin ? new Date(location.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée'}</p>
                            <p><span className="text-base-content/60">Durée:</span> {location.duree_contrat || '-'} mois</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-base-content/90 flex items-center gap-2">
                            <DollarSign size={18} /> Finances
                        </h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-base-content/60">Loyer:</span> {formatCurrency(location.loyer_mensuel)}</p>
                            <p><span className="text-base-content/60">Caution:</span> {formatCurrency(location.caution)}</p>
                            <p><span className="text-base-content/60">Avance:</span> {formatCurrency(location.avance)}</p>
                            <p><span className="text-base-content/60">Type paiement:</span> {location.type_paiement}</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && selectedSchedule && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-base-100 rounded-xl shadow-xl w-full max-w-md"
                        >
                            <div className="p-6 border-b">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold">Enregistrer un paiement</h3>
                                    <button onClick={() => setShowPaymentModal(false)} className="text-base-content/50 hover:text-base-content/70">
                                        <X size={24} />
                                    </button>
                                </div>
                                <p className="text-sm text-base-content/60 mt-1">
                                    Échéance #{selectedSchedule.numero_echeance} - {new Date(selectedSchedule.date_echeance).toLocaleDateString('fr-FR')}
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-base-200 p-4 rounded-lg grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-base-content/60">Montant dû</p>
                                        <p className="font-bold">{formatCurrency(selectedSchedule.montant)}</p>
                                    </div>
                                    <div>
                                        <p className="text-base-content/60">Déjà payé</p>
                                        <p className="font-bold text-green-600">{formatCurrency(selectedSchedule.montant_paye || 0)}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">Montant à payer</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border rounded-lg text-lg font-bold"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(parseFloat(e.target.value))}
                                        min={0}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">Mode de paiement</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-base-100"
                                        value={paymentMode}
                                        onChange={e => setPaymentMode(e.target.value)}
                                    >
                                        <option value="especes">Espèces</option>
                                        <option value="virement">Virement bancaire</option>
                                        <option value="mobile_money">Mobile Money</option>
                                        <option value="cheque">Chèque</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-5 py-2.5 text-base-content/70 hover:bg-base-300 rounded-lg transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={loading || paymentAmount <= 0}
                                    className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    Confirmer le paiement
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LocationDetails;
