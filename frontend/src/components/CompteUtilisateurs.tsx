import React, { useState, useEffect } from 'react';
import { accountApi } from '../api/accountApi';
import { User, Plus, Trash2, Shield, Search, Link2, X, Check } from 'lucide-react';
import Alert from './ui/Alert';

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

interface Assignment {
    id: number;
    owner_id: number;
    owner_name: string;
}

const CompteUtilisateurs: React.FC = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [userAssignments, setUserAssignments] = useState<Assignment[]>([]);
    const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);
    
    // Form state
    const [newUser, setNewUser] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        password: '',
        role: 'gestionnaire'
    });

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

    const handleDelete = async (id: number) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            try {
                await accountApi.deleteUser(id);
                setUsers(users.filter(u => u.id !== id));
            } catch (err) {
                setError("Erreur lors de la suppression.");
            }
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await accountApi.createUser(newUser);
            setShowAddModal(false);
            setNewUser({ nom: '', prenom: '', email: '', telephone: '', password: '', role: 'gestionnaire' });
            loadUsers();
        } catch (err) {
            setError("Erreur lors de la création de l'utilisateur.");
        }
    };

    const openAssignModal = async (user: UserData) => {
        setSelectedUser(user);
        try {
            const assignments = await accountApi.getUserAssignments(user.id);
            setUserAssignments(assignments);
            setSelectedOwnerIds(assignments.map((a: Assignment) => a.owner_id));
            setShowAssignModal(true);
        } catch (err) {
            setError("Erreur chargement des affectations.");
        }
    };

    const toggleOwnerSelection = (ownerId: number) => {
        if (selectedOwnerIds.includes(ownerId)) {
            setSelectedOwnerIds(selectedOwnerIds.filter(id => id !== ownerId));
        } else {
            setSelectedOwnerIds([...selectedOwnerIds, ownerId]);
        }
    };

    const saveAssignments = async () => {
        if (!selectedUser) return;
        try {
            await accountApi.bulkUpdateAssignments(selectedUser.id, selectedOwnerIds);
            setSuccess(`Affectations mises à jour pour ${selectedUser.prenom} ${selectedUser.nom}`);
            setShowAssignModal(false);
        } catch (err) {
            setError("Erreur lors de la sauvegarde.");
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
            </div>

            {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
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
                            <tr key={user.id} className="hover:bg-gray-50 transition">
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
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
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

            {/* Modal Ajout */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4">Ajouter un utilisateur</h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
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
                                type="email"
                                placeholder="Email" 
                                className="p-2 border rounded-lg w-full"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                required
                            />
                            <input 
                                type="tel"
                                placeholder="Téléphone" 
                                className="p-2 border rounded-lg w-full"
                                value={newUser.telephone}
                                onChange={e => setNewUser({...newUser, telephone: e.target.value})}
                            />
                            <input 
                                type="password"
                                placeholder="Mot de passe" 
                                className="p-2 border rounded-lg w-full"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                required
                            />
                            <select 
                                className="p-2 border rounded-lg w-full bg-white"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="gestionnaire">Gestionnaire</option>
                                <option value="manager">Manager</option>
                                <option value="comptable">Comptable</option>
                                <option value="agent_recouvreur">Agent Recouvreur</option>
                            </select>

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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Créer
                                </button>
                            </div>
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

                        <div className="flex-1 overflow-y-auto border rounded-lg divide-y">
                            {owners.length === 0 && (
                                <div className="p-4 text-center text-gray-500 text-sm">
                                    Aucun propriétaire disponible.
                                </div>
                            )}
                            {owners.map(owner => (
                                <label 
                                    key={owner.id}
                                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition ${
                                        selectedOwnerIds.includes(owner.id) ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <input 
                                        type="checkbox"
                                        checked={selectedOwnerIds.includes(owner.id)}
                                        onChange={() => toggleOwnerSelection(owner.id)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800">{owner.nom}</div>
                                        <div className="text-xs text-gray-400 capitalize">{owner.type_proprietaire}</div>
                                    </div>
                                    {selectedOwnerIds.includes(owner.id) && (
                                        <Check size={16} className="text-green-500" />
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <span className="text-sm text-gray-500">
                                {selectedOwnerIds.length} propriétaire(s) sélectionné(s)
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
        </div>
    );
};

export default CompteUtilisateurs;

