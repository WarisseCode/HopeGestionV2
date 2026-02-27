import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ClipboardCheck, Plus, Search, Calendar, 
    CheckCircle, Clock, User, Building, ChevronRight, Filter
} from 'lucide-react';
import { getToken } from '../api/authApi';
import { Link } from 'react-router-dom';

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
            const token = getToken();
            const res = await fetch('http://localhost:5000/api/edl', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEdls(data);
            }
        } catch (error) {
            console.error('Error loading EDL:', error);
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
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-1"><CheckCircle size={10} /> Clôturé</span>;
            case 'archive':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800/50 text-gray-700 dark:text-gray-200">Archivé</span>;
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardCheck className="text-blue-600" /> États des Lieux
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Inspections juridiques d'entrée et sortie</p>
                </div>
                <Link 
                    to="/dashboard/etats-des-lieux/nouveau" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    <Plus size={20} /> Nouvel État des Lieux
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Rechercher (Réf, Lot, Locataire...)" 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
                    <Filter size={18} className="text-gray-400 hidden lg:block" />
                    <select 
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">Tous les types</option>
                        <option value="entree">Entrée</option>
                        <option value="sortie">Sortie</option>
                        <option value="intermediaire">Intermédiaire</option>
                    </select>
                    <select 
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500"
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Chargement...</div>
                ) : filteredEdls.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <ClipboardCheck className="mx-auto mb-3 opacity-20" size={48} />
                        Aucun état des lieux trouvé
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredEdls.map((edl) => (
                            <div key={edl.id} className="p-4 hover:bg-gray-50 dark:bg-slate-900/50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-3xl">
                                    {getTypeIcon(edl.type_edl)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{edl.ref_edl}</h3>
                                        {getStatusBadge(edl.statut)}
                                    </div>
                                    <p className="text-sm text-blue-600 font-medium mb-1">{getTypeLabel(edl.type_edl)}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Building size={14} /> {edl.ref_lot}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} /> {new Date(edl.date_realisation).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User size={14} /> {edl.locataire_name || 'N/A'}
                                        </span>
                                        <span className="bg-gray-100 dark:bg-slate-800/50 px-2 py-0.5 rounded text-xs">
                                            {edl.item_count} éléments
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/dashboard/etats-des-lieux/${edl.id}`} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-300 transition">
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
