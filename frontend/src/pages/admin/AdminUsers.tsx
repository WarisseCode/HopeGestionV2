// frontend/src/pages/admin/AdminUsers.tsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  UserX,
  Trash2,
  RefreshCw,
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
import { apiCall } from '../../utils/apiUtils';
import toast from 'react-hot-toast';
import Table, { type Column } from '../../components/ui/Table';

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
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (verifiedFilter !== 'all') params.set('verified', verifiedFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);

      const data = await apiCall<{ users: any[]; total: number }>(`${API_URL}/admin/users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [searchQuery, roleFilter, statusFilter, verifiedFilter, providerFilter]);

  const executeAction = async (userId: number, action: string, value?: string) => {
    try {
      const data = await apiCall<{ message: string }>(`${API_URL}/admin/users/${userId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, value }),
      });
      toast.success(data.message);
      fetchUsers();
      setActionMenuId(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur réseau');
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
    if (provider === 'google') return <span aria-label="Google"><Globe size={14} className="text-teal-500" /></span>;
    return <span aria-label="Email"><Mail size={14} className="text-base-content/60" /></span>;
  };

  // Colonnes du tableau utilisateurs. Le composant Table gère skeleton, état vide,
  // tri (via sortAccessor) et pagination client (pageSize) — la page ne décrit
  // plus que le rendu de chaque cellule + sa logique d'action.
  const columns: Column<User>[] = [
    {
      key: 'id', header: 'ID', width: 'w-12',
      className: 'text-xs font-mono text-base-content/40',
      sortAccessor: (u) => u.id,
      render: (u) => `#${u.id}`,
    },
    {
      key: 'user', header: 'Utilisateur',
      sortAccessor: (u) => u.nom ?? '',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
              ${u.statut === 'actif' ? 'bg-primary/10 text-primary' : 'bg-base-300 text-base-content/60'}`}>
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                u.nom?.substring(0, 2).toUpperCase() || '??'
              )}
            </div>
          </div>
          <div>
            <p className="font-medium text-sm leading-tight">{u.nom || 'Sans nom'}</p>
            <p className="text-xs text-base-content/50 truncate max-w-[200px]">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role', header: 'Rôle',
      sortAccessor: (u) => u.role,
      render: (u) => getRoleBadge(u.role),
    },
    {
      key: 'statut', header: 'Statut',
      sortAccessor: (u) => u.statut,
      render: (u) => (
        <span className={`badge badge-sm font-medium ${u.statut === 'actif' ? 'badge-success' : 'badge-error'}`}>
          {u.statut === 'actif' ? 'Actif' : 'Suspendu'}
        </span>
      ),
    },
    {
      key: 'verified', header: 'Vérifié',
      sortAccessor: (u) => (u.is_verified ? 1 : 0),
      render: (u) => u.is_verified
        ? <CheckCircle size={18} className="text-emerald-500" />
        : <XCircle size={18} className="text-red-400/50" />,
    },
    {
      key: 'provider', header: 'Provider',
      render: (u) => getProviderIcon(u.auth_provider),
    },
    {
      key: 'created', header: 'Inscrit le',
      className: 'text-xs text-base-content/60',
      sortAccessor: (u) => new Date(u.created_at),
      render: (u) => new Date(u.created_at).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      className: 'relative', // ancre le menu dropdown positionné en absolute
      render: (u) => (
        <div className="dropdown dropdown-end">
          <button
            type="button"
            onClick={() => setActionMenuId(actionMenuId === u.id ? null : u.id)}
            className="btn btn-ghost btn-xs btn-square"
            aria-label={`Actions pour ${u.nom || 'utilisateur'}`}
          >
            <MoreHorizontal size={16} />
          </button>
          {actionMenuId === u.id && (
            <ul className="dropdown-content z-50 menu p-2 shadow-lg bg-base-100 rounded-xl w-56 border border-base-200 absolute right-0 top-8">
              <li>
                <button type="button" onClick={() => { setSelectedUser(u); setShowDetails(true); setActionMenuId(null); }}>
                  <Eye size={14} /> Voir détails
                </button>
              </li>
              <li>
                <button type="button" onClick={() => { setShowRoleModal(u); setNewRole(u.role); setActionMenuId(null); }}>
                  <Shield size={14} /> Changer le rôle
                </button>
              </li>
              <div className="divider my-1" />
              {u.is_verified ? (
                <li>
                  <button type="button" onClick={() => executeAction(u.id, 'unverify')} className="text-warning">
                    <XCircle size={14} /> Retirer vérification
                  </button>
                </li>
              ) : (
                <li>
                  <button type="button" onClick={() => executeAction(u.id, 'verify')} className="text-success">
                    <CheckCircle size={14} /> Vérifier manuellement
                  </button>
                </li>
              )}
              {u.statut === 'actif' ? (
                <li>
                  <button type="button" onClick={() => executeAction(u.id, 'suspend')} className="text-warning">
                    <UserX size={14} /> Suspendre
                  </button>
                </li>
              ) : (
                <li>
                  <button type="button" onClick={() => executeAction(u.id, 'reactivate')} className="text-success">
                    <ShieldCheck size={14} /> Réactiver
                  </button>
                </li>
              )}
              <div className="divider my-1" />
              <li>
                <button type="button" onClick={() => {
                  if (confirm(`Supprimer définitivement ${u.nom} ?`)) executeAction(u.id, 'delete');
                }} className="text-error">
                  <Trash2 size={14} /> Supprimer
                </button>
              </li>
            </ul>
          )}
        </div>
      ),
    },
  ];

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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>

          {/* Role Filter */}
          <select 
            className="select select-bordered select-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Suspendu</option>
          </select>

          {/* Verification Filter */}
          <select 
            className="select select-bordered select-sm"
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
          >
            <option value="all">Vérification</option>
            <option value="true">✅ Vérifié</option>
            <option value="false">❌ Non vérifié</option>
          </select>

          {/* Provider Filter */}
          <select 
            className="select select-bordered select-sm"
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
          >
            <option value="all">Tous providers</option>
            <option value="local">📧 Email</option>
            <option value="google">🔵 Google</option>
          </select>
        </div>
      </div>

      {/* Users Table — skeleton, état vide, tri et pagination gérés par <Table> */}
      <Table<User>
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        loading={loading}
        pageSize={12}
        emptyMessage="Aucun utilisateur trouvé"
        defaultSort={{ key: 'created', direction: 'desc' }}
      />

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
