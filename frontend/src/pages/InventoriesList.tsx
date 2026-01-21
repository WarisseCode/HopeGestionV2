import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    ClipboardList, Plus, Search, Filter, Calendar, 
    CheckCircle, Clock, AlertTriangle, ChevronRight, User
} from 'lucide-react';
import { getToken } from '../api/authApi';
import { Link } from 'react-router-dom';

interface Inventory {
    id: number;
    entity_type: string; // 'lot' or 'building'
    entity_id: number;
    date_realisation: string;
    type_inventaire: string;
    agent_name: string;
    statut: string;
    commentaires: string;
    item_count: number;
}

const InventoriesList: React.FC = () => {
    const [inventories, setInventories] = useState<Inventory[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatut, setFilterStatut] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadInventories();
    }, []);

    const loadInventories = async () => {
        try {
            const token = getToken();
            const res = await fetch('http://localhost:5000/api/inventories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInventories(data);
            }
        } catch (error) {
            console.error('Error loading inventories:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'valide':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle size={10} /> Validé</span>;
            case 'brouillon':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock size={10} /> Brouillon</span>;
            case 'archive':
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 flex items-center gap-1"><Clock size={10} /> Archivé</span>;
            default:
                return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'entree': return 'État des lieux Entrée';
            case 'sortie': return 'État des lieux Sortie';
            case 'mobilier': return 'Inventaire Mobilier';
            case 'technique': return 'Inventaire Technique';
            default: return type;
        }
    };

    const filteredInventories = inventories.filter(inv => {
        const matchesSearch = 
            inv.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.type_inventaire?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatut === 'all' || inv.statut === filterStatut;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="text-blue-600" /> Gestion des Inventaires
                    </h1>
                    <p className="text-gray-500">États des lieux et suivi des équipements</p>
                </div>
                <Link 
                    to="/dashboard/inventories/new" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2 font-medium"
                >
                    <Plus size={20} /> Nouvel Inventaire
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'brouillon', 'valide', 'archive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatut(status)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                filterStatut === status 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {status === 'all' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Chargement...</div>
                ) : filteredInventories.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <ClipboardList className="mx-auto mb-3 opacity-20" size={48} />
                        Aucun inventaire trouvé
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredInventories.map((inv) => (
                            <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                    <ClipboardList size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{getTypeLabel(inv.type_inventaire)}</h3>
                                        {getStatusBadge(inv.statut)}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} /> {new Date(inv.date_realisation).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User size={14} /> {inv.agent_name || 'N/A'}
                                        </span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                            {inv.item_count} éléments
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/dashboard/inventories/${inv.id}`} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition">
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

export default InventoriesList;
