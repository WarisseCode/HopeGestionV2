import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { 
  User, Plus, Trash2, MoreVertical, Edit3, Ban, Columns, 
  Search, Building2, UserPlus, Users, Phone, Mail, MapPin 
} from 'lucide-react';
import Alert from './ui/Alert';
import Card from './ui/Card';
import ProprietaireForm from './proprietaires/ProprietaireForm';
import { useMobile } from '../hooks/useMobile';

interface Owner {
    id: number;
    name: string;
    first_name?: string;
    type: 'individual' | 'company';
    phone: string;
    email: string;
    address: string;
    city?: string;
    company_name?: string;
    rccm_number?: string;
    mobile_money?: string;
    management_mode?: 'direct' | 'delegated';
    total_properties?: number;
    total_lots?: number;
    photo_url?: string;
}

interface CompteProprietairesProps {
    showStats?: boolean;
    title?: string;
    subtitle?: string;
}

const CompteProprietaires: React.FC<CompteProprietairesProps> = ({
    showStats = false,
    title = "Gestion des Propriétaires",
    subtitle = "Gérez les propriétaires et leurs mandats"
}) => {
    const isMobile = useMobile();
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [visibleColumns, setVisibleColumns] = useState({
        type: true,
        contact: true,
        adresse: true,
        gestion: true
    });
    
    const [editingProp, setEditingProp] = useState<any>(null);

    useEffect(() => {
        loadOwners();
    }, []);

    const loadOwners = async () => {
        try {
            setLoading(true);
            const data = await accountApi.getProprietaires();
            
            // Harmoniser le mapping pour supporter les deux formats (backend/frontend)
            const mapped: Owner[] = data.map((o: any) => ({
                id: o.id,
                type: o.type,
                name: o.nom || o.name || '',
                first_name: o.prenom || o.first_name || '',
                phone: o.telephone || o.phone || '',
                email: o.email || '',
                address: o.adresse || o.address || '',
                city: o.ville || o.city || '',
                company_name: o.company_name || (o.type === 'company' ? (o.nom || o.name) : ''),
                rccm_number: o.rccm_number || o.rccmNumber || '',
                mobile_money: o.mobile_money || o.mobileMoney || '',
                management_mode: o.management_mode || o.modeGestion || 'direct',
                total_properties: o.total_properties || 0,
                total_lots: o.total_lots || 0,
                photo_url: o.photo_url || o.photo || ''
            }));
            
            setOwners(mapped);
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

    const handleEdit = (owner: Owner) => {
        setEditingProp({
            ...owner,
            prenom: owner.first_name, // Map back to what form expects if different
            photo_url: owner.photo_url,
            secondary_phone: (owner as any).phone_secondary || (owner as any).telephoneSecondaire || ''
        });
        setShowForm(true);
    };

    const filteredOwners = owners.filter(o => {
        const search = searchTerm.toLowerCase();
        const fullName = `${o.name} ${o.first_name}`.toLowerCase();
        const company = (o.company_name || '').toLowerCase();
        return fullName.includes(search) || 
               company.includes(search) || 
               o.email.toLowerCase().includes(search) || 
               o.phone.includes(search);
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement des propriétaires...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Stats section if enabled */}
            {showStats && !showForm && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-base-content/60">Total propriétaires</p>
                                <p className="text-2xl font-bold">{owners.length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="bg-success/10 text-success rounded-full w-12 h-12 flex items-center justify-center">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-base-content/60">Total biens</p>
                                <p className="text-2xl font-bold">
                                    {owners.reduce((sum, o) => sum + (o.total_properties || 0), 0)}
                                </p>
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="bg-warning/10 text-warning rounded-full w-12 h-12 flex items-center justify-center">
                                <UserPlus size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-base-content/60">Gestion déléguée</p>
                                <p className="text-2xl font-bold">
                                    {owners.filter(o => o.management_mode === 'delegated').length}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                    <p className="text-gray-500 text-sm">{subtitle}</p>
                </div>
                
                {!showForm && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input input-sm input-bordered w-full pl-10 focus:ring-1 focus:ring-primary h-10"
                            />
                        </div>

                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm bg-white border border-gray-200 gap-2 h-10">
                                <Columns size={18} />
                                <span className="hidden sm:inline">Colonnes</span>
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

                        <button 
                            onClick={() => {
                                setEditingProp(null);
                                setShowForm(true);
                            }}
                            className="btn btn-primary btn-sm gap-2 h-10 shadow-sm"
                        >
                            <Plus size={18} /> 
                            <span className="hidden sm:inline">Nouveau</span>
                        </button>
                    </div>
                )}
            </div>

            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

            {showForm ? (
                <ProprietaireForm
                  owner={editingProp || undefined}
                  onSave={async (data) => {
                    try {
                      await accountApi.saveProprietaire(data);
                      setShowForm(false);
                      setEditingProp(null);
                      await loadOwners();
                    } catch (err: any) {
                      console.error('Error saving owner:', err);
                      setError(err.message || "Erreur lors de l'enregistrement.");
                    }
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingProp(null);
                  }}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredOwners.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Users size={48} className="mx-auto mb-4 opacity-20" />
                            <p>Aucun propriétaire trouvé.</p>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="text-primary hover:underline text-sm mt-2">
                                    Effacer la recherche
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 font-semibold">Propriétaire</th>
                                        {visibleColumns.type && <th className="p-4 font-semibold hidden md:table-cell text-center">Type</th>}
                                        {visibleColumns.contact && <th className="p-4 font-semibold">Contact</th>}
                                        {visibleColumns.adresse && <th className="p-4 font-semibold hidden lg:table-cell">Adresse</th>}
                                        {visibleColumns.gestion && <th className="p-4 font-semibold text-center">Mode</th>}
                                        <th className="p-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOwners.map((owner) => (
                                        <tr key={owner.id} className="hover:bg-gray-50/50 transition cursor-pointer" onClick={() => handleEdit(owner)}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center font-bold">
                                                            {owner.photo_url ? (
                                                                <img src={owner.photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                            ) : (
                                                                (owner.name || '?').charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900 leading-none mb-1">
                                                            {owner.type === 'company' 
                                                                ? (owner.company_name || owner.name)
                                                                : `${owner.name} ${owner.first_name || ''}`}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 font-medium">
                                                            ID: #{owner.id.toString().padStart(4, '0')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {visibleColumns.type && (
                                                <td className="p-4 hidden md:table-cell text-center">
                                                    <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                                                        owner.type === 'individual' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                                    }`}>
                                                        {owner.type === 'individual' ? 'Particulier' : 'Entreprise'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleColumns.contact && (
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                                                            <Phone size={12} className="text-gray-400"/> {owner.phone}
                                                        </span>
                                                        {owner.email && (
                                                            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 truncate max-w-[150px]">
                                                                <Mail size={12} className="text-gray-300"/> {owner.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.adresse && (
                                                <td className="p-4 hidden lg:table-cell">
                                                    <div className="flex items-start gap-1.5 text-xs text-gray-600 max-w-[200px]">
                                                        <MapPin size={12} className="text-gray-400 mt-0.5 shrink-0"/>
                                                        <span className="line-clamp-2">{owner.address || owner.city || '-'}</span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.gestion && (
                                                <td className="p-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${
                                                        owner.management_mode === 'delegated'
                                                        ? 'bg-orange-50 text-orange-700 border-orange-100' 
                                                        : 'bg-green-50 text-green-700 border-green-100'
                                                    }`}>
                                                        {owner.management_mode === 'delegated' ? 'Délégué' : 'Direct'}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="dropdown dropdown-end">
                                                    <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-circle bg-gray-50 hover:bg-gray-100">
                                                        <MoreVertical size={14} className="text-gray-500" />
                                                    </div>
                                                    <ul tabIndex={0} className="dropdown-content z-[2] menu p-2 shadow-xl bg-white rounded-xl w-52 border border-base-200">
                                                        <li>
                                                            <a onClick={() => handleEdit(owner)} className="text-gray-700 hover:text-primary py-2.5">
                                                                <Edit3 size={16} /> <span className="font-medium">Modifier</span>
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a onClick={() => handleDelete(owner.id)} className="text-gray-700 hover:text-warning py-2.5">
                                                                <Ban size={16} /> <span className="font-medium">Désactiver</span>
                                                            </a>
                                                        </li>
                                                        <div className="divider my-1 opacity-50"></div>
                                                        <li>
                                                            <a onClick={() => {
                                                                if (window.confirm('⚠️ ATTENTION : Suppression irréversible. Confirmer ?')) {
                                                                    handleDelete(owner.id); 
                                                                }
                                                            }} className="text-error hover:bg-error/5 py-2.5">
                                                                <Trash2 size={16} /> <span className="font-medium">Supprimer</span>
                                                            </a>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CompteProprietaires;

