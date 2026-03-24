// frontend/src/pages/admin/AdminUsers.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  ShieldCheck, 
  UserX, 
  KeyRound, 
  Trash2,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  Phone,
  Calendar,
  Shield,
  Globe,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  is_verified?: boolean;
  auth_provider?: string;
  google_id?: string;
  avatar_url?: string;
  is_guest?: boolean;
}

const ITEMS_PER_PAGE = 12;

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'badge-error' },
  gestionnaire: { label: 'Gestionnaire', color: 'badge-primary' },
  manager: { label: 'Manager', color: 'badge-secondary' },
  comptable: { label: 'Comptable', color: 'badge-info' },
  viewer: { label: 'Viewer', color: 'badge-ghost' },
  agent_recouvreur: { label: 'Recouvreur', color: 'badge-warning' },
  locataire: { label: 'Locataire', color: 'badge-accent' },
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);

      const response = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [searchQuery, roleFilter, statusFilter, verifiedFilter, providerFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return users.slice(start, start + ITEMS_PER_PAGE);
  }, [users, currentPage]);

  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);

  const executeAction = async (userId: number, action: string, value?: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/admin/users/${userId}/action`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        fetchUsers();
        setActionMenuId(null);
      } else {
        toast.error(data.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleChangeRole = async () => {
    if (showRoleModal && newRole) {
      await executeAction(showRoleModal.id, 'change_role', newRole);
      setShowRoleModal(null);
      setNewRole('');
    }
  };

  const getRoleBadge = (role: string) => {
    const config = ROLE_CONFIG[role] || { label: role, color: 'badge-ghost' };
    return <span className={`badge badge-sm ${config.color} font-medium`}>{config.label}</span>;
  };

  const getProviderIcon = (provider?: string) => {
    if (provider === 'google') return <span aria-label="Google"><Globe size={14} className="text-blue-500" /></span>;
    return <span aria-label="Email"><Mail size={14} className="text-base-content/60" /></span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
          <p className="text-base-content/60">{total} utilisateurs inscrits sur la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="btn btn-sm btn-outline gap-1">
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-base-100 rounded-2xl p-4 shadow-sm border border-base-200">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/60" />
            <input 
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>

          {/* Role Filter */}
          <select 
            className="select select-bordered select-sm"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admin</option>
            <option value="gestionnaire">Gestionnaire</option>
            <option value="manager">Manager</option>
            <option value="comptable">Comptable</option>
            <option value="viewer">Viewer</option>
          </select>

          {/* Status Filter */}
          <select 
            className="select select-bordered select-sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Suspendu</option>
          </select>

          {/* Verification Filter */}
          <select 
            className="select select-bordered select-sm"
            value={verifiedFilter}
            onChange={(e) => { setVerifiedFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Vérification</option>
            <option value="true">✅ Vérifié</option>
            <option value="false">❌ Non vérifié</option>
          </select>

          {/* Provider Filter */}
          <select 
            className="select select-bordered select-sm"
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">Tous providers</option>
            <option value="local">📧 Email</option>
            <option value="google">🔵 Google</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Vérifié</th>
                <th>Provider</th>
                <th>Inscrit le</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7}><div className="h-10 bg-base-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-base-content/60">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-base-200/50 transition-colors"
                  >
                    {/* User Info */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                            ${user.statut === 'actif' ? 'bg-primary/10 text-primary' : 'bg-base-300 text-base-content/60'}`}>
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              user.nom?.substring(0, 2).toUpperCase() || '??'
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight">{user.nom || 'Sans nom'}</p>
                          <p className="text-xs text-base-content/50 truncate max-w-[200px]">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>{getRoleBadge(user.role)}</td>

                    {/* Status */}
                    <td>
                      <span className={`badge badge-sm font-medium ${
                        user.statut === 'actif' ? 'badge-success' : 'badge-error'
                      }`}>
                        {user.statut === 'actif' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>

                    {/* Verified */}
                    <td>
                      {user.is_verified ? (
                        <CheckCircle size={18} className="text-emerald-500" />
                      ) : (
                        <XCircle size={18} className="text-red-400/50" />
                      )}
                    </td>

                    {/* Provider */}
                    <td>{getProviderIcon(user.auth_provider)}</td>

                    {/* Date */}
                    <td className="text-xs text-base-content/60">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </td>

                    {/* Actions */}
                    <td className="text-right relative">
                      <div className="dropdown dropdown-end">
                        <button 
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                          className="btn btn-ghost btn-xs btn-square"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {actionMenuId === user.id && (
                          <ul className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-56 border border-base-200 absolute right-0 top-8">
                            <li>
                              <button onClick={() => { setSelectedUser(user); setShowDetails(true); setActionMenuId(null); }}>
                                <Eye size={14} /> Voir détails
                              </button>
                            </li>
                            <li>
                              <button onClick={() => { setShowRoleModal(user); setNewRole(user.role); setActionMenuId(null); }}>
                                <Shield size={14} /> Changer le rôle
                              </button>
                            </li>
                            <div className="divider my-1" />
                            {user.is_verified ? (
                              <li>
                                <button onClick={() => executeAction(user.id, 'unverify')} className="text-warning">
                                  <XCircle size={14} /> Retirer vérification
                                </button>
                              </li>
                            ) : (
                              <li>
                                <button onClick={() => executeAction(user.id, 'verify')} className="text-success">
                                  <CheckCircle size={14} /> Vérifier manuellement
                                </button>
                              </li>
                            )}
                            {user.statut === 'actif' ? (
                              <li>
                                <button onClick={() => executeAction(user.id, 'suspend')} className="text-warning">
                                  <UserX size={14} /> Suspendre
                                </button>
                              </li>
                            ) : (
                              <li>
                                <button onClick={() => executeAction(user.id, 'reactivate')} className="text-success">
                                  <ShieldCheck size={14} /> Réactiver
                                </button>
                              </li>
                            )}
                            <div className="divider my-1" />
                            <li>
                              <button onClick={() => { 
                                if (confirm(`Supprimer définitivement ${user.nom} ?`)) executeAction(user.id, 'delete');
                              }} className="text-error">
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-base-200">
            <p className="text-sm text-base-content/50">
              {users.length} résultats • Page {currentPage}/{totalPages}
            </p>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-sm btn-ghost"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 
                  : currentPage >= totalPages - 2 ? totalPages - 4 + i 
                  : currentPage - 2 + i;
                if (page < 1 || page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-sm btn-ghost"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showDetails && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-bold">Détails Utilisateur</h3>
                  <button onClick={() => setShowDetails(false)} className="btn btn-ghost btn-sm btn-square">
                    <X size={18} />
                  </button>
                </div>

                {/* User Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="avatar placeholder">
                    <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        selectedUser.nom?.substring(0, 2).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{selectedUser.nom}</h4>
                    <p className="text-sm text-base-content/60">{selectedUser.email}</p>
                    <div className="flex gap-2 mt-1">
                      {getRoleBadge(selectedUser.role)}
                      {selectedUser.is_verified && (
                        <span className="badge badge-sm badge-success gap-1">
                          <CheckCircle size={10} /> Vérifié
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-base-200/50 rounded-xl p-3">
                    <p className="text-xs text-base-content/50 mb-1">Téléphone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone size={14} /> {selectedUser.telephone || 'Non renseigné'}
                    </p>
                  </div>
                  <div className="bg-base-200/50 rounded-xl p-3">
                    <p className="text-xs text-base-content/50 mb-1">Provider</p>
                    <p className="font-medium flex items-center gap-1">
                      {getProviderIcon(selectedUser.auth_provider)}
                      {selectedUser.auth_provider === 'google' ? 'Google' : 'Email'}
                    </p>
                  </div>
                  <div className="bg-base-200/50 rounded-xl p-3">
                    <p className="text-xs text-base-content/50 mb-1">Inscrit le</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(selectedUser.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-base-200/50 rounded-xl p-3">
                    <p className="text-xs text-base-content/50 mb-1">Statut</p>
                    <span className={`badge badge-sm ${selectedUser.statut === 'actif' ? 'badge-success' : 'badge-error'}`}>
                      {selectedUser.statut === 'actif' ? 'Actif' : 'Suspendu'}
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {!selectedUser.is_verified && (
                    <button onClick={() => { executeAction(selectedUser.id, 'verify'); setShowDetails(false); }} className="btn btn-sm btn-success gap-1">
                      <CheckCircle size={14} /> Vérifier
                    </button>
                  )}
                  <button onClick={() => { setShowRoleModal(selectedUser); setNewRole(selectedUser.role); setShowDetails(false); }} className="btn btn-sm btn-outline gap-1">
                    <Shield size={14} /> Changer rôle
                  </button>
                  {selectedUser.statut === 'actif' ? (
                    <button onClick={() => { executeAction(selectedUser.id, 'suspend'); setShowDetails(false); }} className="btn btn-sm btn-warning btn-outline gap-1">
                      <UserX size={14} /> Suspendre
                    </button>
                  ) : (
                    <button onClick={() => { executeAction(selectedUser.id, 'reactivate'); setShowDetails(false); }} className="btn btn-sm btn-success btn-outline gap-1">
                      <ShieldCheck size={14} /> Réactiver
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Role Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRoleModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-base-100 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h3 className="text-lg font-bold mb-4">Changer le rôle de {showRoleModal.nom}</h3>
              <select 
                className="select select-bordered w-full mb-4"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="manager">Manager</option>
                <option value="comptable">Comptable</option>
                <option value="viewer">Viewer</option>
                <option value="agent_recouvreur">Agent Recouvreur</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRoleModal(null)} className="btn btn-sm btn-ghost">Annuler</button>
                <button onClick={handleChangeRole} className="btn btn-sm btn-primary">Confirmer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
