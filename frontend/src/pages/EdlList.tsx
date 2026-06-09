import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ClipboardCheck, Plus, Search, Calendar, 
    CheckCircle, Clock, User, Building, ChevronRight, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';

interface EdlInspection {
    id: number;
    ref_edl: string;
    lot_id: number;
    ref_lot: string;
    lot_type: string;
    type_edl: 'entree' | 'sortie' | 'intermediaire';
    date_realisation: string;
    agent_name: string;
    locataire_name: string;
    statut: 'brouillon' | 'signe' | 'cloture' | 'archive';
    item_count: number;
}

const EdlList: React.FC = () => {
    const [edls, setEdls] = useState<EdlInspection[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all');
    const [filterStatut, setFilterStatut] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadEdls();
    }, []);

    const loadEdls = async () => {
        try {
            const data = await apiCall<EdlInspection[]>(`${API_URL}/edl`);
            setEdls(data);
        } catch (error) {
            console.error('Error loading EDL:', error);
            toast.error('Impossible de charger les états des lieux.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'signe':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={10} /> Signé</span>;
            case 'brouillon':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock size={10} /> Brouillon</span>;
            case 'cloture':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700 flex items-center gap-1"><CheckCircle size={10} /> Clôturé</span>;
            case 'archive':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-base-300 text-base-content/80">Archivé</span>;
            default:
                return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'entree': return 'État des lieux d\'Entrée';
            case 'sortie': return 'État des lieux de Sortie';
            case 'intermediaire': return 'Contrôle Intermédiaire';
            default: return type;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'entree': return '🔑';
            case 'sortie': return '🚪';
            case 'intermediaire': return '🔍';
            default: return '📋';
        }
    };

    const filteredEdls = edls.filter(edl => {
        const matchesSearch = 
            edl.ref_edl?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            edl.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            edl.locataire_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            edl.ref_lot?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || edl.type_edl === filterType;
        const matchesStatut = filterStatut === 'all' || edl.statut === filterStatut;
        return matchesSearch && matchesType && matchesStatut;
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                        <ClipboardCheck className="text-teal-600" /> États des Lieux
                    </h1>
                    <p className="text-base-content/60">Inspections juridiques d'entrée et sortie</p>
                </div>
                <Link 
                    to="/dashboard/etats-des-lieux/nouveau" 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-teal-500/30 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    <Plus size={20} /> Nouvel État des Lieux
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 bg-base-100 p-4 rounded-2xl shadow-sm border border-base-200">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={20} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (Réf, Lot, Locataire...)" 
                        className="w-full pl-10 pr-4 py-2 bg-base-200 border border-base-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                    <Filter size={18} className="text-base-content/50 hidden lg:block" />
                    <select 
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-base-200 border border-base-300 focus:ring-2 focus:ring-teal-500"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tous les types</option>
                        <option value="entree">Entrée</option>
                        <option value="sortie">Sortie</option>
                        <option value="intermediaire">Intermédiaire</option>
                    </select>
                    <select 
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-base-200 border border-base-300 focus:ring-2 focus:ring-teal-500"
                        value={filterStatut}
                        onChange={(e) => setFilterStatut(e.target.value)}
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="brouillon">Brouillon</option>
                        <option value="signe">Signé</option>
                        <option value="cloture">Clôturé</option>
                        <option value="archive">Archivé</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-base-content/50">Chargement...</div>
                ) : filteredEdls.length === 0 ? (
                    <div className="p-12 text-center text-base-content/50">
                        <ClipboardCheck className="mx-auto mb-3 opacity-20" size={48} />
                        Aucun état des lieux trouvé
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredEdls.map((edl) => (
                            <div key={edl.id} className="p-4 hover:bg-base-200 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                                <div className="p-3 bg-teal-50 rounded-xl text-3xl">
                                    {getTypeIcon(edl.type_edl)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-base-content">{edl.ref_edl}</h3>
                                        {getStatusBadge(edl.statut)}
                                    </div>
                                    <p className="text-sm text-teal-600 font-medium mb-1">{getTypeLabel(edl.type_edl)}</p>
                                    <div className="flex items-center gap-4 text-sm text-base-content/60 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Building size={14} /> {edl.ref_lot}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} /> {new Date(edl.date_realisation).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User size={14} /> {edl.locataire_name || 'N/A'}
                                        </span>
                                        <span className="bg-base-300 px-2 py-0.5 rounded text-xs">
                                            {edl.item_count} éléments
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/dashboard/etats-des-lieux/${edl.id}`} className="p-2 hover:bg-base-300 rounded-lg text-base-content/50 hover:text-base-content/70 transition">
                                        <ChevronRight size={20} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EdlList;
