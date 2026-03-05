// frontend/src/pages/admin/AdminAuditLogs.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Clock,
  User,
  Globe,
  Filter
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

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'badge-success',
  LOGIN_FAILED: 'badge-error',
  USER_CREATED: 'badge-info',
  USER_UPDATED: 'badge-primary',
  BUILDING_CREATED: 'badge-secondary',
  TENANT_CREATED: 'badge-accent',
  PAYMENT_CREATED: 'badge-warning',
  PAYMENT_VALIDATED: 'badge-success',
  PASSWORD_RESET_REQUESTED: 'badge-warning',
  PASSWORD_RESET_COMPLETED: 'badge-info',
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
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatAction = (action: string): string => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Journal d'Audit
          </h1>
          <p className="text-base-content/60">{total} événements enregistrés</p>
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
              placeholder="Rechercher par utilisateur, action, IP..."
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
            <option value="all">Toutes les actions</option>
            {availableActions.map(a => (
              <option key={a} value={a}>{formatAction(a)}</option>
            ))}
          </select>

          <select 
            className="select select-bordered select-sm"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="all">Tous les modules</option>
            {availableModules.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-base-100 rounded-2xl shadow-sm border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider">
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="h-8 bg-base-200 rounded animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-base-content/40">
                    <Activity size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Aucun log trouvé</p>
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <React.Fragment key={log.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.015 }}
                      className="hover:bg-base-200/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                    >
                      <td className="text-xs text-base-content/60 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(log.created_at)}
                        </span>
                      </td>
                      <td>
                        <span className="flex items-center gap-1.5 text-sm">
                          <User size={13} className="text-base-content/40" />
                          <span className="font-medium">{log.user_name || 'Système'}</span>
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-sm font-medium ${ACTION_COLORS[log.action] || 'badge-ghost'}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="text-xs text-base-content/50">{log.module || '—'}</td>
                      <td className="text-xs font-mono text-base-content/50">
                        {log.ip_address ? (
                          <span className="flex items-center gap-1">
                            <Globe size={11} /> {log.ip_address}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-xs text-base-content/40">
                        {log.details ? '📋' : '—'}
                      </td>
                    </motion.tr>
                    {/* Expanded Details Row */}
                    {expandedRow === log.id && log.details && (
                      <tr>
                        <td colSpan={6} className="bg-base-200/30 p-4">
                          <div className="text-xs">
                            <p className="font-semibold mb-2">Détails de l'événement :</p>
                            <pre className="bg-base-300 rounded-lg p-3 overflow-x-auto text-[11px] leading-relaxed">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                            {log.user_agent && (
                              <p className="mt-2 text-base-content/40 truncate">
                                <span className="font-medium">User Agent :</span> {log.user_agent}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-base-200">
            <p className="text-sm text-base-content/50">
              {total} événements • Page {page}/{totalPages}
            </p>
            <div className="flex gap-1">
              <button 
                onClick={() => { setPage(p => Math.max(1, p - 1)); fetchLogs(Math.max(1, page - 1)); }}
                disabled={page <= 1}
                className="btn btn-sm btn-ghost"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="btn btn-sm btn-disabled">{page}</span>
              <button 
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); fetchLogs(Math.min(totalPages, page + 1)); }}
                disabled={page >= totalPages}
                className="btn btn-sm btn-ghost"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
