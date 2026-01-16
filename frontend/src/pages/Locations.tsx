// frontend/src/pages/Locations.tsx
// Page for managing leases (baux/locations)

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, Plus, Search, Filter, Calendar, User, Home, 
    MoreVertical, Edit, X, Check, RefreshCw, XCircle, Eye,
    DollarSign, Clock, AlertTriangle, PenTool as Pen
} from 'lucide-react';
import locationApi from '../api/locationApi';
import type { Location, CreateLocationData } from '../api/locationApi';
import { accountApi } from '../api/accountApi';
import { getLots } from '../api/bienApi';
import { documentApi } from '../api/documentApi';
import Alert from '../components/ui/Alert';
import SignatureModal from '../components/SignatureModal';

const Locations: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(null);

    // Data for dropdowns
    const [locataires, setLocataires] = useState<any[]>([]);
    const [lots, setLots] = useState<any[]>([]);
    const [owners, setOwners] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState<CreateLocationData>({
        tenant_id: 0,
        lot_id: 0,
        owner_id: 0,
        date_debut: new Date().toISOString().split('T')[0],
        loyer_mensuel: 0,
        caution: 0,
        avance: 0,
        charges_mensuelles: 0,
        devise: 'XOF',
        type_paiement: 'classique',
        jour_echeance: 1,
        duree_contrat: 12
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [locationsData, locatairesData, lotsData, ownersData] = await Promise.all([
                locationApi.getLocations(),
                fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/locataires`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
                }).then(r => r.json()),
                getLots(),
                accountApi.getProprietaires()
            ]);
            setLocations(locationsData);
            setLocataires(locatairesData.locataires || locatairesData || []);
            setLots(lotsData || []);
            setOwners(ownersData || []);
        } catch (err) {
            console.error(err);
            setError("Erreur lors du chargement des données");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await locationApi.createLocation(formData);
            setSuccess("Bail créé avec succès !");
            setShowAddModal(false);
            loadData();
            resetForm();
        } catch (err: any) {
            setError(err.message || "Erreur lors de la création");
        }
    };

    const handleSaveSignature = async (signatureImage: string) => {
        if (!selectedLeaseId) return;
        
        try {
            setLoading(true);
            await locationApi.signLease(selectedLeaseId, signatureImage);
            setSuccess("Contrat signé avec succès !");
            // Refresh locations
            const updatedLocations = await locationApi.getLocations();
            setLocations(updatedLocations);
        } catch (err: any) {
            setError(err.message || "Erreur lors de la signature");
        } finally {
            setLoading(false);
            setSelectedLeaseId(null);
            setShowSignatureModal(false); // Close modal after save
        }
    };

    const handleResilier = async (id: number) => {
        if (!window.confirm("Êtes-vous sûr de vouloir résilier ce bail ?")) return;
        try {
            await locationApi.resilierLocation(id);
            setSuccess("Bail résilié");
            loadData();
        } catch (err) {
            setError("Erreur lors de la résiliation");
        }
    };

    const handleGenerateLease = async (locationId: number) => {
        try {
            setLoading(true);
            await documentApi.generateLease(locationId);
            setSuccess("Contrat de bail généré avec succès dans Documents !");
            setShowDetailModal(false);
        } catch (err: any) {
            console.error(err);
            setError("Erreur lors de la génération du bail");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            tenant_id: 0,
            lot_id: 0,
            owner_id: 0,
            date_debut: new Date().toISOString().split('T')[0],
            loyer_mensuel: 0,
            caution: 0,
            avance: 0,
            charges_mensuelles: 0,
            devise: 'XOF',
            type_paiement: 'classique',
            jour_echeance: 1,
            duree_contrat: 12
        });
    };

    const openDetail = (location: Location) => {
        setSelectedLocation(location);
        setShowDetailModal(true);
    };

    const filteredLocations = locations.filter(loc => {
        let matchesStatus = true;
        if (filterStatus === 'actif') {
            matchesStatus = loc.statut === 'actif' || loc.statut === 'signe';
        } else if (filterStatus === 'non_signe') {
            matchesStatus = loc.statut === 'actif';
        } else if (filterStatus) {
            matchesStatus = loc.statut === filterStatus;
        }

        const matchesSearch = !searchTerm || 
            loc.locataire_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.reference_bail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.immeuble_nom?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusColor = (statut: string) => {
        switch (statut) {
            case 'actif': return 'bg-blue-100 text-blue-700';
            case 'signe': return 'bg-green-100 text-green-700';
            case 'expire': return 'bg-orange-100 text-orange-700';
            case 'resilie': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const formatCurrency = (amount: number, devise: string = 'XOF') => {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Locations & Baux</h1>
                    <p className="text-gray-500 text-sm">Gérez les contrats de location</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary/90 transition shadow-md"
                >
                    <Plus size={18} /> Nouveau Bail
                </button>
            </div>

            {/* Alerts */}
            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher par locataire, référence, immeuble..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20"
                >
                    <option value="">Tous les statuts</option>
                    <option value="actif">Actif (En cours)</option>
                    <option value="signe">Signé</option>
                    <option value="non_signe">Non signé</option>
                    <option value="expire">Expiré</option>
                    <option value="resilie">Résilié</option>
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{locations.length}</p>
                            <p className="text-xs text-gray-500">Total Baux</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Check className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">
                                {locations.filter(l => l.statut === 'actif').length}
                            </p>
                            <p className="text-xs text-gray-500">Actifs</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <Clock className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">
                                {locations.filter(l => l.statut === 'expire').length}
                            </p>
                            <p className="text-xs text-gray-500">Expirés</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <DollarSign className="text-purple-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">
                                {formatCurrency(locations.filter(l => l.statut === 'actif').reduce((sum, l) => sum + (l.loyer_mensuel || 0), 0))}
                            </p>
                            <p className="text-xs text-gray-500">Loyers mensuels</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-semibold">Référence</th>
                                <th className="p-4 font-semibold">Locataire</th>
                                <th className="p-4 font-semibold">Lot</th>
                                <th className="p-4 font-semibold">Loyer</th>
                                <th className="p-4 font-semibold">Période</th>
                                <th className="p-4 font-semibold">Statut</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLocations.map(location => (
                                <motion.tr 
                                    key={location.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => openDetail(location)}
                                >
                                    <td className="p-4">
                                        <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-md border border-blue-100 shadow-sm">
                                            {location.reference_bail || "SANS RÉF."}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                {location.locataire_nom?.[0]}{location.locataire_prenoms?.[0]}
                                            </div>
                                            <span className="font-medium">{location.locataire_prenoms} {location.locataire_nom}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <div className="font-medium">{location.ref_lot}</div>
                                            <div className="text-xs text-gray-500">{location.immeuble_nom}</div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-semibold text-green-600">
                                        {formatCurrency(location.loyer_mensuel, location.devise)}
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div>{new Date(location.date_debut).toLocaleDateString('fr-FR')}</div>
                                        {location.date_fin && (
                                            <div className="text-gray-500">→ {new Date(location.date_fin).toLocaleDateString('fr-FR')}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(location.statut)}`}>
                                            {location.statut}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => openDetail(location)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                                                title="Voir détails"
                                            >
                                                <Eye size={16} className="text-gray-600" />
                                            </button>
                                            {(location.statut === 'actif' || location.statut === 'signe') && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleResilier(location.id); }}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition"
                                                    title="Résilier"
                                                >
                                                    <XCircle size={16} className="text-red-500" />
                                                </button>
                                            )}
                                            {location.statut === 'actif' && !location.signature_url && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedLeaseId(location.id);
                                                        setShowSignatureModal(true);
                                                    }}
                                                    className="p-2 hover:bg-blue-50 rounded-lg transition"
                                                    title="Signer le contrat"
                                                >
                                                    <Pen size={16} className="text-blue-500" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                            {filteredLocations.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        Aucun bail trouvé
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {showAddModal && (
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
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b sticky top-0 bg-white z-10">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold">Nouveau Bail</h3>
                                    <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-6">
                                {/* Parties */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Locataire *</label>
                                        <select
                                            className="w-full p-2.5 border rounded-lg bg-white"
                                            value={formData.tenant_id}
                                            onChange={e => setFormData({...formData, tenant_id: parseInt(e.target.value)})}
                                            required
                                        >
                                            <option value={0}>Sélectionner un locataire</option>
                                            {locataires.map((l: any) => (
                                                <option key={l.id} value={l.id}>{l.prenoms} {l.nom}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Lot *</label>
                                        <select
                                            className="w-full p-2.5 border rounded-lg bg-white"
                                            value={formData.lot_id}
                                            onChange={e => setFormData({...formData, lot_id: parseInt(e.target.value)})}
                                            required
                                        >
                                            <option value={0}>Sélectionner un lot</option>
                                            {lots.filter((lot: any) => lot.statut === 'libre').map((lot: any) => (
                                                <option key={lot.id} value={lot.id}>{lot.reference} - {lot.immeuble}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Propriétaire *</label>
                                    <select
                                        className="w-full p-2.5 border rounded-lg bg-white"
                                        value={formData.owner_id}
                                        onChange={e => setFormData({...formData, owner_id: parseInt(e.target.value)})}
                                        required
                                    >
                                        <option value={0}>Sélectionner un propriétaire</option>
                                        {owners.map((o: any) => (
                                            <option key={o.id} value={o.id}>{o.nom || o.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.date_debut}
                                            onChange={e => setFormData({...formData, date_debut: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.date_fin || ''}
                                            onChange={e => setFormData({...formData, date_fin: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Durée (mois)</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.duree_contrat}
                                            onChange={e => setFormData({...formData, duree_contrat: parseInt(e.target.value)})}
                                            min={1}
                                        />
                                    </div>
                                </div>

                                {/* Finances */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Loyer mensuel *</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.loyer_mensuel}
                                            onChange={e => setFormData({...formData, loyer_mensuel: parseFloat(e.target.value)})}
                                            required
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Charges mensuelles</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.charges_mensuelles}
                                            onChange={e => setFormData({...formData, charges_mensuelles: parseFloat(e.target.value)})}
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Caution</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.caution}
                                            onChange={e => setFormData({...formData, caution: parseFloat(e.target.value)})}
                                            min={0}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Avance</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.avance}
                                            onChange={e => setFormData({...formData, avance: parseFloat(e.target.value)})}
                                            min={0}
                                        />
                                    </div>
                                </div>

                                {/* Payment config */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                                        <select
                                            className="w-full p-2.5 border rounded-lg bg-white"
                                            value={formData.devise}
                                            onChange={e => setFormData({...formData, devise: e.target.value})}
                                        >
                                            <option value="XOF">XOF (FCFA)</option>
                                            <option value="EUR">EUR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type paiement</label>
                                        <select
                                            className="w-full p-2.5 border rounded-lg bg-white"
                                            value={formData.type_paiement}
                                            onChange={e => setFormData({...formData, type_paiement: e.target.value})}
                                        >
                                            <option value="classique">Classique (mensuel)</option>
                                            <option value="echelonne">Échelonné</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jour d'échéance</label>
                                        <input
                                            type="number"
                                            className="w-full p-2.5 border rounded-lg"
                                            value={formData.jour_echeance}
                                            onChange={e => setFormData({...formData, jour_echeance: parseInt(e.target.value)})}
                                            min={1}
                                            max={31}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                                    >
                                        <Check size={18} /> Créer le bail
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedLocation && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowDetailModal(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-lg"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{selectedLocation.reference_bail}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(selectedLocation.statut)}`}>
                                            {selectedLocation.statut}
                                        </span>
                                    </div>
                                    <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Locataire</p>
                                        <p className="font-medium">{selectedLocation.locataire_prenoms} {selectedLocation.locataire_nom}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Lot</p>
                                        <p className="font-medium">{selectedLocation.ref_lot}</p>
                                        <p className="text-xs text-gray-400">{selectedLocation.immeuble_nom}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Loyer mensuel</p>
                                        <p className="font-bold text-green-600">{formatCurrency(selectedLocation.loyer_mensuel, selectedLocation.devise)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Caution</p>
                                        <p className="font-medium">{formatCurrency(selectedLocation.caution, selectedLocation.devise)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date début</p>
                                        <p className="font-medium">{new Date(selectedLocation.date_debut).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Date fin</p>
                                        <p className="font-medium">{selectedLocation.date_fin ? new Date(selectedLocation.date_fin).toLocaleDateString('fr-FR') : '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t flex justify-end gap-2">
                                {(selectedLocation.statut === 'actif' || selectedLocation.statut === 'signe') && (
                                    <>
                                        <button 
                                            onClick={() => handleGenerateLease(selectedLocation.id)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                            title="Générer et sauvegarder le PDF"
                                        >
                                            <FileText size={16} /> Générer Bail
                                        </button>
                                        <button 
                                            onClick={() => { setShowDetailModal(false); handleResilier(selectedLocation.id); }}
                                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-2"
                                        >
                                            <XCircle size={16} /> Résilier
                                        </button>
                                        <button 
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                                        >
                                            <RefreshCw size={16} /> Renouveler
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Signature Modal */}
            <SignatureModal 
                open={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onSave={handleSaveSignature}
            />
        </div>
    );
};

export default Locations;
