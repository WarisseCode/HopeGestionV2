// frontend/src/pages/AuditLogsPage.tsx
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
  AlertTriangle,
  Eye
} from 'lucide-react';
import { getToken } from '../api/authApi';
import { API_URL } from '../config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

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

            const response = await fetch(`${API_URL}/audit-logs?${queryParams.toString()}`, {
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
        if (action.includes('LOGIN')) return 'text-success bg-success/10 border-success/20';
        if (action.includes('DELETE') || action.includes('ARCHIVE')) return 'text-error bg-error/10 border-error/20';
        if (action.includes('CREATE')) return 'text-info bg-info/10 border-info/20';
        if (action.includes('UPDATE')) return 'text-warning bg-warning/10 border-warning/20';
        return 'text-gray-600 bg-gray-100 border-gray-200';
    };

     const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (userLoading) return <div className="flex justify-center items-center h-[50vh]"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

    return (
        <motion.div 
            className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                     <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Journal d'Audit & Sécurité <span className="text-primary">.</span>
                     </h1>
                     <p className="text-gray-500 font-medium mt-1">Surveillez l'activité critique et la sécurité de votre application.</p>
                </div>
                <div className="badge badge-primary badge-lg gap-2 shadow-lg shadow-primary/20">
                    <ShieldCheck size={14} /> Serveur Sécurisé
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div variants={itemVariants}>
                <Card className="bg-white border-none shadow-lg mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Rechercher un utilisateur, une IP..." 
                                className="input input-bordered w-full pl-11 bg-gray-50 border-gray-100 focus:bg-white focus:border-primary transition-all rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled // Search Log implemented only by exact match in backend for now
                            />
                        </div>
                        <select 
                            className="select select-bordered w-full md:w-64 bg-gray-50 border-gray-100 focus:bg-white focus:border-primary rounded-xl"
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                        >
                            <option value="">Toutes les actions</option>
                            <option value="LOGIN">Connexions (LOGIN)</option>
                            <option value="CREATE_TENANT">Créations Locataire</option>
                            <option value="UPDATE_TENANT">Modifications Locataire</option>
                            <option value="ARCHIVE_TENANT">Suppressions Locataire</option>
                        </select>
                         <Button variant="ghost" className="btn-square bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl">
                            <Filter size={20} />
                        </Button>
                    </div>
                </Card>
            </motion.div>

            {/* Logs Table */}
            <motion.div variants={itemVariants}>
                <Card className="border-none shadow-xl bg-white p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="py-4 pl-6 text-gray-500 font-semibold">Horodatage</th>
                                    <th className="text-gray-500 font-semibold">Action</th>
                                    <th className="text-gray-500 font-semibold">Utilisateur</th>
                                    <th className="text-gray-500 font-semibold">IP Source</th>
                                    <th className="pr-6 text-right text-gray-500 font-semibold">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12"><span className="loading loading-dots loading-md text-primary"></span></td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400 flex flex-col items-center gap-2">
                                            <Activity size={32} className="opacity-20"/>
                                            Aucun log trouvé pour cette période.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="pl-6 font-mono text-xs text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-gray-400" />
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="avatar placeholder">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shadow-sm">
                                                            <span>{log.user_name ? log.user_name.charAt(0) : '?'}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-medium text-sm text-gray-700">{log.user_name || 'Système'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                 <div className="badge badge-ghost badge-sm font-mono text-xs opacity-70 bg-gray-100 border-gray-200">
                                                    {log.ip_address}
                                                </div>
                                            </td>
                                            <td className="pr-6 text-right">
                                                <div className="tooltip tooltip-left" data-tip={JSON.stringify(log.details, null, 2)}>
                                                    <Button variant="ghost" size="sm" className="btn-square btn-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Eye size={16} className="text-gray-400 hover:text-primary transition-colors" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                        <Button 
                            variant="ghost"
                            size="sm"
                            disabled={page === 0}
                            onClick={() => setPage(p => p - 1)}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            <ChevronLeft size={16} className="mr-1" /> Précédent
                        </Button>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Page {page + 1}</span>
                        <Button 
                            variant="ghost"
                            size="sm"
                            disabled={logs.length < LIMIT}
                            onClick={() => setPage(p => p + 1)}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            Suivant <ChevronRight size={16} className="ml-1" />
                        </Button>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
};

export default AuditLogsPage;
