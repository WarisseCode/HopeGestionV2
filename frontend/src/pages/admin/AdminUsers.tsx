// frontend/src/pages/admin/AdminUsers.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  MoreHorizontal, 
  ShieldCheck, 
  UserX, 
  KeyRound, 
  Trash2,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';
import toast from 'react-hot-toast';

interface User {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  role: string;
  user_type: string;
  statut: string;
  created_at: string;
  is_guest?: boolean;
}

const ITEMS_PER_PAGE = 10;

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'promote' | 'suspend' | 'reset' | 'delete' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      // Build query string
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`${API_URL}/admin/users?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast.error('Erreur lors du chargement des utilisateurs');
        setUsers([]);
      }
    } catch (error) {
      console.error('Erreur fetch users:', error);
      toast.error('Erreur de connexion serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, statusFilter]);

  // Filtered users - Client side filtering is now redundant if server side does it, 
  // but we keep it for pagination on the returned set if needed, 
  // OR we rely on server returning filtered list.
  // Since I updated fetchUsers to use params, 'users' is already filtered.
  const filteredUsers = users; 

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAction = (user: User, action: 'promote' | 'suspend' | 'reset' | 'delete') => {
    setSelectedUser(user);
    setActionType(action);
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedUser || !actionType) return;
    setActionLoading(true);
    
    try {
      const token = getToken();
      let apiAction = actionType;
      // Map frontend action to backend expected action string if needed
      // Backend expects: 'promote', 'suspend', 'reactivate', 'delete', 'reset_password'
      
      if (actionType === 'suspend' && selectedUser.statut === 'inactif') {
          apiAction = 'reactivate' as any;
      }
      if (actionType === 'reset') {
          apiAction = 'reset_password' as any;
      }

      const response = await fetch(`${API_URL}/admin/users/${selectedUser.id}/action`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: apiAction })
      });

      if (response.ok) {
          const data = await response.json();
          toast.success(data.message);
          fetchUsers(); // Refresh list
      } else {
          const error = await response.json();
          toast.error(error.message || 'Erreur lors de l\'action');
      }
      
      setShowActionModal(false);
    } catch (error) {
      console.error('Action error:', error);
      toast.error('Erreur lors de l\'action');
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      admin: 'badge-error',
      gestionnaire: 'badge-primary',
      proprietaire: 'badge-accent',
      locataire: 'badge-info',
    };
    return `badge ${styles[role] || 'badge-ghost'} badge-sm`;
  };

  const getStatusBadge = (statut: string) => {
    return statut === 'actif' 
      ? 'badge badge-success badge-sm' 
      : 'badge badge-warning badge-sm';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-base-content/60">Voir et gérer tous les comptes de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={fetchUsers}>
            <RefreshCw size={16} className="mr-2" /> Actualiser
          </Button>
          <Button variant="primary">
            <UserPlus size={16} className="mr-2" /> Créer Utilisateur
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input 
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
          
          {/* Role Filter */}
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="select select-bordered w-full md:w-48"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="gestionnaire">Gestionnaire</option>
            <option value="proprietaire">Propriétaire</option>
            <option value="locataire">Locataire</option>
          </select>

          {/* Status Filter */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select select-bordered w-full md:w-40"
          >
            <option value="all">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
          </select>
          
          <Button variant="ghost">
            <Download size={16} className="mr-2" /> Exporter
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="bg-base-200/50">
                <th>Utilisateur</th>
                <th>Contact</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <div className="h-10 bg-base-200 animate-pulse rounded"></div>
                    </td>
                  </tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-base-content/50">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {paginatedUsers.map((user, index) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-base-200/30"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-neutral text-neutral-content rounded-full w-10">
                              <span className="text-xs font-bold">
                                {user.nom.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">{user.nom}</div>
                            <div className="text-sm opacity-50">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{user.telephone || '-'}</td>
                      <td>
                        <span className={getRoleBadge(user.role)}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(user.statut)}>
                          {user.statut}
                        </span>
                      </td>
                      <td className="text-sm text-base-content/60">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-square">
                              <MoreHorizontal size={16} />
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                              <li>
                                <a className="flex items-center gap-2">
                                  <Eye size={14} /> Voir profil
                                </a>
                              </li>
                              {user.role !== 'admin' && (
                                <li>
                                  <a onClick={() => handleAction(user, 'promote')} className="flex items-center gap-2 text-primary">
                                    <ShieldCheck size={14} /> Promouvoir Admin
                                  </a>
                                </li>
                              )}
                              <li>
                                <a onClick={() => handleAction(user, 'suspend')} className="flex items-center gap-2 text-warning">
                                  <UserX size={14} /> {user.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
                                </a>
                              </li>
                              <li>
                                <a onClick={() => handleAction(user, 'reset')} className="flex items-center gap-2">
                                  <KeyRound size={14} /> Reset mot de passe
                                </a>
                              </li>
                              <li>
                                <a onClick={() => handleAction(user, 'delete')} className="flex items-center gap-2 text-error">
                                  <Trash2 size={14} /> Supprimer
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-base-200">
            <span className="text-sm text-base-content/60">
              {filteredUsers.length} utilisateur(s) • Page {currentPage}/{totalPages}
            </span>
            <div className="join">
              <button 
                className="join-item btn btn-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="join-item btn btn-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Action Confirmation Modal */}
      <Modal 
        isOpen={showActionModal} 
        onClose={() => setShowActionModal(false)}
        title={
          actionType === 'promote' ? 'Promouvoir en Admin' :
          actionType === 'suspend' ? (selectedUser?.statut === 'actif' ? 'Suspendre l\'utilisateur' : 'Réactiver l\'utilisateur') :
          actionType === 'reset' ? 'Réinitialiser le mot de passe' :
          actionType === 'delete' ? 'Supprimer l\'utilisateur' : ''
        }
      >
        <div className="py-4">
          {actionType === 'promote' && (
            <p>Êtes-vous sûr de vouloir promouvoir <strong>{selectedUser?.nom}</strong> en Super Admin ? Cette action donne un accès complet à la plateforme.</p>
          )}
          {actionType === 'suspend' && (
            <p>Êtes-vous sûr de vouloir {selectedUser?.statut === 'actif' ? 'suspendre' : 'réactiver'} le compte de <strong>{selectedUser?.nom}</strong> ?</p>
          )}
          {actionType === 'reset' && (
            <p>Un email de réinitialisation sera envoyé à <strong>{selectedUser?.email}</strong>.</p>
          )}
          {actionType === 'delete' && (
            <div className="alert alert-error mb-4">
              <span>⚠️ Cette action est irréversible !</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowActionModal(false)}>
            Annuler
          </Button>
          <Button 
            variant={actionType === 'delete' ? 'error' : 'primary'}
            onClick={executeAction}
            loading={actionLoading}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
