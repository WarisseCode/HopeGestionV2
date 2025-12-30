import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Activity, 
  Database,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { getToken } from '../api/authApi';

interface AuditLog {
    id: string;
    user_id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    ip_address: string;
    created_at: string;
}

const AuditLogsPage: React.FC = () => {
    const { user, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [page, setPage] = useState(0);
    const LIMIT = 20;

    useEffect(() => {
        if (!userLoading) {
            if (user?.userType !== 'gestionnaire' && user?.role !== 'admin') {
                navigate('/dashboard');
                return;
            }
            fetchLogs();
        }
    }, [user, userLoading, page, actionFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = getToken();
            const queryParams = new URLSearchParams({
                limit: LIMIT.toString(),
                offset: (page * LIMIT).toString(),
            });
            
            if (actionFilter) queryParams.append('action', actionFilter);

            const response = await fetch(`http://localhost:5000/api/audit-logs?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erreur chargement logs');
            
            const data = await response.json();
            setLogs(data.logs);
        } catch (err) {
            setError('Impossible de récupérer l\'historique.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getActionColor = (action: string) => {
        if (action.includes('LOGIN')) return 'text-success bg-success/10';
        if (action.includes('DELETE') || action.includes('ARCHIVE')) return 'text-error bg-error/10';
        if (action.includes('CREATE')) return 'text-info bg-info/10';
        if (action.includes('UPDATE')) return 'text-warning bg-warning/10';
        return 'text-base-content/70 bg-base-200';
    };

    if (userLoading) return <div className="p-8 text-center">Chargement...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto animation-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                     <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-primary" />
                        Journal d'audit & Sécurité
                     </h1>
                     <p className="opacity-70 mt-1">Surveillez l'activité critique de votre application.</p>
                </div>
                <div className="badge badge-primary badge-outline p-3 font-mono text-xs">
                    Serveur Sécurisé
                </div>
            </div>

            {/* Filters */}
            <div className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-200 mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher un utilisateur, une action..." 
                        className="input input-bordered w-full pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled // Search Log implemented only by exact match in backend for now, disabling frontend search visual for simplicity
                    />
                </div>
                <select 
                    className="select select-bordered"
                    value={actionFilter}
                    onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                >
                    <option value="">Toutes les actions</option>
                    <option value="LOGIN">Connexions (LOGIN)</option>
                    <option value="CREATE_TENANT">Créations Locataire</option>
                    <option value="UPDATE_TENANT">Modifications Locataire</option>
                    <option value="ARCHIVE_TENANT">Suppressions Locataire</option>
                </select>
            </div>

            {/* Logs Table */}
            <div className="bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr className="bg-base-200/50">
                                <th>Horodatage</th>
                                <th>Action</th>
                                <th>Utilisateur</th>
                                <th>IP</th>
                                <th>Détails</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8">Chargement de l'historique...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 opacity-50">Aucun log trouvé.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-base-50 transition-colors">
                                        <td className="font-mono text-xs opacity-70">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="avatar placeholder">
                                                    <div className="w-6 h-6 rounded-full bg-neutral text-neutral-content text-[10px] flex items-center justify-center">
                                                        <span>{log.user_name ? log.user_name.charAt(0) : '?'}</span>
                                                    </div>
                                                </div>
                                                <span className="font-medium text-sm">{log.user_name || 'Système'}</span>
                                            </div>
                                        </td>
                                        <td className="font-mono text-xs opacity-60">{log.ip_address}</td>
                                        <td>
                                            <div className="tooltip tooltip-left" data-tip={JSON.stringify(log.details, null, 2)}>
                                                <Database size={16} className="text-primary cursor-help opacity-70 hover:opacity-100" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-base-200 flex justify-between items-center">
                    <button 
                        className="btn btn-sm btn-ghost" 
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                    >
                        <ChevronLeft size={16} /> Précédent
                    </button>
                    <span className="text-sm opacity-50">Page {page + 1}</span>
                    <button 
                        className="btn btn-sm btn-ghost"
                        disabled={logs.length < LIMIT}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Suivant <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogsPage;
