// frontend/src/pages/admin/AdminAuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  UserCog,
  Building2,
  Home,
  CreditCard,
  FileText,
  Shield,
  Key,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { API_URL } from '../../config';
import { getToken } from '../../api/authApi';

interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string;
  details: any;
  user_name: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// ============================================================
// Traductions lisibles pour les actions techniques
// ============================================================
const ACTION_TRANSLATIONS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  // Connexion
  LOGIN_SUCCESS:               { label: 'Connexion réussie',            icon: LogIn,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
  LOGIN_FAILED:                { label: 'Tentative de connexion échouée', icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50' },
  LOGOUT:                      { label: 'Déconnexion',                  icon: LogOut,       color: 'text-gray-500',    bg: 'bg-gray-50' },
  // Utilisateurs
  USER_CREATED:                { label: 'Nouveau compte créé',          icon: UserPlus,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  USER_UPDATED:                { label: 'Profil modifié',               icon: UserCog,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  USER_DELETED:                { label: 'Compte supprimé',              icon: UserCog,      color: 'text-red-600',     bg: 'bg-red-50' },
  USER_SUSPENDED:              { label: 'Compte suspendu',              icon: Shield,       color: 'text-orange-600',  bg: 'bg-orange-50' },
  USER_REACTIVATED:            { label: 'Compte réactivé',              icon: Shield,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
  USER_VERIFIED:               { label: 'Compte vérifié',               icon: Shield,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ROLE_CHANGED:                { label: 'Rôle modifié',                 icon: Shield,       color: 'text-purple-600',  bg: 'bg-purple-50' },
  // Mot de passe
  PASSWORD_RESET_REQUESTED:    { label: 'Réinitialisation mot de passe demandée', icon: Key, color: 'text-amber-600', bg: 'bg-amber-50' },
  PASSWORD_RESET_COMPLETED:    { label: 'Mot de passe réinitialisé',    icon: Key,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PASSWORD_CHANGED:            { label: 'Mot de passe changé',          icon: Key,          color: 'text-blue-600',    bg: 'bg-blue-50' },
  // Biens immobiliers
  BUILDING_CREATED:            { label: 'Immeuble ajouté',              icon: Building2,    color: 'text-violet-600',  bg: 'bg-violet-50' },
  BUILDING_UPDATED:            { label: 'Immeuble modifié',             icon: Building2,    color: 'text-violet-600',  bg: 'bg-violet-50' },
  BUILDING_DELETED:            { label: 'Immeuble supprimé',            icon: Building2,    color: 'text-red-600',     bg: 'bg-red-50' },
  LOT_CREATED:                 { label: 'Lot ajouté',                   icon: Home,         color: 'text-teal-600',    bg: 'bg-teal-50' },
  LOT_UPDATED:                 { label: 'Lot modifié',                  icon: Home,         color: 'text-teal-600',    bg: 'bg-teal-50' },
  LOT_DELETED:                 { label: 'Lot supprimé',                 icon: Home,         color: 'text-red-600',     bg: 'bg-red-50' },
  // Locataires
  TENANT_CREATED:              { label: 'Locataire ajouté',             icon: Users,        color: 'text-cyan-600',    bg: 'bg-cyan-50' },
  TENANT_UPDATED:              { label: 'Locataire modifié',            icon: Users,        color: 'text-cyan-600',    bg: 'bg-cyan-50' },
  TENANT_DELETED:              { label: 'Locataire supprimé',           icon: Users,        color: 'text-red-600',     bg: 'bg-red-50' },
  // Paiements
  PAYMENT_CREATED:             { label: 'Paiement enregistré',          icon: CreditCard,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PAYMENT_VALIDATED:           { label: 'Paiement validé',              icon: CreditCard,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PAYMENT_CANCELLED:           { label: 'Paiement annulé',              icon: CreditCard,   color: 'text-red-600',     bg: 'bg-red-50' },
  // Documents
  DOCUMENT_CREATED:            { label: 'Document ajouté',              icon: FileText,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  DOCUMENT_DELETED:            { label: 'Document supprimé',            icon: FileText,     color: 'text-red-600',     bg: 'bg-red-50' },
  CONTRACT_CREATED:            { label: 'Contrat créé',                 icon: FileText,     color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  // OTP / Inscription
  OTP_SENT:                    { label: 'Code de vérification envoyé',  icon: Key,          color: 'text-blue-600',    bg: 'bg-blue-50' },
  OTP_VERIFIED:                { label: 'Code de vérification validé',  icon: Key,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
  REGISTRATION:                { label: 'Inscription',                  icon: UserPlus,     color: 'text-blue-600',    bg: 'bg-blue-50' },
};

const MODULE_TRANSLATIONS: Record<string, string> = {
  auth: 'Authentification',
  users: 'Utilisateurs',
  buildings: 'Immeubles',
  lots: 'Lots',
  tenants: 'Locataires',
  payments: 'Paiements',
  documents: 'Documents',
  contracts: 'Contrats',
  settings: 'Paramètres',
  admin: 'Administration',
};

// Friendly filter names for actions
const ACTION_FILTER_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGIN_FAILED: 'Connexion échouée',
  USER_CREATED: 'Création compte',
  USER_UPDATED: 'Modification profil',
  BUILDING_CREATED: 'Ajout immeuble',
  LOT_CREATED: 'Ajout lot',
  TENANT_CREATED: 'Ajout locataire',
  PAYMENT_CREATED: 'Paiement',
  PAYMENT_VALIDATED: 'Validation paiement',
  PASSWORD_RESET_REQUESTED: 'Réinit. mot de passe',
  PASSWORD_RESET_COMPLETED: 'Mot de passe changé',
  DOCUMENT_CREATED: 'Ajout document',
  OTP_SENT: 'Code envoyé',
  OTP_VERIFIED: 'Code vérifié',
  REGISTRATION: 'Inscription',
};

const getActionInfo = (action: string) => {
  return ACTION_TRANSLATIONS[action] || { 
    label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    icon: Activity,
    color: 'text-gray-500',
    bg: 'bg-gray-50'
  };
};

const formatDetails = (log: AuditLog): string | null => {
  if (!log.details) return null;
  const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;

  // Build user-friendly detail strings
  const parts: string[] = [];

  if (d.email) parts.push(`Email : ${d.email}`);
  if (d.role) parts.push(`Rôle : ${d.role}`);
  if (d.oldRole && d.newRole) parts.push(`Rôle : ${d.oldRole} → ${d.newRole}`);
  if (d.buildingName || d.building_name) parts.push(`Immeuble : ${d.buildingName || d.building_name}`);
  if (d.lotName || d.lot_name) parts.push(`Lot : ${d.lotName || d.lot_name}`);
  if (d.tenantName || d.tenant_name) parts.push(`Locataire : ${d.tenantName || d.tenant_name}`);
  if (d.amount) parts.push(`Montant : ${Number(d.amount).toLocaleString()} FCFA`);
  if (d.method) parts.push(`Moyen : ${d.method}`);
  if (d.reason) parts.push(`Raison : ${d.reason}`);
  if (d.message) parts.push(d.message);
  if (d.status) parts.push(`Statut : ${d.status}`);
  if (d.provider) parts.push(`Fournisseur : ${d.provider === 'google' ? 'Google' : 'Email'}`);

  return parts.length > 0 ? parts.join(' • ') : null;
};

const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchLogs = async (p = page) => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      params.set('page', p.toString());
      params.set('limit', '30');
      if (searchQuery) params.set('search', searchQuery);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (moduleFilter !== 'all') params.set('module', moduleFilter);

      const response = await fetch(`${API_URL}/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 0);
        setPage(data.page || 1);
        if (data.filters) {
          setAvailableActions(data.filters.actions || []);
          setAvailableModules(data.filters.modules || []);
        }
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(1); }, [searchQuery, actionFilter, moduleFilter]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time for recent events
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const goToPage = (newPage: number) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Historique des Activités
          </h1>
          <p className="text-base-content/60">
            {total} événement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''} sur la plateforme
          </p>
        </div>
        <button onClick={() => fetchLogs(page)} className="btn btn-sm btn-outline gap-1">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Filters - User-friendly labels */}
      <div className="bg-base-100 rounded-2xl p-4 shadow-sm border border-base-200">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            <input 
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9"
            />
          </div>

          <select 
            className="select select-bordered select-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">Toutes les activités</option>
            {availableActions.map(a => (
              <option key={a} value={a}>{ACTION_FILTER_LABELS[a] || getActionInfo(a).label}</option>
            ))}
          </select>

          <select 
            className="select select-bordered select-sm"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="all">Toutes les sections</option>
            {availableModules.map(m => (
              <option key={m} value={m}>{MODULE_TRANSLATIONS[m] || m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Feed - Timeline style */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-base-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-base-200 rounded w-3/4" />
                  <div className="h-3 bg-base-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-base-content/40">
            <Activity size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-lg">Aucune activité trouvée</p>
            <p className="text-sm mt-1">Les événements apparaîtront ici au fur et à mesure</p>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {logs.map((log, index) => {
              const info = getActionInfo(log.action);
              const Icon = info.icon;
              const details = formatDetails(log);
              const isExpanded = expandedRow === log.id;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="px-5 py-4 hover:bg-base-200/20 transition-colors cursor-pointer"
                  onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${info.bg} ${info.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {/* Action description */}
                          <p className="font-medium text-sm">
                            <span className={info.color}>{info.label}</span>
                            {log.user_name && (
                              <span className="text-base-content">
                                {' '}— <span className="font-semibold">{log.user_name}</span>
                              </span>
                            )}
                          </p>

                          {/* Module tag */}
                          {log.module && (
                            <span className="text-xs text-base-content/40 mt-0.5 inline-block">
                              {MODULE_TRANSLATIONS[log.module] || log.module}
                            </span>
                          )}

                          {/* Friendly details */}
                          {details && (
                            <p className="text-xs text-base-content/50 mt-1 truncate">
                              {details}
                            </p>
                          )}
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-1 text-xs text-base-content/40 whitespace-nowrap flex-shrink-0">
                          <Clock size={12} />
                          {formatDate(log.created_at)}
                          {(details || log.details) && (
                            isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && log.details && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="mt-3 p-3 bg-base-200/40 rounded-lg text-xs space-y-1"
                        >
                          {Object.entries(
                            typeof log.details === 'string' ? JSON.parse(log.details) : log.details
                          ).map(([key, value]) => {
                            // Skip internal/technical keys
                            if (['user_agent', 'userAgent', 'stack', 'trace'].includes(key)) return null;
                            const friendlyKey = key
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, l => l.toUpperCase());
                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-base-content/50 font-medium min-w-[120px]">{friendlyKey} :</span>
                                <span className="text-base-content/80">{String(value)}</span>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-base-200">
            <p className="text-sm text-base-content/50">
              Page {page} sur {totalPages} ({total} événements)
            </p>
            <div className="flex gap-1">
              <button 
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn btn-sm btn-ghost"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button 
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn btn-sm btn-ghost"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
