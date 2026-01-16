import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { User, Plus, Trash2, Shield, Search, Link2, X, Check, RefreshCw, Ban, Send, MessageCircle, ChevronDown, ChevronUp, Settings, Key, Clock, MoreVertical, Edit3 } from 'lucide-react';

import Alert from './ui/Alert';
import ConfirmModal from './ui/ConfirmModal';

interface PermissionFlags {
    can_view_finances: boolean;
    can_edit_properties: boolean;
    can_manage_tenants: boolean;
    can_manage_contracts: boolean;
    can_validate_payments: boolean;
    can_manage_users: boolean;
    can_delete_data: boolean;
}

interface AssignmentDetail {
    owner_id: number;
    owner_name?: string;
    role: string;
    permissions: PermissionFlags;
    is_active?: boolean;
}

interface UserData {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    role: string;
    statut?: string;
}

interface Owner {
    id: number;
    nom: string;
    type_proprietaire?: string;
}

// Assignment interface removed.

const CompteUtilisateurs: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Ajout de l'état pour le modal de confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'danger' | 'warning' | 'info';
        title: string;
        message: string;
        confirmLabel: string;
        action: () => Promise<void>;
    }>({ 
        isOpen: false, 
        type: 'danger', 
        title: '', 
        message: '', 
        confirmLabel: 'Confirmer',
        action: async () => {} 
    });
    const [modalLoading, setModalLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [assignmentsMap, setAssignmentsMap] = useState<Map<number, AssignmentDetail>>(new Map());
    const [expandedOwnerId, setExpandedOwnerId] = useState<number | null>(null);
    
    // Form state
    const [creationMode, setCreationMode] = useState<'invite' | 'direct'>('invite');
    const [invitationLink, setInvitationLink] = useState<string | null>(null);

    // Form state
    const [newUser, setNewUser] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        password: '',
        role: 'gestionnaire',
        access_scope: 'assigned'
    });

    // Guest Access State
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestForm, setGuestForm] = useState({ nom: '', prenom: '', telephone: '', durationDays: 7, role: 'comptable' });
    const [generatedKey, setGeneratedKey] = useState<{ key: string, expiresAt: string } | null>(null);

    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await accountApi.createGuestAccess(guestForm);
            setGeneratedKey({ key: res.accessKey, expiresAt: res.expiresAt });
            setSuccess("Clé d'accès générée avec succès !");
            loadUsers(); // Refresh list to see the guest
        } catch (err: any) {
            setError(err.message || "Erreur lors de la génération de la clé.");
        }
    };

    const copyKey = () => {
        if (generatedKey) {
            navigator.clipboard.writeText(generatedKey.key);
            alert("Clé copiée !");
        }
    };

    useEffect(() => {
        loadUsers();
        loadOwners();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await accountApi.getUsers();
            setUsers(data);
        } catch (err) {
            setError("Impossible de charger les utilisateurs.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadOwners = async () => {
        try {
            const data = await accountApi.getProprietaires();
            setOwners(data);
        } catch (err) {
            console.error('Error loading owners:', err);
        }
    };

    // Fonction générique pour exécuter l'action du modal
    const executeModalAction = async () => {
        setModalLoading(true);
        try {
            await confirmModal.action();
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
            console.error(err);
        } finally {
            setModalLoading(false);
        }
    };

    const handleSuspend = (id: number) => {
        setConfirmModal({
            isOpen: true,
            type: 'warning',
            title: 'Suspendre l\'utilisateur',
            message: 'Cet utilisateur ne pourra plus accéder à la plateforme. Vous pourrez le réactiver plus tard. Voulez-vous continuer ?',
            confirmLabel: 'Suspendre',
            action: async () => {
                try {
                    await accountApi.suspendUser(id);
                    const updatedUsers = users.map(u => u.id === id ? { ...u, statut: 'Suspendu' } : u);
                    setUsers(updatedUsers);
                    setSuccess("Utilisateur suspendu avec succès.");
                } catch (err) {
                    setError("Erreur lors de la suspension.");
                    throw err;
                }
            }
        });
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: 'Supprimer définitivement',
            message: '⚠️ ATTENTION : Cette action est IRRÉVERSIBLE. L\'utilisateur et toutes ses données associées seront définitivement effacés. Voulez-vous vraiment supprimer cet utilisateur ?',
            confirmLabel: 'Supprimer définitivement',
            action: async () => {
                try {
                    await accountApi.deleteUser(id);
                    setUsers(users.filter(u => u.id !== id));
                    setSuccess("Utilisateur supprimé définitivement.");
                } catch (err) {
                    setError("Erreur lors de la suppression.");
                    throw err;
                }
            }
        });
    };

    const handleReactivate = (id: number) => {
        setConfirmModal({
            isOpen: true,
            type: 'info',
            title: 'Réactiver l\'utilisateur',
            message: 'L\'utilisateur retrouvera ses accès à la plateforme. Confirmer la réactivation ?',
            confirmLabel: 'Réactiver',
            action: async () => {
                try {
                    await accountApi.reactivateUser(id);
                    const updatedUsers = users.map(u => u.id === id ? { ...u, statut: 'Actif' } : u);
                    setUsers(updatedUsers);
                    setSuccess("Utilisateur réactivé avec succès.");
                } catch (err) {
                    setError("Erreur lors de la réactivation.");
                    throw err;
                }
            }
        });
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (creationMode === 'invite') {
                const res = await accountApi.inviteUser(newUser);
                setInvitationLink(res.link);
                setSuccess("Invitation générée avec succès !");
                // Don't close modal yet, show link
            } else {
                await accountApi.createUser(newUser);
                setShowAddModal(false);
                setSuccess("Utilisateur créé avec succès.");
                setNewUser({ nom: '', prenom: '', email: '', telephone: '', password: '', role: 'gestionnaire', access_scope: 'assigned' });
                loadUsers();
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de la création.");
        }
    };
    
    const copyLink = () => {
        if (invitationLink) {
            navigator.clipboard.writeText(invitationLink);
            alert("Lien copié !");
        }
    };

    const shareWhatsApp = () => {
        if (invitationLink && newUser.telephone) {
            const message = `Bonjour ${newUser.prenom}, voici ton lien d'invitation pour rejoindre HopeGestion: ${invitationLink}`;
            const url = `https://wa.me/${newUser.telephone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        }
    };

    const openAssignModal = async (user: UserData) => {
        setSelectedUser(user);
        try {
            const currentAssignments = await accountApi.getUserAssignments(user.id);
            // Convert to Map
            const newMap = new Map<number, AssignmentDetail>();
            currentAssignments.forEach((a: any) => {
                newMap.set(a.owner_id, {
                    owner_id: a.owner_id,
                    role: a.role || 'viewer',
                    owner_name: a.owner_name,
                    permissions: {
                        can_view_finances: a.can_view_finances || false,
                        can_edit_properties: a.can_edit_properties || false,
                        can_manage_tenants: a.can_manage_tenants || false,
                        can_manage_contracts: a.can_manage_contracts || false,
                        can_validate_payments: a.can_validate_payments || false,
                        can_manage_users: a.can_manage_users || false,
                        can_delete_data: a.can_delete_data || false
                    }
                });
            });
            setAssignmentsMap(newMap);
            setShowAssignModal(true);
        } catch (err) {
            setError("Erreur chargement des affectations.");
        }
    };

    const toggleOwnerAssignment = (ownerId: number) => {
        const newMap = new Map(assignmentsMap);
        if (newMap.has(ownerId)) {
            newMap.delete(ownerId);
        } else {
            newMap.set(ownerId, {
                owner_id: ownerId,
                role: 'gestionnaire',
                permissions: {
                    can_view_finances: true,
                    can_edit_properties: true,
                    can_manage_tenants: true,
                    can_manage_contracts: true,
                    can_validate_payments: false,
                    can_manage_users: false,
                    can_delete_data: false
                }
            });
        }
        setAssignmentsMap(newMap);
    };

    const updateAssignmentRole = (ownerId: number, role: string) => {
        const newMap = new Map(assignmentsMap);
        const current = newMap.get(ownerId);
        if (current) {
            // Apply role defaults here if needed
            let defaults = { ...current.permissions };
            if (role === 'admin' || role === 'manager') {
                 defaults = { 
                     can_view_finances: true, can_edit_properties: true, can_manage_tenants: true, 
                     can_manage_contracts: true, can_validate_payments: true, can_manage_users: true, can_delete_data: false 
                 };
            } else if (role === 'comptable') {
                 defaults = { 
                     can_view_finances: true, can_edit_properties: false, can_manage_tenants: true, 
                     can_manage_contracts: true, can_validate_payments: false, can_manage_users: false, can_delete_data: false 
                 };
            } else if (role === 'viewer') {
                 defaults = { 
                     can_view_finances: true, can_edit_properties: false, can_manage_tenants: true, 
                     can_manage_contracts: false, can_validate_payments: false, can_manage_users: false, can_delete_data: false 
                 };
            }
            newMap.set(ownerId, { ...current, role, permissions: defaults });
            setAssignmentsMap(newMap);
        }
    };

    const togglePermission = (ownerId: number, key: keyof PermissionFlags) => {
        const newMap = new Map(assignmentsMap);
        const current = newMap.get(ownerId);
        if (current) {
            newMap.set(ownerId, {
                ...current,
                permissions: { ...current.permissions, [key]: !current.permissions[key] }
            });
            setAssignmentsMap(newMap);
        }
    };

    const saveAssignments = async () => {
        if (!selectedUser) return;
        try {
            const payload = Array.from(assignmentsMap.values()).map(a => ({
                owner_id: a.owner_id,
                role: a.role,
                permissions: a.permissions
            }));
            await accountApi.bulkUpdateAssignments(selectedUser.id, payload);
            setSuccess(`Affectations mises à jour pour ${selectedUser.prenom} ${selectedUser.nom}`);
            setShowAssignModal(false);
        } catch (err) {
            setError("Erreur lors de la sauvegarde des affectations.");
        }
    };

    if (loading) return <div className="p-8 text-center">Chargement des utilisateurs...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Gestion des Utilisateurs</h2>
                    <p className="text-gray-500 text-sm">Gérez les accès et affectations à votre agence</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Nouvel Utilisateur
                </button>
                <button 
                    onClick={() => { setShowGuestModal(true); setGeneratedKey(null); setGuestForm({ nom: '', prenom: '', telephone: '', durationDays: 7, role: 'comptable' }); }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition ml-2"
                >
                    <Key size={18} /> Accès Invité (Clé)
                </button>
            </div>

            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-semibold">Utilisateur</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Rôle</th>
                            <th className="p-4 font-semibold">Affectation</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map((user) => (
                            <tr key={user.id} className={`transition border-b border-gray-100 ${
                                user.statut === 'Suspendu' 
                                    ? 'bg-orange-50/60 hover:bg-orange-100/50' 
                                    : 'hover:bg-gray-50'
                            }`}>
                                <td className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                        {user.prenom?.[0]}{user.nom?.[0]}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{user.prenom} {user.nom}</div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                        user.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.role !== 'admin' && (
                                        <button 
                                            onClick={() => openAssignModal(user)}
                                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                                        >
                                            <Link2 size={14} /> Gérer
                                        </button>
                                    )}
                                    {user.role === 'admin' && (
                                        <span className="text-xs text-gray-400 italic">Accès total</span>
                                    )}
                                </td>
                                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="dropdown dropdown-end">
                                        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle">
                                            <MoreVertical size={18} className="text-gray-500" />
                                        </div>
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-white rounded-box w-52 border border-gray-100">
                                            {user.role !== 'admin' && (
                                                <li>
                                                    <a onClick={() => openAssignModal(user)} className="text-gray-700 hover:text-blue-600 hover:bg-blue-50">
                                                        <Link2 size={16} /> Gérer les accès
                                                    </a>
                                                </li>
                                            )}
                                            {user.statut === 'Suspendu' ? (
                                                <li>
                                                    <a onClick={() => handleReactivate(user.id)} className="text-green-600 hover:bg-green-50">
                                                        <RefreshCw size={16} /> Réactiver
                                                    </a>
                                                </li>
                                            ) : (
                                                <li>
                                                    <a onClick={() => handleSuspend(user.id)} className="text-orange-600 hover:bg-orange-50">
                                                        <Ban size={16} /> Suspendre
                                                    </a>
                                                </li>
                                            )}
                                            <li>
                                                <a onClick={() => {
                                                    if (window.confirm('⚠️ ATTENTION : Cette action est IRRÉVERSIBLE. Supprimer définitivement cet utilisateur ?')) {
                                                        handleDelete(user.id);
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
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    Aucun utilisateur trouvé.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Confirmation Animé */}
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={executeModalAction}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmLabel={confirmModal.confirmLabel}
                isLoading={modalLoading}
            />

            {/* Modal Ajout */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4">Ajouter un utilisateur</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            {/* Mode Selection */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => { setCreationMode('invite'); setInvitationLink(null); }}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${creationMode === 'invite' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    Invitation (Recommandé)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCreationMode('direct')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${creationMode === 'direct' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    Création Directe
                                </button>
                            </div>

                            {!invitationLink ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input 
                                            placeholder="Prénom" 
                                            className="p-2 border rounded-lg w-full"
                                            value={newUser.prenom}
                                            onChange={e => setNewUser({...newUser, prenom: e.target.value})}
                                            required
                                        />
                                        <input 
                                            placeholder="Nom" 
                                            className="p-2 border rounded-lg w-full"
                                            value={newUser.nom}
                                            onChange={e => setNewUser({...newUser, nom: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <input 
                                        type="tel"
                                        placeholder="Téléphone (WhatsApp)" 
                                        className="p-2 border rounded-lg w-full"
                                        value={newUser.telephone}
                                        onChange={e => setNewUser({...newUser, telephone: e.target.value})}
                                        required
                                    />
                                    <input 
                                        type="email"
                                        placeholder="Email (Optionnel)" 
                                        className="p-2 border rounded-lg w-full"
                                        value={newUser.email}
                                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                                    />
                                    
                                    {creationMode === 'direct' && (
                                        <input 
                                            type="password"
                                            placeholder="Mot de passe" 
                                            className="p-2 border rounded-lg w-full"
                                            value={newUser.password}
                                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                                            required
                                        />
                                    )}

                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Rôle</label>
                                        <select 
                                            className="p-2 border rounded-lg w-full bg-white"
                                            value={newUser.role}
                                            onChange={e => setNewUser({...newUser, role: e.target.value})}
                                        >
                                            <option value="gestionnaire">Gestionnaire (Interne)</option>
                                            <option value="manager">Manager (Agence)</option>
                                            <option value="comptable">Comptable</option>
                                            <option value="agent_recouvreur">Agent Recouvreur</option>
                                            <option value="prestataire">Partenaire de Services</option>
                                        </select>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button 
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Annuler
                                        </button>
                                        <button 
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            {creationMode === 'invite' ? <Send size={16}/> : <Plus size={16}/>}
                                            {creationMode === 'invite' ? 'Générer Invitation' : 'Créer'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4 animate-fade-in text-center">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <Check size={32} className="mx-auto text-green-500 mb-2"/>
                                        <h4 className="text-green-800 font-bold">Invitation Prête !</h4>
                                        <p className="text-green-700 text-sm mb-4">Partagez ce lien avec l'utilisateur.</p>
                                        
                                        <div className="flex gap-2 mb-4">
                                            <input 
                                                readOnly 
                                                value={invitationLink} 
                                                className="flex-1 p-2 text-sm border rounded bg-white text-gray-600"
                                            />
                                            <button onClick={copyLink} className="p-2 bg-gray-200 rounded hover:bg-gray-300">
                                                <Link2 size={16}/>
                                            </button>
                                        </div>

                                        <button 
                                            type="button"
                                            onClick={shareWhatsApp}
                                            className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition"
                                        >
                                            <MessageCircle size={18}/> Envoyer par WhatsApp
                                        </button>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => { setShowAddModal(false); setInvitationLink(null); loadUsers(); }}
                                        className="text-gray-500 hover:underline text-sm"
                                    >
                                        Fermer et Rafraîchir
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Affectation */}
            {showAssignModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-scale-in max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold">Affectation aux Propriétaires</h3>
                                <p className="text-sm text-gray-500">
                                    {selectedUser.prenom} {selectedUser.nom} ({selectedUser.role})
                                </p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                            Cochez les propriétaires que cet utilisateur peut gérer.
                        </p>

                        <div className="flex-1 overflow-y-auto border rounded-lg divide-y bg-gray-50">
                            {owners.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    Aucun propriétaire disponible.
                                </div>
                            )}
                            {owners.map(owner => {
                                const isAssigned = assignmentsMap.has(owner.id);
                                const assignment = assignmentsMap.get(owner.id);
                                const isExpanded = expandedOwnerId === owner.id;

                                return (
                                    <div key={owner.id} className={`transition-colors ${isAssigned ? 'bg-white' : ''}`}>
                                        <div className="flex items-center gap-3 p-3">
                                            <input 
                                                type="checkbox"
                                                checked={isAssigned}
                                                onChange={() => toggleOwnerAssignment(owner.id)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{owner.nom}</div>
                                                <div className="text-xs text-gray-400 capitalize">{owner.type_proprietaire}</div>
                                            </div>
                                            
                                            {isAssigned && assignment && (
                                                <div className="flex items-center gap-2">
                                                     <select 
                                                        className="text-xs border rounded p-1 bg-gray-50"
                                                        value={assignment.role}
                                                        onChange={(e) => updateAssignmentRole(owner.id, e.target.value)}
                                                    >
                                                        <option value="gestionnaire">Gestionnaire</option>
                                                        <option value="manager">Manager</option>
                                                        <option value="comptable">Comptable</option>
                                                        <option value="agent_recouvreur">Agent Recouvreur</option>
                                                        <option value="viewer">Lecteur</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => setExpandedOwnerId(isExpanded ? null : owner.id)}
                                                        className={`p-1 rounded-md hover:bg-gray-100 ${isExpanded ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
                                                        title="Paramètres avancés"
                                                    >
                                                        <Settings size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded Permission Matrix */}
                                        {isAssigned && isExpanded && assignment && (
                                            <div className="px-4 pb-4 animate-fade-in pl-10">
                                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 grid grid-cols-2 gap-2 text-xs">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={assignment.permissions.can_view_finances} 
                                                            onChange={() => togglePermission(owner.id, 'can_view_finances')} />
                                                        <span>Voir Finances</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={assignment.permissions.can_edit_properties} 
                                                            onChange={() => togglePermission(owner.id, 'can_edit_properties')} />
                                                        <span>Éditer Biens</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={assignment.permissions.can_manage_tenants} 
                                                            onChange={() => togglePermission(owner.id, 'can_manage_tenants')} />
                                                        <span>Gérer Locataires</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={assignment.permissions.can_validate_payments} 
                                                            onChange={() => togglePermission(owner.id, 'can_validate_payments')} />
                                                        <span>Valider Paiements</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={assignment.permissions.can_delete_data} 
                                                            onChange={() => togglePermission(owner.id, 'can_delete_data')} />
                                                        <span className="text-red-500">Supprimer Données</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-500">
                                {assignmentsMap.size} propriétaire(s) sélectionné(s)
                            </span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={saveAssignments}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Check size={16} /> Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Guest Access */}
            {showGuestModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Key className="text-emerald-500" /> Générer Accès Invité
                            </h3>
                            <button onClick={() => setShowGuestModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>

                        {!generatedKey ? (
                            <form onSubmit={handleCreateGuest} className="space-y-4">
                                <div className="bg-emerald-50 p-3 rounded-lg text-sm text-emerald-800 border border-emerald-100 mb-4">
                                    Crée un accès temporaire via une clé unique. Les permissions sont définies par le rôle sélectionné.
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <input 
                                        placeholder="Prénom" 
                                        className="p-2 border rounded-lg w-full"
                                        value={guestForm.prenom}
                                        onChange={e => setGuestForm({...guestForm, prenom: e.target.value})}
                                    />
                                    <input 
                                        placeholder="Nom" 
                                        className="p-2 border rounded-lg w-full"
                                        value={guestForm.nom}
                                        onChange={e => setGuestForm({...guestForm, nom: e.target.value})}
                                        required
                                    />
                                </div>
                                <input 
                                    placeholder="Téléphone (Optionnel)" 
                                    className="p-2 border rounded-lg w-full"
                                    value={guestForm.telephone}
                                    onChange={e => setGuestForm({...guestForm, telephone: e.target.value})}
                                />
                                
                                {/* NEW: Role Selector */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                        <Shield size={12}/> Rôle de l'invité
                                    </label>
                                    <select 
                                        className="p-2 border rounded-lg w-full bg-white"
                                        value={guestForm.role}
                                        onChange={e => setGuestForm({...guestForm, role: e.target.value})}
                                    >
                                        <option value="comptable">Comptable (Finances uniquement)</option>
                                        <option value="gestionnaire">Gestionnaire (Accès complet)</option>
                                        <option value="manager">Manager (Supervision)</option>
                                        <option value="agent_recouvreur">Agent Recouvreur</option>
                                        <option value="viewer">Lecteur (Consultation)</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Les permissions seront appliquées automatiquement selon le rôle.
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                        <Clock size={12}/> Durée de validité
                                    </label>
                                    <select 
                                        className="p-2 border rounded-lg w-full bg-white"
                                        value={guestForm.durationDays}
                                        onChange={e => setGuestForm({...guestForm, durationDays: parseInt(e.target.value)})}
                                    >
                                        <option value={1}>24 Heures</option>
                                        <option value={3}>3 Jours</option>
                                        <option value={7}>1 Semaine</option>
                                        <option value={30}>1 Mois</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button 
                                        type="button"
                                        onClick={() => setShowGuestModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                                    >
                                        <Key size={16}/> Générer la Clé
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center space-y-4 animate-fade-in">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                    <Key size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-800">Clé d'Accès Générée !</h4>
                                <p className="text-gray-500 text-sm">Transmettez cette clé à votre invité.</p>
                                
                                <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mt-4 relative group">
                                    <div className="font-mono text-2xl tracking-widest text-center font-bold text-gray-800">
                                        {generatedKey.key}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Expire le : {new Date(generatedKey.expiresAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <button 
                                    onClick={copyKey}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                                >
                                    <Link2 size={18}/> Copier la Clé
                                </button>
                                
                                <button 
                                    onClick={() => { setShowGuestModal(false); setGeneratedKey(null); }}
                                    className="text-gray-400 hover:text-gray-600 text-sm mt-2"
                                >
                                    Fermer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompteUtilisateurs;

