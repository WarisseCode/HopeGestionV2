import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { User, Plus, Trash2, Search, Building2, Calendar, FileText, MoreVertical, Edit3, Ban, Columns } from 'lucide-react';
import Alert from './ui/Alert';

interface Owner {
    id: number;
    name: string;
    type: 'individual' | 'company';
    phone: string;
    email: string;
    address: string;
    company_name?: string;
    rccm_number?: string;
    mobile_money?: string;
    management_mode?: 'direct' | 'delegated';
    delegation_start_date?: string;
    delegation_end_date?: string;
}

const CompteProprietaires: React.FC = () => {
    const [owners, setOwners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Filter state
    const [visibleColumns, setVisibleColumns] = useState({
        type: true,
        contact: true,
        localisation: true,
        gestion: true
    });
    
    // Form state
    const [editingProp, setEditingProp] = useState<any>({
        type: 'individual',
        management_mode: 'direct',
        name: '',
        phone: '',
        email: '',
        address: '',
        company_name: '',
        rccm_number: '',
        mobile_money: '',
        delegation_start_date: '',
        delegation_end_date: ''
    });

    useEffect(() => {
        loadOwners();
    }, []);

    const loadOwners = async () => {
        try {
            setLoading(true);
            const data = await accountApi.getProprietaires();
            setOwners(data);
        } catch (err) {
            setError("Impossible de charger les propriétaires.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir désactiver ce propriétaire ?')) {
            try {
                await accountApi.deleteProprietaire(id);
                setOwners(owners.filter(o => o.id !== id));
            } catch (err) {
                setError("Erreur lors de la désactivation.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingProp.id) {
                await accountApi.saveProprietaire(editingProp);
            } else {
                await accountApi.saveProprietaire(editingProp);
            }
            setShowForm(false);
            setEditingProp({ type: 'individual', management_mode: 'direct', name: '', phone: '', email: '', address: '' });
            loadOwners(); // Reload list
        } catch (err) {
            setError("Erreur lors de l'enregistrement.");
        }
    };

    const handleEdit = (owner: any) => {
        setEditingProp({
            ...owner,
            // Ensure values are not null for inputs
            name: owner.nom || owner.name,
            company_name: owner.company_name || '',
            rccm_number: owner.rccm_number || '',
            mobile_money: owner.mobile_money || '',
            delegation_start_date: owner.delegation_start_date || '',
            delegation_end_date: owner.delegation_end_date || ''
        });
        setShowForm(true);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement des propriétaires...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Gestion des Propriétaires</h2>
                    <p className="text-gray-500 text-sm">Gérez les propriétaires et leurs mandats</p>
                </div>
                <div className="flex gap-2">
                     {!showForm && (
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost bg-white border border-gray-200 gap-2">
                                <Columns size={18} />
                                Colonnes
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-gray-200">
                                <li className="menu-title">
                                    <span className="text-xs font-bold uppercase text-gray-500">Afficher</span>
                                </li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.type} onChange={(e) => setVisibleColumns({...visibleColumns, type: e.target.checked})}/> Type</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.contact} onChange={(e) => setVisibleColumns({...visibleColumns, contact: e.target.checked})}/> Contact</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.localisation} onChange={(e) => setVisibleColumns({...visibleColumns, localisation: e.target.checked})}/> Localisation</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.gestion} onChange={(e) => setVisibleColumns({...visibleColumns, gestion: e.target.checked})}/> Mode Gestion</label></li>
                            </ul>
                        </div>
                    )}
                    {!showForm && (
                        <button 
                            onClick={() => {
                                setEditingProp({ type: 'individual', management_mode: 'direct', name: '', phone: '', email: '', address: '' });
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            <Plus size={18} /> Nouveau
                        </button>
                    )}
                </div>
            </div>

            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

            {showForm ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-slide-in">
                    {/* ... Form content preserved ... */}
                     <h3 className="text-lg font-bold mb-6 text-gray-800">
                        {editingProp.id ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Type & Mode - Section Haute */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Type de propriétaire</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 transition shadow-sm">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            checked={editingProp.type === 'individual'}
                                            onChange={() => setEditingProp({...editingProp, type: 'individual'})}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-medium text-gray-800">Particulier</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-300 transition shadow-sm">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            checked={editingProp.type === 'company'}
                                            onChange={() => setEditingProp({...editingProp, type: 'company'})}
                                            className="text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="font-medium text-gray-800">Entreprise</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Mode de gestion</label>
                                <div className="flex gap-4">
                                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${editingProp.management_mode === 'direct' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-green-200'}`}>
                                        <input 
                                            type="radio" 
                                            name="mode" 
                                            checked={editingProp.management_mode === 'direct'}
                                            onChange={() => setEditingProp({...editingProp, management_mode: 'direct'})}
                                            className="text-green-600 focus:ring-green-500"
                                        />
                                        <span className={editingProp.management_mode === 'direct' ? 'text-green-800 font-medium' : 'text-gray-800 font-medium'}>Direct</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border transition shadow-sm ${editingProp.management_mode === 'delegated' ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:border-orange-200'}`}>
                                        <input 
                                            type="radio" 
                                            name="mode" 
                                            checked={editingProp.management_mode === 'delegated'}
                                            onChange={() => setEditingProp({...editingProp, management_mode: 'delegated'})}
                                            className="text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className={editingProp.management_mode === 'delegated' ? 'text-orange-800 font-medium' : 'text-gray-800 font-medium'}>Délégué</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Champs de Délégation (si Délégué) */}
                        {editingProp.management_mode === 'delegated' && (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                <div>
                                    <label className="block text-sm font-medium text-orange-800 mb-1">Début du mandat</label>
                                    <input 
                                        type="date"
                                        value={editingProp.delegation_start_date ? editingProp.delegation_start_date.split('T')[0] : ''}
                                        onChange={(e) => setEditingProp({...editingProp, delegation_start_date: e.target.value})}
                                        className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-orange-800 mb-1">Fin du mandat (Optionnel)</label>
                                    <input 
                                        type="date" 
                                        value={editingProp.delegation_end_date ? editingProp.delegation_end_date.split('T')[0] : ''}
                                        onChange={(e) => setEditingProp({...editingProp, delegation_end_date: e.target.value})}
                                        className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 bg-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Champs Généraux */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {editingProp.type === 'individual' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet *</label>
                                        <input 
                                            type="text" 
                                            value={editingProp.name || ''}
                                            onChange={(e) => setEditingProp({...editingProp, name: e.target.value})}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            required 
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Raison Sociale *</label>
                                        <input 
                                            type="text" 
                                            value={editingProp.company_name || ''}
                                            onChange={(e) => setEditingProp({...editingProp, company_name: e.target.value})}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Numéro RCCM</label>
                                        <input 
                                            type="text" 
                                            value={editingProp.rccm_number || ''}
                                            onChange={(e) => setEditingProp({...editingProp, rccm_number: e.target.value})}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    value={editingProp.email || ''}
                                    onChange={(e) => setEditingProp({...editingProp, email: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                                <input 
                                    type="tel" 
                                    value={editingProp.phone || ''}
                                    onChange={(e) => setEditingProp({...editingProp, phone: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Money</label>
                                <input 
                                    type="tel" 
                                    value={editingProp.mobile_money || ''}
                                    onChange={(e) => setEditingProp({...editingProp, mobile_money: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                                <input 
                                    type="text" 
                                    value={editingProp.address || ''}
                                    onChange={(e) => setEditingProp({...editingProp, address: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button 
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                            >
                                {editingProp.id ? 'Mettre à jour' : 'Créer le propriétaire'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-semibold">Propriétaire</th>
                                {visibleColumns.type && <th className="p-4 font-semibold hidden md:table-cell">Type</th>}
                                {visibleColumns.contact && <th className="p-4 font-semibold">Contact</th>}
                                {visibleColumns.localisation && <th className="p-4 font-semibold hidden md:table-cell">Localisation</th>}
                                {visibleColumns.gestion && <th className="p-4 font-semibold">Mode</th>}
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {owners.map((owner: any) => (
                                <tr key={owner.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => handleEdit(owner)}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="avatar placeholder">
                                                <div className="bg-blue-100 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                                                    {(owner.nom || owner.name || '?').charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {owner.type === 'company' 
                                                        ? (owner.company_name || owner.nom || owner.name)
                                                        : `${owner.nom || owner.name} ${owner.prenom || owner.first_name || ''}`}
                                                </div>
                                                {owner.type === 'company' && <div className="text-xs text-gray-500">RCCM: {owner.rccm_number || owner.rccmNumber}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    {visibleColumns.type && (
                                        <td className="p-4 hidden md:table-cell">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                owner.type === 'individual' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                            }`}>
                                                {owner.type === 'individual' ? 'Particulier' : 'Entreprise'}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.contact && (
                                        <td className="p-4 text-gray-600">
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center gap-1"><User size={12}/> {owner.telephone}</span>
                                                {owner.email && <span className="text-gray-400 text-xs">{owner.email}</span>}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.localisation && (
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="text-sm text-gray-600">{owner.ville || owner.city || '-'}</div>
                                        </td>
                                    )}
                                    {visibleColumns.gestion && (
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                owner.management_mode === 'delegated' || owner.modeGestion === 'delegated'
                                                ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                                                : 'bg-green-100 text-green-700 border border-green-200'
                                            }`}>
                                                {owner.management_mode === 'delegated' || owner.modeGestion === 'delegated' ? 'Délégué' : 'Direct'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
                                                <MoreVertical size={18} className="text-gray-500" />
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-white rounded-box w-52 border border-gray-100">
                                                <li>
                                                    <a onClick={() => handleEdit(owner)} className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">
                                                        <Edit3 size={16} /> Modifier
                                                    </a>
                                                </li>
                                                <li>
                                                    <a onClick={() => handleDelete(owner.id)} className="text-gray-700 hover:text-orange-600 hover:bg-orange-50">
                                                        <Ban size={16} /> Désactiver
                                                    </a>
                                                </li>
                                                <li>
                                                    <a onClick={() => {
                                                        if (window.confirm('⚠️ ATTENTION : Cette action est IRRÉVERSIBLE. Supprimer définitivement ce propriétaire ?')) {
                                                            // Logic for permanent delete if different from soft delete
                                                            handleDelete(owner.id); 
                                                        }
                                                    }} className="text-red-600 hover:bg-red-50">
                                                        <Trash2 size={16} /> Supprimer
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {owners.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            Aucun propriétaire trouvé.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompteProprietaires;
