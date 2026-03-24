// frontend/src/pages/ReservationsList.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, MapPin, CheckCircle, XCircle, Clock, User, Phone, 
    ArrowRight, RefreshCw, Filter, ChevronDown, ExternalLink, Building
} from 'lucide-react';
import { getToken } from '../api/authApi';
import { API_BASE } from '../config';

interface Reservation {
    id: number;
    reference_bail: string;
    statut: string;
    date_debut: string;
    created_at: string;
    conditions_particulieres?: string;
    locataire_nom: string;
    locataire_prenoms: string;
    telephone_principal: string;
    ref_lot: string;
    immeuble_nom: string;
}

const ReservationsList: React.FC = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'en_attente' | 'actif' | 'refuse'>('all');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const loadReservations = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/reservations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erreur chargement');
            const data = await res.json();
            setReservations(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadReservations(); }, []);

    const handleValidate = async (id: number, action: 'accept' | 'refuse') => {
        setActionLoading(id);
        try {
            const token = getToken();
            const newStatus = action === 'accept' ? 'actif' : 'refuse';
            const res = await fetch(`${API_BASE}/api/reservations/${id}/validate`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ statut: newStatus })
            });
            if (!res.ok) throw new Error('Erreur validation');
            loadReservations();
        } catch (err) {
            alert('Erreur lors de la validation');
        } finally {
            setActionLoading(null);
        }
    };

    // Transform modal state
    const [transformModalOpen, setTransformModalOpen] = useState(false);
    const [transformingReservation, setTransformingReservation] = useState<Reservation | null>(null);
    const [transformData, setTransformData] = useState({
        date_fin: '',
        caution: '',
        avance: '1',
        periodicite: 'mensuel'
    });
    const [transformLoading, setTransformLoading] = useState(false);

    const openTransformModal = (reservation: Reservation) => {
        setTransformingReservation(reservation);
        // Calculate default end date (1 year from start)
        const startDate = new Date(reservation.date_debut);
        startDate.setFullYear(startDate.getFullYear() + 1);
        setTransformData({
            date_fin: startDate.toISOString().split('T')[0],
            caution: '',
            avance: '1',
            periodicite: 'mensuel'
        });
        setTransformModalOpen(true);
    };

    const handleTransform = async () => {
        if (!transformingReservation) return;
        setTransformLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/reservations/${transformingReservation.id}/transform`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    date_fin: transformData.date_fin || null,
                    caution: transformData.caution ? parseFloat(transformData.caution) : null,
                    avance: parseInt(transformData.avance) || 1,
                    periodicite: transformData.periodicite
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erreur transformation');
            
            alert(`✅ Réservation transformée en bail !\nNouvelle référence: ${data.reference}`);
            setTransformModalOpen(false);
            setTransformingReservation(null);
            loadReservations();
        } catch (err: any) {
            alert(err.message || 'Erreur lors de la transformation');
        } finally {
            setTransformLoading(false);
        }
    };

    const filteredReservations = reservations.filter(r => 
        filter === 'all' ? true : r.statut === filter
    );

    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case 'en_attente':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock size={12}/> En attente</span>;
            case 'actif':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={12}/> Validée</span>;
            case 'refuse':
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1"><XCircle size={12}/> Refusée</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-xs font-bold bg-base-300 text-base-content/80">{statut}</span>;
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-base-content">Réservations</h1>
                    <p className="text-base-content/60">Gérez les demandes de réservation en ligne</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadReservations} className="btn-secondary flex items-center gap-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: reservations.length, color: 'blue', filter: 'all' },
                    { label: 'En attente', value: reservations.filter(r => r.statut === 'en_attente').length, color: 'yellow', filter: 'en_attente' },
                    { label: 'Validées', value: reservations.filter(r => r.statut === 'actif').length, color: 'green', filter: 'actif' },
                    { label: 'Refusées', value: reservations.filter(r => r.statut === 'refuse').length, color: 'red', filter: 'refuse' },
                ].map(stat => (
                    <motion.button
                        key={stat.label}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFilter(stat.filter as any)}
                        className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            filter === stat.filter 
                                ? `border-${stat.color}-500 bg-${stat.color}-50` 
                                : 'border-base-200 bg-base-100 hover:border-base-300'
                        }`}
                    >
                        <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                        <p className="text-sm text-base-content/60 font-medium">{stat.label}</p>
                    </motion.button>
                ))}
            </div>

            {/* Reservations List */}
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-base-content/60">
                        <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                        Chargement...
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="p-12 text-center text-base-content/60">
                        <Calendar className="mx-auto mb-2 opacity-50" size={32} />
                        Aucune réservation {filter !== 'all' ? `(${filter})` : ''}
                    </div>
                ) : (
                    <div className="divide-y divide-base-200">
                        <AnimatePresence>
                            {filteredReservations.map((reservation, idx) => (
                                <motion.div
                                    key={reservation.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-5 hover:bg-base-200/50 transition-colors"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Info */}
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-base-content/60 uppercase font-bold mb-1">Client</p>
                                                <p className="font-semibold text-base-content flex items-center gap-2">
                                                    <User size={14} className="text-gray-400" />
                                                    {reservation.locataire_nom} {reservation.locataire_prenoms}
                                                </p>
                                                <p className="text-sm text-base-content/60 flex items-center gap-2">
                                                    <Phone size={12} /> {reservation.telephone_principal}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-base-content/60 uppercase font-bold mb-1">Bien</p>
                                                <p className="font-semibold text-base-content flex items-center gap-2">
                                                    <Building size={14} className="text-gray-400" />
                                                    {reservation.ref_lot}
                                                </p>
                                                <p className="text-sm text-base-content/60">{reservation.immeuble_nom}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-base-content/60 uppercase font-bold mb-1">Date souhaitée</p>
                                                <p className="font-semibold text-base-content flex items-center gap-2">
                                                    <Calendar size={14} className="text-gray-400" />
                                                    {new Date(reservation.date_debut).toLocaleDateString('fr-FR')}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Demande: {new Date(reservation.created_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(reservation.statut)}
                                            
                                            {reservation.statut === 'en_attente' && (
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleValidate(reservation.id, 'accept')}
                                                        disabled={actionLoading === reservation.id}
                                                        className="p-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50"
                                                        title="Valider"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleValidate(reservation.id, 'refuse')}
                                                        disabled={actionLoading === reservation.id}
                                                        className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50"
                                                        title="Refuser"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            )}

                                            {reservation.statut === 'actif' && (
                                                <button 
                                                    onClick={() => openTransformModal(reservation)}
                                                    className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
                                                >
                                                    <ArrowRight size={14} /> Transformer en Bail
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {reservation.conditions_particulieres && (
                                        <div className="mt-3 p-3 bg-base-200 rounded-xl text-sm text-base-content/70 italic">
                                            "{reservation.conditions_particulieres}"
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Transform Modal */}
            <AnimatePresence>
                {transformModalOpen && transformingReservation && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setTransformModalOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-base-content mb-1">Transformer en Bail</h2>
                            <p className="text-sm text-base-content/60 mb-6">
                                {transformingReservation.ref_lot} - {transformingReservation.locataire_nom} {transformingReservation.locataire_prenoms}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">Date de fin du bail</label>
                                    <input 
                                        type="date" 
                                        value={transformData.date_fin}
                                        onChange={(e) => setTransformData({...transformData, date_fin: e.target.value})}
                                        className="w-full p-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-base-content/80 mb-1">Caution (FCFA)</label>
                                        <input 
                                            type="number" 
                                            placeholder="Auto = 1 mois"
                                            value={transformData.caution}
                                            onChange={(e) => setTransformData({...transformData, caution: e.target.value})}
                                            className="w-full p-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-base-content/80 mb-1">Avance (mois)</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={transformData.avance}
                                            onChange={(e) => setTransformData({...transformData, avance: e.target.value})}
                                            className="w-full p-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">Périodicité</label>
                                    <select 
                                        value={transformData.periodicite}
                                        onChange={(e) => setTransformData({...transformData, periodicite: e.target.value})}
                                        className="w-full p-3 border border-base-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="mensuel">Mensuel</option>
                                        <option value="trimestriel">Trimestriel</option>
                                        <option value="semestriel">Semestriel</option>
                                        <option value="annuel">Annuel</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button 
                                    onClick={() => setTransformModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-xl border border-base-300 text-base-content/80 font-medium hover:bg-base-200 transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={handleTransform}
                                    disabled={transformLoading}
                                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {transformLoading ? (
                                        <><RefreshCw size={16} className="animate-spin" /> Transformation...</>
                                    ) : (
                                        <><CheckCircle size={16} /> Confirmer</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReservationsList;
