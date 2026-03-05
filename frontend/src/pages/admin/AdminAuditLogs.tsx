// frontend/src/pages/admin/AdminAuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  ChevronDown,
  ChevronUp
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
// Traductions lisibles
// ============================================================
const ACTION_LABELS: Record<string, { label: string; badge: string }> = {
  LOGIN_SUCCESS:            { label: 'Connexion réussie',             badge: 'badge-success' },
  LOGIN_FAILED:             { label: 'Connexion échouée',             badge: 'badge-error' },
  LOGOUT:                   { label: 'Déconnexion',                   badge: 'badge-ghost' },
  USER_CREATED:             { label: 'Nouveau compte créé',           badge: 'badge-info' },
  USER_UPDATED:             { label: 'Profil modifié',                badge: 'badge-primary' },
  USER_DELETED:             { label: 'Compte supprimé',               badge: 'badge-error' },
  USER_SUSPENDED:           { label: 'Compte suspendu',               badge: 'badge-warning' },
  USER_REACTIVATED:         { label: 'Compte réactivé',               badge: 'badge-success' },
  USER_VERIFIED:            { label: 'Compte vérifié',                badge: 'badge-success' },
  ROLE_CHANGED:             { label: 'Rôle modifié',                  badge: 'badge-secondary' },
  PASSWORD_RESET_REQUESTED: { label: 'Demande réinit. mot de passe',  badge: 'badge-warning' },
  PASSWORD_RESET_COMPLETED: { label: 'Mot de passe réinitialisé',     badge: 'badge-info' },
  PASSWORD_CHANGED:         { label: 'Mot de passe changé',           badge: 'badge-info' },
  BUILDING_CREATED:         { label: 'Immeuble ajouté',               badge: 'badge-primary' },
  BUILDING_UPDATED:         { label: 'Immeuble modifié',              badge: 'badge-primary' },
  BUILDING_DELETED:         { label: 'Immeuble supprimé',             badge: 'badge-error' },
  LOT_CREATED:              { label: 'Lot ajouté',                    badge: 'badge-accent' },
  LOT_UPDATED:              { label: 'Lot modifié',                   badge: 'badge-accent' },
  LOT_DELETED:              { label: 'Lot supprimé',                  badge: 'badge-error' },
  TENANT_CREATED:           { label: 'Locataire ajouté',              badge: 'badge-info' },
  TENANT_UPDATED:           { label: 'Locataire modifié',             badge: 'badge-info' },
  TENANT_DELETED:           { label: 'Locataire supprimé',            badge: 'badge-error' },
  PAYMENT_CREATED:          { label: 'Paiement enregistré',           badge: 'badge-success' },
  PAYMENT_VALIDATED:        { label: 'Paiement validé',               badge: 'badge-success' },
  PAYMENT_CANCELLED:        { label: 'Paiement annulé',               badge: 'badge-error' },
  DOCUMENT_CREATED:         { label: 'Document ajouté',               badge: 'badge-info' },
  DOCUMENT_DELETED:         { label: 'Document supprimé',             badge: 'badge-error' },
  CONTRACT_CREATED:         { label: 'Contrat créé',                  badge: 'badge-primary' },
  OTP_SENT:                 { label: 'Code de vérification envoyé',   badge: 'badge-info' },
  OTP_VERIFIED:             { label: 'Code de vérification validé',   badge: 'badge-success' },
  REGISTRATION:             { label: 'Inscription',                   badge: 'badge-info' },
};

const MODULE_LABELS: Record<string, string> = {
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

const getActionLabel = (action: string): { label: string; badge: string } => {
  return ACTION_LABELS[action] || { 
    label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
    badge: 'badge-ghost'
  };
};

const formatDetails = (log: AuditLog): string => {
  if (!log.details) return '—';
  const d = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
  const parts: string[] = [];

  if (d.email) parts.push(`Email : ${d.email}`);
  if (d.role) parts.push(`Rôle : ${d.role}`);
  if (d.oldRole && d.newRole) parts.push(`${d.oldRole} → ${d.newRole}`);
  if (d.buildingName || d.building_name) parts.push(`Immeuble : ${d.buildingName || d.building_name}`);
  if (d.lotName || d.lot_name) parts.push(`Lot : ${d.lotName || d.lot_name}`);
  if (d.tenantName || d.tenant_name) parts.push(`Locataire : ${d.tenantName || d.tenant_name}`);
  if (d.amount) parts.push(`${Number(d.amount).toLocaleString()} FCFA`);
  if (d.method) parts.push(`via ${d.method}`);
  if (d.reason) parts.push(d.reason);
  if (d.message) parts.push(d.message);
  if (d.provider) parts.push(d.provider === 'google' ? 'via Google' : 'par Email');

  return parts.length > 0 ? parts.join(' • ') : '—';
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
            {total} événement{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => fetchLogs(page)} className="btn btn-sm btn-outline gap-1">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Filters */}
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
              <option key={a} value={a}>{getActionLabel(a).label}</option>
            ))}
          </select>

          <select 
            className="select select-bordered select-sm"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="all">Toutes les sections</option>
            {availableModules.map(m => (
              <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Activité</th>
                <th>Section</th>
                <th>Adresse IP</th>
                <th>Navigateur</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="h-8 bg-base-200 rounded animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-base-content/40">
                    <Activity size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium">Aucune activité trouvée</p>
                    <p className="text-sm mt-1">Les événements apparaîtront ici au fur et à mesure</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const info = getActionLabel(log.action);
                  const details = formatDetails(log);
                  const isExpanded = expandedRow === log.id;
                  const hasDetails = log.details && details !== '—';

                  return (
                    <React.Fragment key={log.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.015 }}
                        className={`hover:bg-base-200/30 transition-colors ${hasDetails ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDetails && setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <td className="text-xs text-base-content/60 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td>
                          <span className="font-medium text-sm">{log.user_name || 'Système'}</span>
                        </td>
                        <td>
                          <span className={`badge badge-sm font-medium ${info.badge}`}>
                            {info.label}
                          </span>
                        </td>
                        <td className="text-sm text-base-content/60">
                          {MODULE_LABELS[log.module] || log.module || '—'}
                        </td>
                        <td className="text-xs font-mono text-base-content/50">
                          {log.ip_address || '—'}
                        </td>
                        <td className="text-xs text-base-content/50 max-w-[150px]">
                          <span className="truncate block">{log.user_agent ? log.user_agent.split('(')[0].trim().slice(0, 30) : '—'}</span>
                        </td>
                        <td className="text-xs text-base-content/50 max-w-[250px]">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{details}</span>
                            {hasDetails && (
                              isExpanded ? <ChevronUp size={12} className="flex-shrink-0" /> : <ChevronDown size={12} className="flex-shrink-0" />
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {/* Expanded row */}
                      {isExpanded && log.details && (
                        <tr>
                          <td colSpan={7} className="bg-base-200/30 px-6 py-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              {Object.entries(
                                typeof log.details === 'string' ? JSON.parse(log.details) : log.details
                              ).map(([key, value]) => {
                                if (['user_agent', 'userAgent', 'stack', 'trace'].includes(key)) return null;
                                const friendlyKey: Record<string, string> = {
                                  email: 'Email', role: 'Rôle', oldRole: 'Ancien rôle', newRole: 'Nouveau rôle',
                                  buildingName: 'Immeuble', building_name: 'Immeuble', lotName: 'Lot', lot_name: 'Lot',
                                  tenantName: 'Locataire', tenant_name: 'Locataire', amount: 'Montant',
                                  method: 'Moyen de paiement', reason: 'Raison', message: 'Message',
                                  status: 'Statut', provider: 'Fournisseur', ip: 'Adresse IP',
                                };
                                return (
                                  <div key={key} className="bg-base-100 rounded-lg p-2">
                                    <span className="text-base-content/40 block">{friendlyKey[key] || key}</span>
                                    <span className="font-medium text-base-content/80">{String(value)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
