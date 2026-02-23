import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { User, Plus, Trash2, MoreVertical, Edit3, Ban, Columns } from 'lucide-react';
import Alert from './ui/Alert';
import ProprietaireForm from './proprietaires/ProprietaireForm';

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
        adresse: true,
        gestion: true
    });
    
    
    // Form state
    const [editingProp, setEditingProp] = useState<any>({
        type: 'individual',
        management_mode: 'direct',
        name: '',
        prenom: '',
        phone: '',
        secondary_phone: '',
        email: '',
        address: '',
        country: 'Bénin',
        company_name: '',
        rccm_number: '',
        mobile_money: '',
        delegation_start_date: '',
        delegation_end_date: '',
        photo_url: '' 
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

    const handleEdit = (owner: any) => {
        setEditingProp({
            ...owner,
            name: owner.nom || owner.name,
            prenom: owner.prenom || '',
            company_name: owner.company_name || (owner.type === 'company' ? owner.nom : ''),
            rccm_number: owner.rccm_number || owner.rccmNumber || '',
            mobile_money: owner.mobile_money || owner.mobileMoney || '',
            delegation_start_date: owner.delegation_start_date || '',
            delegation_end_date: owner.delegation_end_date || '',
            secondary_phone: owner.secondary_phone || owner.telephoneSecondaire || '',
            photo_url: owner.photo_url || owner.photo || ''
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
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.adresse} onChange={(e) => setVisibleColumns({...visibleColumns, adresse: e.target.checked})}/> Adresse</label></li>
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
                <ProprietaireForm
                  owner={editingProp}
                  onSave={async (data) => {
                    try {
                      await accountApi.saveProprietaire(data);
                      setShowForm(false);
                      setEditingProp({ type: 'individual', management_mode: 'direct', name: '', phone: '', email: '', address: '' });
                      await loadOwners(); // Await to catch potential error
                      // Success - no error set
                    } catch (err: any) {
                      console.error('Error saving owner:', err);
                      setError(err.message || "Erreur lors de l'enregistrement.");
                    }
                  }}
                  onCancel={() => setShowForm(false)}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                            <tr>
                                <th className="p-4 font-semibold">Propriétaire</th>
                                {visibleColumns.type && <th className="p-4 font-semibold hidden md:table-cell">Type</th>}
                                {visibleColumns.contact && <th className="p-4 font-semibold">Contact</th>}
                                {visibleColumns.adresse && <th className="p-4 font-semibold hidden md:table-cell">Adresse</th>}
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
                                    {visibleColumns.adresse && (
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="text-sm text-gray-600">{owner.adresse || owner.address || owner.ville || owner.city || '-'}</div>
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
