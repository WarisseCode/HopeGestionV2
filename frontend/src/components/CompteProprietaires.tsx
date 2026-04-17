import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import {
  User, Plus, Trash2, MoreVertical, Edit3, Ban, Columns, Filter, X,
  Search, Building2, UserPlus, Users, Phone, Mail, MapPin, Send
} from 'lucide-react';
import InvitationLinkModal from './ui/InvitationLinkModal';
import Alert from './ui/Alert';
import Card from './ui/Card';
import ProprietaireForm from './proprietaires/ProprietaireForm';
import { useMobile } from '../hooks/useMobile';
import toast from 'react-hot-toast';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import ConfirmModal from './ui/ConfirmModal';

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
    id_number?: string;
    mobile_money?: string;
    management_mode?: 'direct' | 'delegated';
    total_properties?: number;
    total_lots?: number;
    photo_url?: string;
    phone_secondary?: string;
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
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'individual' | 'company'>('all');
    const [filterMode, setFilterMode] = useState<'all' | 'direct' | 'delegated'>('all');

    const [visibleColumns, setVisibleColumns] = useState({
        type: true,
        contact: true,
        adresse: true,
        gestion: true
    });
    
    const [editingProp, setEditingProp] = useState<any>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [inviteTarget, setInviteTarget] = useState<{ id: number; name: string } | null>(null);

    // Confirm Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'danger' | 'warning' | 'info';
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'danger',
        action: async () => {}
    });

    useEffect(() => {
        loadOwners();
        loadSubscription();
    }, []);

    const loadSubscription = async () => {
        try {
            const status = await getSubscriptionStatus();
            setSubscriptionStatus(status);
        } catch (error) {
            console.error('Erreur lors du chargement du statut abonnement', error);
        }
    };

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
                rccm_number: o.id_number || o.rccm_number || o.rccmNumber || '',
                id_number: o.id_number || o.numeroPiece || '',
                mobile_money: o.mobile_money || o.mobileMoney || '',
                management_mode: o.management_mode || o.modeGestion || 'direct',
                total_properties: o.total_properties || 0,
                total_lots: o.total_lots || 0,
                photo_url: o.photo_url || o.photo || '',
                phone_secondary: o.phone_secondary || o.telephoneSecondaire || ''
            }));
            
            setOwners(mapped);
        } catch (err) {
            toast.error("Impossible de charger les propriétaires.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Désactiver ce propriétaire',
            message: 'Êtes-vous sûr de vouloir désactiver ce propriétaire ? Il n\'aura plus accès à la plateforme.',
            type: 'warning',
            action: async () => {
                try {
                    await accountApi.deleteProprietaire(id);
                    setOwners(owners.filter(o => o.id !== id));
                    toast.success("Propriétaire désactivé avec succès.");
                } catch (err) {
                    toast.error("Erreur lors de la désactivation.");
                }
            }
        });
    };

    const handleEdit = (owner: Owner) => {
        setEditingProp({
            ...owner,
            prenom: owner.first_name, 
            photo_url: owner.photo_url,
            secondary_phone: owner.phone_secondary || '',
            id_number: owner.id_number || owner.rccm_number || ''
        });
        setShowForm(true);
    };

    const filteredOwners = owners.filter(o => {
        // Filtre texte
        const search = searchTerm.toLowerCase();
        const fullName = `${o.name} ${o.first_name}`.toLowerCase();
        const company = (o.company_name || '').toLowerCase();
        const matchesSearch = fullName.includes(search) || 
               company.includes(search) || 
               o.email.toLowerCase().includes(search) || 
               o.phone.includes(search);
        
        if (!matchesSearch) return false;

        // Filtre Type
        if (filterType !== 'all' && o.type !== filterType) return false;

        // Filtre Mode Gestion
        if (filterMode !== 'all' && o.management_mode !== filterMode) return false;

        return true;
    });

    const activeFiltersCount = (filterType !== 'all' ? 1 : 0) + (filterMode !== 'all' ? 1 : 0);

    // Déterminer si l'aide au blocage Multi-Agences s'applique
    const isEnterprisePlan = subscriptionStatus?.plan?.name?.toLowerCase().includes('entreprise');
    const hasReachedAgencyLimit = Boolean(!isEnterprisePlan && (subscriptionStatus?.usage?.current_agencies ?? 0) >= 1);

    if (loading) return <div className="p-8 text-center text-base-content/60">Chargement des propriétaires...</div>;

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
                    <h2 className="text-lg font-bold text-base-content/90">{title}</h2>
                    <p className="text-base-content/60 text-sm">{subtitle}</p>
                </div>
                
                {!showForm && (
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={18} />
                            <input 
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input input-sm input-bordered w-full pl-10 focus:ring-1 focus:ring-primary h-10"
                            />
                        </div>

                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className={`btn btn-sm gap-2 h-10 border shadow-sm ${activeFiltersCount > 0 ? 'btn-primary border-primary' : 'bg-base-100 border-base-300 text-base-content/80'}`}>
                                <Filter size={18} />
                                <span className="hidden sm:inline">Filtres</span>
                                {activeFiltersCount > 0 && (
                                    <span className="badge badge-xs badge-white text-primary font-bold p-1 px-1.5">{activeFiltersCount}</span>
                                )}
                            </div>
                            <div tabIndex={0} className="dropdown-content z-[20] menu p-4 shadow-xl bg-base-100 rounded-xl w-72 border border-base-300 mt-2">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-sm">Filtres avancés</h3>
                                    {activeFiltersCount > 0 && (
                                        <button 
                                            onClick={() => {
                                                setFilterType('all');
                                                setFilterMode('all');
                                            }}
                                            className="text-[10px] text-primary hover:underline font-bold uppercase"
                                        >
                                            Réinitialiser
                                        </button>
                                    )}
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-base-content/50">Type de propriétaire</label>
                                        <div className="flex bg-base-300 p-1 rounded-lg">
                                            <button 
                                                onClick={() => setFilterType('all')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterType === 'all' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Tous
                                            </button>
                                            <button 
                                                onClick={() => setFilterType('individual')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterType === 'individual' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Particulier
                                            </button>
                                            <button 
                                                onClick={() => setFilterType('company')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterType === 'company' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Entreprise
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-base-content/50">Mode de gestion</label>
                                        <div className="flex bg-base-300 p-1 rounded-lg">
                                            <button 
                                                onClick={() => setFilterMode('all')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterMode === 'all' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Tous
                                            </button>
                                            <button 
                                                onClick={() => setFilterMode('direct')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterMode === 'direct' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Directe
                                            </button>
                                            <button 
                                                onClick={() => setFilterMode('delegated')}
                                                className={`flex-1 py-1.5 text-xs rounded-md transition ${filterMode === 'delegated' ? 'bg-base-100 shadow-sm font-bold text-primary' : 'text-base-content/60 hover:text-base-content/80'}`}
                                            >
                                                Déléguée
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-sm bg-base-100 border border-base-300 gap-2 h-10 shadow-sm text-base-content/80">
                                <Columns size={18} />
                                <span className="hidden sm:inline">Colonnes</span>
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-300">
                                <li className="menu-title">
                                    <span className="text-xs font-bold uppercase text-base-content/60">Afficher</span>
                                </li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.type} onChange={(e) => setVisibleColumns({...visibleColumns, type: e.target.checked})}/> Type</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.contact} onChange={(e) => setVisibleColumns({...visibleColumns, contact: e.target.checked})}/> Contact</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.adresse} onChange={(e) => setVisibleColumns({...visibleColumns, adresse: e.target.checked})}/> Adresse</label></li>
                                <li><label className="cursor-pointer"><input type="checkbox" className="checkbox checkbox-xs" checked={visibleColumns.gestion} onChange={(e) => setVisibleColumns({...visibleColumns, gestion: e.target.checked})}/> Mode Gestion</label></li>
                            </ul>
                        </div>

                        <div className="tooltip tooltip-left" data-tip={hasReachedAgencyLimit ? "Passez au plan Entreprise pour gérer plusieurs agences" : "Créer une nouvelle agence / propriétaire"}>
                            <button 
                                onClick={() => {
                                    if(hasReachedAgencyLimit) return;
                                    setEditingProp(null);
                                    setShowForm(true);
                                }}
                                disabled={hasReachedAgencyLimit}
                                className={`btn btn-sm gap-2 h-10 shadow-sm ${hasReachedAgencyLimit ? 'btn-disabled opacity-50 bg-base-300' : 'btn-primary'}`}
                            >
                                <Plus size={18} /> 
                                <span className="hidden sm:inline">Nouveau</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showForm ? (
                <ProprietaireForm
                  owner={editingProp || undefined}
                  onSave={async (data) => {
                    try {
                      await accountApi.saveProprietaire(data);
                      setShowForm(false);
                      setEditingProp(null);
                      toast.success(data.id ? "Propriétaire modifié avec succès" : "Propriétaire créé avec succès");
                      await loadOwners();
                    } catch (err: any) {
                      console.error('Error saving owner:', err);
                      toast.error(err.message || "Erreur lors de l'enregistrement.");
                    }
                  }}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingProp(null);
                  }}
                />
            ) : (
                <div className="bg-base-100 rounded-xl shadow-sm border border-base-200 overflow-hidden">
                    {filteredOwners.length === 0 ? (
                        <div className="p-12 text-center text-base-content/50">
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
                                <thead className="bg-base-200 text-base-content/70 text-xs uppercase tracking-wider">
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
                                        <tr key={owner.id} className="hover:bg-base-200/50 transition cursor-pointer" onClick={() => handleEdit(owner)}>
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
                                                        <div className="font-semibold text-base-content leading-none mb-1">
                                                            {owner.type === 'company' 
                                                                ? (owner.company_name || owner.name)
                                                                : `${owner.name} ${owner.first_name || ''}`}
                                                        </div>
                                                        <div className="text-[10px] text-base-content/50 font-medium">
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
                                                        <span className="flex items-center gap-1.5 text-xs text-base-content/80 font-medium">
                                                            <Phone size={12} className="text-base-content/50"/> {owner.phone}
                                                        </span>
                                                        {owner.email && (
                                                            <span className="flex items-center gap-1.5 text-[11px] text-base-content/50 truncate max-w-[150px]">
                                                                <Mail size={12} className="text-base-content/40"/> {owner.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.adresse && (
                                                <td className="p-4 hidden lg:table-cell">
                                                    <div className="flex items-start gap-1.5 text-xs text-base-content/70 max-w-[200px]">
                                                        <MapPin size={12} className="text-base-content/50 mt-0.5 shrink-0"/>
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
                                                    <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-circle bg-base-200 hover:bg-base-300">
                                                        <MoreVertical size={14} className="text-base-content/60" />
                                                    </div>
                                                    <ul tabIndex={0} className="dropdown-content z-[2] menu p-2 shadow-xl bg-base-100 rounded-xl w-52 border border-base-200">
                                                        <li>
                                                            <a onClick={() => handleEdit(owner)} className="text-base-content/80 hover:text-primary py-2.5">
                                                                <Edit3 size={16} /> <span className="font-medium">Modifier</span>
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a onClick={() => setInviteTarget({ id: owner.id, name: `${owner.first_name || ''} ${owner.name}`.trim() })} className="text-blue-600 hover:bg-blue-50 py-2.5">
                                                                <Send size={16} /> <span className="font-medium">Inviter</span>
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a onClick={() => handleDelete(owner.id)} className="text-base-content/80 hover:text-warning py-2.5">
                                                                <Ban size={16} /> <span className="font-medium">Désactiver</span>
                                                            </a>
                                                        </li>
                                                        <div className="divider my-1 opacity-50"></div>
                                                        <li>
                                                            <a onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmConfig({
                                                                    isOpen: true,
                                                                    title: 'Suppression irréversible',
                                                                    message: '⚠️ ATTENTION : La suppression d\'un propriétaire est irréversible et disssocie tous ses biens. Confirmer ?',
                                                                    type: 'danger',
                                                                    action: async () => {
                                                                        try {
                                                                            await accountApi.deleteProprietaire(owner.id); // Assuming same endpoint for force delete
                                                                            setOwners(owners.filter(o => o.id !== owner.id));
                                                                            toast.success("Propriétaire supprimé.");
                                                                        } catch(err) {
                                                                            toast.error("Erreur lors de la suppression.");
                                                                        }
                                                                    }
                                                                });
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

            {/* Dynamic Confirm Modal */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmConfig.action();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmConfig.title}
                message={confirmConfig.message}
                type={confirmConfig.type}
            />

            <InvitationLinkModal
                isOpen={!!inviteTarget}
                onClose={() => setInviteTarget(null)}
                type="owner"
                entityId={inviteTarget?.id ?? 0}
                entityName={inviteTarget?.name ?? ''}
            />
        </div>
    );
};

export default CompteProprietaires;

